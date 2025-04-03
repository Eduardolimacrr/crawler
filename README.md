# Crawler de Validação de URLs com Playwright

## Descrição
Este projeto utiliza o **Playwright** para buscar informações no Google e validar URLs de empresas presentes em um arquivo CSV. O script acessa o Google, extrai os links das buscas e verifica se os domínios correspondem aos registrados no arquivo.

## Funcionalidades
- Busca automática no Google por nomes de empresas
- Extração e validação de links
- Registro do progresso para evitar processamento duplicado
- Salvamento dos resultados em um arquivo CSV

## Tecnologias Utilizadas
- [Playwright](https://playwright.dev/)
- [Papaparse](https://www.papaparse.com/) (para manipulação de CSV)
- Node.js

## Requisitos
- Node.js instalado
- Dependências instaladas (veja abaixo)

## Instalação
1. Clone o repositório:
   ```sh
   git clone https://github.com/seu-usuario/seu-repositorio.git
   cd seu-repositorio
   ```
2. Instale as dependências:
   ```sh
   npm install
   ```
3. Instale o Playwright:
   ```sh
   npx playwright install
   ```

## Uso
1. Coloque os dados das empresas no arquivo que desejar no seguinte formato:
   ```csv
   id,nome,main_domain
   1,Empresa X,empresa.com.br
   2,Empresa Y,empresay.com
   ```
2. Execute o script:
   ```sh
   npx playwright test
   ```
3. Os resultados serão salvos em `urls-validas.csv` no seguinte formato:
   ```csv
   "id","nome","main_domain","resultado","url_encontrada"
   1,"Empresa X",empresa.com.br,OK,https://empresa.com.br
   ```
## Aprendizado

Este projeto foi uma experiência de grande aprendizado, permitindo aprofundar conhecimentos em automação de navegadores, manipulação de arquivos CSV e uso de Playwright para raspagem de dados.


