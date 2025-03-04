const playwright = require('playwright');

async function buscarNoGoogle(palavras) {
  const navegador = await playwright.chromium.launch({ headless: false });
  const pagina = await navegador.newPage();

  try {
    // Configurações iniciais
    await pagina.setViewportSize({ width: 1280, height: 720 });
    await pagina.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    });

    // Acessar o Google
    await pagina.goto('https://www.google.com/', { waitUntil: 'networkidle' });
    console.log("✅ Página carregada. Verificando se há consentimento de cookies...");

    // Aceitar cookies
    const botaoAceitar = pagina.locator('button:has-text("Aceitar tudo")');
    if (await botaoAceitar.isVisible()) {
      await botaoAceitar.click();
      console.log("🍪 Consentimento de cookies aceito.");
    }

    // Verificar captcha
    const captcha = pagina.locator('text=Verifique se você é um humano');
    if (await captcha.isVisible()) {
      console.log("⚠️ Captcha detectado. Resolva manualmente.");
      await pagina.pause(); // Pausa para resolver manualmente
    }

    // Aguardar o campo de pesquisa
    console.log("✅ Buscando o campo de pesquisa...");
    const campoPesquisa = pagina.locator('textarea[name="q"]');
    await campoPesquisa.waitFor({ state: 'visible', timeout: 60000 });

    // Preencher e pesquisar
    console.log("✅ Campo de pesquisa encontrado. Preenchendo...");
    await campoPesquisa.fill(palavras);
    await pagina.keyboard.press('Enter');
    console.log(`🔍 Pesquisando por: ${palavras}`);

    // Aguardar resultados
    await pagina.waitForSelector('h3', { timeout: 60000 });

    // Capturar links
    const links = await pagina.evaluate(() => {
      return Array.from(document.querySelectorAll('h3 a')).map(el => el.href);
    });

    console.log("🔗 Links encontrados:");
    console.log(links);

    return links;
  } catch (erro) {
    console.error("❌ Erro ao buscar no Google:", erro);
    await pagina.screenshot({ path: 'erro.png' }); // Screenshot em caso de erro
    return [];
  } finally {
    await navegador.close();
  }
}

function verificarLinks(links, palavras) {
  if (links.length === 0) {
    console.log("⚠️ Nenhum link foi encontrado.");
    return;
  }

  const palavrasFormatadas = palavras.split(' ').join('.');
  const regex = new RegExp(palavrasFormatadas, 'i');

  for (let link of links) {
    if (regex.test(link)) {
      console.log(`✅ Encontrado domínio com as palavras '${palavras}': ${link}`);
      return link;
    }
  }
  console.log(`❌ Nenhum site encontrado com as palavras '${palavras}'.`);
  return null;
}

async function executar(palavras) {
  console.log(`🔍 Buscando por: ${palavras}`);
  const linksEncontrados = await buscarNoGoogle(palavras);
  const linkEncontrado = verificarLinks(linksEncontrados, palavras);
  return linkEncontrado;
}

// Executar o script
const palavras = process.argv[2] || 'Centauro';
executar(palavras).then(link => {
  if (link) {
    console.log(`🎉 Link encontrado: ${link}`);
  } else {
    console.log("😞 Nenhum link correspondente foi encontrado.");
  }
});