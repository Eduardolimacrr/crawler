const fs = require('fs');
const readline = require('readline');
const playwright = require('playwright');

const inputFilePath = 'crawler-test.csv';
const outputFilePath = 'urls-validas.csv';

async function buscarNoGoogle(palavras, navegador) {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36'
  ];

  const userAgentSelecionado = userAgents[Math.floor(Math.random() * userAgents.length)];
  const pagina = await navegador.newPage();

  try {
    await pagina.setViewportSize({ width: 1280, height: 720 });
    await pagina.setExtraHTTPHeaders({
      'User-Agent': userAgentSelecionado,
      'Accept-Language': 'en-US,en;q=0.9',
    });

    console.log(`✅ Acessando o Google para pesquisar por: ${palavras}`);
    await pagina.goto(`https://www.google.com/search?q=${encodeURIComponent(palavras)}`, { waitUntil: 'domcontentloaded' });
    await pagina.waitForTimeout(Math.random() * 3000 + 1000);

    console.log("📄 Aguardando resultados...");
    const links = await pagina.evaluate(() => {
      return Array.from(document.querySelectorAll('a'))
        .map(el => el.href)
        .filter(link => {
          return (link.startsWith('http://') || link.startsWith('https://')) && !link.includes('google.com');
        })
        .slice(0, 5);
    });

    console.log("🔗 Links encontrados:", links);
    return links;
  } catch (erro) {
    console.error("❌ Erro ao buscar no Google:", erro);
    return [];
  } finally {
    await pagina.close();
  }
}

function validarLinks(links, dominio) {
  const urlEsperadaComWWW = `https://www.${dominio.toLowerCase()}`;
  const urlEsperadaSemWWW = `https://${dominio.toLowerCase()}`;

  console.log(`🔍 Verificando se as URLs '${urlEsperadaComWWW}' ou '${urlEsperadaSemWWW}' existem nos links...`);

  for (let i = 0; i < links.length; i++) {
    const link = links[i];

    try {
      const urlBase = new URL(link).origin;
      console.log(`🌐 URL base encontrada: ${urlBase}`);

      if (urlBase.toLowerCase() === urlEsperadaComWWW || urlBase.toLowerCase() === urlEsperadaSemWWW) {
        console.log(`✅ Encontrei o site correspondente: ${urlBase}`);
        return urlBase;
      }
    } catch (erro) {
      console.error("⚠️ Erro ao processar URL:", erro);
    }
  }

  console.log(`❌ Nenhum site encontrado com o domínio '${dominio}' nos links.`);
  return null;
}

async function processarArquivo() {
  const linhas = fs.readFileSync(inputFilePath, 'utf8').split('\n'); // Lê todas as linhas do CSV

  const navegador = await playwright.chromium.launch({
    headless: false,
    slowMo: 100,
    args: ['--disable-blink-features=AutomationControlled', '--disable-gpu', '--disable-dev-shm-usage']
  });

  const contexto = await navegador.newContext();

  for (let i = 0; i < linhas.length; i++) { // Percorre todas as linhas
    const linha = linhas[i].trim();
    if (linha === '') continue; // Ignora linhas vazias

    const colunas = linha.split(',');
    if (colunas.length < 5) {
      console.log(`❌ Dados inválidos na linha ${i + 1}: ${linha}`);
      continue;
    }

    const nome = colunas[2]; // Ajuste para a posição correta do nome
    const main_domain = colunas[4]; // Ajuste para a posição correta do domínio

    console.log(`🔍 Buscando informações para: ${nome}`);

    const resultadoNome = await buscarNoGoogle(nome, contexto);
    let linkNomeValido = validarLinks(resultadoNome, main_domain);

    if (!linkNomeValido) {
      console.log(`🔍 Nome não encontrado, buscando pelo domínio: ${main_domain}`);
      const resultadoDominio = await buscarNoGoogle(main_domain, contexto);
      linkNomeValido = validarLinks(resultadoDominio, main_domain);
    }

    if (linkNomeValido) {
      fs.appendFileSync(outputFilePath, `${linha},${linkNomeValido}\n`, 'utf8');
    } else {
      console.log(`❌ Nenhuma URL válida encontrada para: ${nome}`);
    }
  }

  await navegador.close();
  console.log('✅ Processamento concluído!');
}

processarArquivo();
