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

  // Lê os dados da planilha
  const csvFile = fs.readFileSync(inputFilePath, 'utf8');
  const parsedData = Papa.parse(csvFile, {
    header: true,
    skipEmptyLines: true
  });


  ///Processa todas as empresas, se ja estiver salvo ele pula//////////
  const progressoSalvo = loadProgress();

  for (const empresa of parsedData.data) {
    if (progressoSalvo.has(empresa.main_domain)) {
      console.log(`⚠️ Pulando ${empresa.main_domain}, já processado.`);
      continue;
    }
  ///Processa todas as empresas, se ja estiver salvo ele pula//////////

    const searchQuery1 = empresa.nome;
    console.log(`Buscando por: ${searchQuery1}`);
    await page.goto(`https://www.google.com/search?q=${encodeURIComponent(searchQuery1)}`);

    const searchQuery = empresa.main_domain;
    console.log(`Buscando por: ${searchQuery}`);
    await page.goto(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`);

    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a'))
        .map(el => el.href)
        .filter(link => link.startsWith('http') && !link.includes('google.com'))
        .slice(0, 5);
    });

    console.log("Links encontrados: ", links);
    expect(links.length).toBeGreaterThan(0);

    function validarLinks(links, dominio) {
      const urlEsperadaComWWW = `https://www.${dominio.toLowerCase()}`;
      const urlEsperadaSemWWW = `https://${dominio.toLowerCase()}`;
      console.log(`Verificando URLs: '${urlEsperadaComWWW}' ou '${urlEsperadaSemWWW}'`);

      for (let link of links) {
        try {
          const urlBase = new URL(link).origin;
          console.log(`🌐 URL base encontrada: ${urlBase}`);

          if (urlBase.toLowerCase() === urlEsperadaComWWW || urlBase.toLowerCase() === urlEsperadaSemWWW) {
            console.log(`✅ Encontrei o site correspondente: ${searchQuery}`);
            return 'OK';
          }
        } catch (erro) {
          console.error("⚠️ Erro ao processar URL:", erro);
        }
      }

      console.log(`❌ Nenhum site encontrado para '${searchQuery1}'`);
      return 'ERRO';
    }

    const resultadoValidacao = validarLinks(links, empresa.main_domain);
    
    fs.appendFileSync(outputFilePath, `${empresa.nome},${empresa.main_domain},${resultadoValidacao}\n`, 'utf8');

    await page.waitForTimeout(6000);
    await page.mouse.wheel(0, 1000);
    await page.waitForTimeout(1000);
  }

  await browser.close();
});
