const playwright = require('playwright');
const fs = require('fs'); // Importa o módulo fs para trabalhar com arquivos

// Função para buscar no Google e retornar os links encontrados
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
      return Array.from(document.querySelectorAll('h3 a'))
        .slice(0, 5)
        .map(el => el.href)
        .filter(link => link !== undefined);
    });

    console.log("🔗 Links encontrados:");
    console.log(links);

    return links;
  } catch (erro) {
    console.error("❌ Erro ao buscar no Google:", erro);
    return [];
  } finally {
    await pagina.close();
  }
}

// Função para validar e retornar a URL base
function validarLinks(links, palavras) {
    const palavraFormatada = palavras.toLowerCase().trim();
    const baseEsperada = `https://www.${palavraFormatada.replace(/\s+/g, '').toLowerCase()}`;
  
    console.log(`🔍 Verificando se a URL '${baseEsperada}' existe nos links...`);
  
    for (let link of links) {
      const urlBase = new URL(link).origin;
      console.log(`🌐 URL base encontrada: ${urlBase}`);
  
      if (urlBase.startsWith(baseEsperada)) {  // Permite qualquer sufixo (.com, .com.br)
        console.log(`✅ Encontrei o site correspondente à pesquisa '${palavras}': ${urlBase}`);
        return urlBase;
      }
    }
  
    console.log(`❌ Nenhum site encontrado com o nome '${palavras}' nos links.`);
    return null;
  }
  
// Função para salvar as URLs válidas no arquivo CSV
function salvarUrlsNoCsv(urlsValidas) {
  const caminhoArquivo = 'crawler-test.csv'; // Nome do arquivo CSV

  // Verifica se o arquivo já existe
  const existeArquivo = fs.existsSync(caminhoArquivo);

  // Se o arquivo não existe, escreve o cabeçalho no CSV
  if (!existeArquivo) {
    fs.writeFileSync(caminhoArquivo, 'URL\n', 'utf8');
  }

  // Escreve as URLs válidas no arquivo CSV
  urlsValidas.forEach(url => {
    fs.appendFileSync(caminhoArquivo, `${url}\n`, 'utf8');
  });

  console.log(`✅ URLs válidas foram salvas no arquivo: ${caminhoArquivo}`);
}

// Função principal para realizar as pesquisas e validar os links
async function realizarPesquisas(palavras1, palavras2) {
    const navegador = await playwright.chromium.launch({
      headless: false,
      slowMo: 100,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-gpu',
        '--disable-dev-shm-usage'
      ]
    });
  
    const contexto = await navegador.newContext(); // Criando contexto corretamente
  
    // Realiza a primeira pesquisa
    console.log(`🔍 Realizando a primeira pesquisa: ${palavras1}`);
    const links1 = await buscarNoGoogle(palavras1, contexto);
    const link1Valido = validarLinks(links1, palavras1);
  
    // Agora, usa o mesmo contexto para a segunda pesquisa
    console.log(`🔍 Realizando a segunda pesquisa: ${palavras2}`);
    const links2 = await buscarNoGoogle(palavras2, contexto); // 🟢 Corrigido aqui!
    const link2Valido = validarLinks(links2, palavras2);
  
    await navegador.close();
  
    // Salva as URLs válidas no CSV
    const urlsValidas = [];
    if (link1Valido) urlsValidas.push(link1Valido);
    if (link2Valido) urlsValidas.push(link2Valido);
  
    if (urlsValidas.length > 0) {
      salvarUrlsNoCsv(urlsValidas);
    } else {
      console.log("😞 Nenhum link válido encontrado.");
    }
  
    return { link1Valido, link2Valido };
  }
  


// Palavras a serem pesquisadas (podem ser passadas via argumentos de linha de comando)
const palavras1 = process.argv[2] || 'Centauro';
const palavras2 = process.argv[3] || 'Youtube';

realizarPesquisas(palavras1, palavras2).then(result => {
  if (result.link1Valido) {
    console.log("🎉 Resultado da primeira pesquisa:", result.link1Valido);
  } else {
    console.log("😞 Nenhum link válido encontrado na primeira pesquisa.");
  }

  if (result.link2Valido) {
    console.log("🎉 Resultado da segunda pesquisa:", result.link2Valido);
  } else {
    console.log("😞 Nenhum link válido encontrado na segunda pesquisa.");
  }
});
