import { test, expect, chromium } from '@playwright/test';
import { Activity } from '@temporalio/activity'; 
import Papa from 'papaparse';
import fs from 'fs';

const inputFilePath = 'crawler-test.csv';
const outputFilePath = 'urls-validas.csv';

const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36'
];

// Carrega progresso salvo /////////////
function loadProgress() {
  if (fs.existsSync(outputFilePath)) {
    const fileContent = fs.readFileSync(outputFilePath, 'utf8');
    const lines = fileContent.split('\n').filter(Boolean); // Filtra linhas vazias
    return new Set(lines.map(line => line.split(',')[0]?.replace(/"/g, '').trim())); // Alterado para ID
  }
  return new Set();
}
// Carrega progresso salvo /////////////

// Salva progresso /////////////
function saveProgress(empresa, resultadoValidacao, urlEncontrada = '') {
  try {
    fs.appendFileSync(outputFilePath, `"${empresa.id}","${empresa.nome}",${empresa.main_domain},${resultadoValidacao},${urlEncontrada}\n`, 'utf8'); // Alterado para ID, adicionado nome
  } catch (error) {
    console.error("⚠️ Erro ao salvar o resultado:", error);
  }
}
// Salva progresso /////////////


test.setTimeout(0);

test('Search on Google', async () => {
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-gpu', 
      '--disable-dev-shm-usage',     
      '--single-process' // Adiciona esta opção para rodar em um único processo

    ]
  });

  const context = await browser.newContext({
    userAgent: userAgents[Math.floor(Math.random() * userAgents.length)]
  });

  const page = await context.newPage();

  // Lê os dados da planilha /////////////
  const csvFile = fs.readFileSync(inputFilePath, 'utf8');
  const parsedData = Papa.parse(csvFile, {
    header: true,
    skipEmptyLines: true
  });
  // Lê os dados da planilha /////////////

  // Carrega progresso salvo
  const progressoSalvo = loadProgress();

  for (const empresa of parsedData.data) {
    if (progressoSalvo.has(empresa.id)) { // Alterado para ID
      console.log(`⚠️ Pulando ${empresa.id}, já processado.`);
      continue;
    }

    // Declara searchQuery1 (nome da empresa) e searchQuery2 (domínio)
    const searchQuery1 = empresa.nome;
    const searchQuery2 = empresa.main_domain;
    // Declara searchQuery1 (nome da empresa) e searchQuery2 (domínio)

    // Extrai links da página do Google /////////
    async function extrairLinks() {
      return await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
          .map(el => el.href)
          .filter(link => link.startsWith('http') && !link.includes('google.com'))
          .slice(0, 20);
      });
    }
    // Extrai links da página do Google /////////

    // Busca pelo nome da empresa
    console.log(`🔍 Buscando por: ${searchQuery1}`);
    await page.goto(`https://www.google.com/search?q=${encodeURIComponent(searchQuery1)}`);

    const links = await extrairLinks();
    console.log("🔗 Links encontrados: ", links);
    expect(links.length).toBeGreaterThan(0);
    // Busca pelo nome da empresa

    // Valida links encontrados /////////////
    function validarLinks(links, dominio) {
      const urlVariacoes = [
        `https://www.${dominio.toLowerCase()}`,
        `https://${dominio.toLowerCase()}`,
        `http://www.${dominio.toLowerCase()}`,
        `http://${dominio.toLowerCase()}`
      ];

      console.log(`✅ Domínio esperado: ${dominio}`);
      console.log(`🔍 URLs esperadas para comparação:`, urlVariacoes);
      for (let link of links) {
        try {
          const urlBase = new URL(link).origin;
          console.log(`🌍 URL capturada: ${urlBase}`);

          if (urlVariacoes.includes(urlBase.toLowerCase())) {
            console.log(`✅ Site encontrado: ${urlBase}`);
            return { resultado: 'OK', urlEncontrada: urlBase };  // Retorna o resultado e a URL
          }
        } catch (erro) {
          console.error("⚠️ Erro ao processar URL:", erro);
        }
      }
      console.log(`❌ Nenhuma correspondência encontrada para '${dominio}'`);
      return { resultado: 'ERRO', urlEncontrada: '' };  // Retorna o resultado e uma URL vazia
    }
    // Valida links encontrados /////////////

    // Pesquisa diretamente a url caso não encontre dentro dos 20 sites
    let validacaoResultado = validarLinks(links, empresa.main_domain);
    let resultadoValidacao = validacaoResultado.resultado;
    let urlEncontrada = validacaoResultado.urlEncontrada;

    if (resultadoValidacao === 'ERRO') {
      console.log(`🔄 Nenhuma correspondência encontrada, buscando diretamente: ${empresa.main_domain}`);
      try {
        await page.goto(`https://${encodeURIComponent(empresa.main_domain)}`);
        await page.waitForTimeout(3000);
        const novosLinks = await extrairLinks();
        console.log("🔗 Links encontrados na segunda busca:", novosLinks);

        // Valida novamente os links encontrados
        validacaoResultado = validarLinks(novosLinks, empresa.main_domain);
        resultadoValidacao = validacaoResultado.resultado;
        urlEncontrada = validacaoResultado.urlEncontrada;


      } catch (error) {
        console.error("⚠️ Erro ao buscar diretamente pelo domínio:", error);
      }
    }

    // Salva o resultado
    saveProgress(empresa, resultadoValidacao, urlEncontrada);
    // Salva o resultado

    await page.waitForTimeout(3000);
    await page.mouse.move(100, 200);
    await page.mouse.move(300, 400);
    await page.waitForTimeout(2000);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(2000);
  }

  await browser.close();
});