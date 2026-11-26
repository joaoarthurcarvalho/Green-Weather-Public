Green-Weather

Sobre o projeto

O Green-Weather é um sistema web desenvolvido para gerenciamento e visualização de informações relacionadas ao monitoramento de temperatura e umidade.

Tecnologias utilizadas

HTML

CSS

JavaScript

Microsoft Azure

Azure App Service

GitHub

GitHub Actions

# Infraestrutura em nuvem

O repositório contém o workflow
`.github/workflows/development_green-weather.yml`, acionado por atualizações na
branch `development` ou manualmente. Ele verifica alguns arquivos da interface
e envia somente a pasta `public/` para o Azure App Service.

## Limite da publicação atual

O workflow não inclui `src/server.js`, `package.json` nem os dados em `data/`.
Portanto, ele não publica o back-end Node.js nem disponibiliza as rotas
`/api/*`. O front-end publicado precisa de um back-end configurado
separadamente para funcionar com dados reais. O workflow também não valida a
configuração de runtime, persistência ou HTTPS do App Service.

## Processo versionado

1. O código fica armazenado no GitHub.
2. O GitHub Actions valida a presença de arquivos básicos em `public/`.
3. A ação `azure/webapps-deploy@v3` publica o conteúdo de `public/`.
4. A API e o armazenamento precisam ser implantados/configurados à parte; isso
   não é feito pelo workflow deste repositório.

## Segurança e configuração

- O perfil de publicação é lido do GitHub Secret
  `AZURE_WEBAPP_PUBLISH_PROFILE`.
- Não armazene senhas ou tokens no repositório.
- Configure HTTPS no serviço e, se o back-end for implantado, configure as
  variáveis de ambiente e o armazenamento persistente fora do código.

## Hospedagem documentada

- Plataforma: Microsoft Azure App Service
- Aplicação: Green-Weather
- URL informada: <https://green-weather.azurewebsites.net>

A URL e a configuração atual do serviço não são verificadas por este documento.
A pasta `public/` contém HTML, CSS, JavaScript e imagens da interface. A API
Node.js está em `src/server.js`; sua implantação não está coberta pelo workflow
atual.

Para a arquitetura local e o fluxo entre front-end, API e back-end, consulte o
README principal do projeto.