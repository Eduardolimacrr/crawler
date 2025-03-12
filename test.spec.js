import { test, expect, chromium } from '@playwright/test';
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
    return new Set(fileContent.split('\n').map(line => line.split(',')[1]?.trim()).filter(Boolean));
  }
  return new Set();
}
// Carrega progresso salvo /////////////

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

  // Processa todas as empresas, se já estiver salvo ele pula /////////////
  const progressoSalvo = loadProgress();

  for (const empresa of parsedData.data) {
    if (progressoSalvo.has(empresa.main_domain)) {
      console.log(`⚠️ Pulando ${empresa.main_domain}, já processado.`);
      continue;
    }
  // Processa todas as empresas, se já estiver salvo ele pula /////////////

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
            return 'OK';
          }
        } catch (erro) {
          console.error("⚠️ Erro ao processar URL:", erro);
        }
      }
      console.log(`❌ Nenhuma correspondência encontrada para '${dominio}'`);
      return 'ERRO';
    }
    // Valida links encontrados /////////////

    // Pesquisa diretamente a url caso não encontre dentro dos 20 sites /////////////
    let resultadoValidacao = validarLinks(links, empresa.main_domain); ///com http

    if (resultadoValidacao === 'ERRO') {
      console.log(`🔄 Nenhuma correspondência encontrada, buscando diretamente: ${empresa.main_domain}`);
      await page.goto(`https://www.google.com/search?q=${encodeURIComponent(empresa.main_domain)}`);

      await page.waitForTimeout(3000);
      const novosLinks = await extrairLinks();
      console.log("🔗 Links encontrados na segunda busca:", novosLinks);

      // Valida novamente os links encontrados
      resultadoValidacao = validarLinks(novosLinks, empresa.main_domain);
      // Valida novamente os links encontrados
    }
    // Pesquisa diretamente a url caso não encontre dentro dos 20 sites /////////////

    // Salva o resultado /////////////
    fs.appendFileSync(outputFilePath, `${empresa.nome},${empresa.main_domain},${resultadoValidacao}\n`, 'utf8');
    // Salva o resultado /////////////

    await page.waitForTimeout(3000);
    await page.mouse.move(100, 200);
    await page.mouse.move(300, 400);
    await page.waitForTimeout(2000);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(2000);
  }

  await browser.close();
});
