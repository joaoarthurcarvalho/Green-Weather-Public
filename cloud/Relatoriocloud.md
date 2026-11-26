# RELATÓRIO DE IMPLEMENTAÇÃO CLOUD – GREEN-WEATHER

## 1. Introdução

Este relatório apresenta a implementação da infraestrutura em nuvem do projeto Green-Weather, um sistema web voltado ao gerenciamento e monitoramento de informações relacionadas à temperatura e umidade.

A implementação da parte de Cloud teve como objetivo disponibilizar a aplicação na internet, utilizando serviços da Microsoft Azure e integração com o GitHub para facilitar o processo de publicação e atualização do sistema.

## 2. Tecnologias utilizadas

Foram utilizadas as seguintes tecnologias e ferramentas:

- **Microsoft Azure:** plataforma de computação em nuvem utilizada para hospedar a aplicação.
- **Azure App Service:** serviço responsável pela hospedagem do sistema web.
- **GitHub:** plataforma utilizada para armazenar e versionar o código-fonte.
- **GitHub Actions:** ferramenta utilizada para automatizar o processo de publicação.
- **HTML, CSS e JavaScript:** tecnologias utilizadas na construção da interface web.

## 3. Estrutura de hospedagem descrita no repositório

Este relatório registra a existência de um Resource Group chamado GreenWeather e
de um Azure App Service chamado Green-Weather. A configuração atual desses
recursos não é verificada pelo repositório.

O repositório contém um workflow do GitHub Actions para publicar os arquivos
estáticos da interface. A existência desse workflow não confirma, por si só, a
configuração atual do App Service nem a disponibilidade da API na URL pública.

A aplicação foi organizada em uma pasta chamada `public`, que contém os arquivos necessários para a publicação.

A URL registrada anteriormente neste relatório é:

https://green-weather.azurewebsites.net

## 4. Integração com GitHub

O workflow versionado integra o GitHub Actions com o Azure App Service para
publicar a interface estática.

Repositório: Green-Weather-Public

A integração permite utilizar o código armazenado no GitHub como origem para as publicações realizadas na Azure.

O workflow espera a credencial de publicação no GitHub Secret
`AZURE_WEBAPP_PUBLISH_PROFILE`. O repositório não permite verificar se esse
secret está configurado na conta.

## 5. Automação de publicação (CI/CD)

O workflow versionado em
`.github/workflows/development_green-weather.yml` é acionado na branch
`development` ou manualmente. Ele verifica alguns arquivos da interface e envia
somente `public/` usando `azure/webapps-deploy@v3`.

O workflow atual **não** publica `src/server.js`, `package.json` ou os dados em
`data/`. Assim, não deve ser descrito como publicação da API Node.js. Para que
as chamadas `/api/*` funcionem na hospedagem, é necessário implantar o servidor
e configurar sua persistência e variáveis de ambiente separadamente.

O processo versionado atualmente é:

1. O desenvolvedor realiza alterações no projeto.
2. As alterações são enviadas para o GitHub.
3. O GitHub Actions inicia o workflow.
4. Arquivos básicos de `public/` são validados.
5. Somente a pasta `public/` é enviada ao Azure App Service.

Para realizar a implantação, foi utilizada a ação `azure/webapps-deploy@v3`.

Essa configuração facilita a manutenção do sistema e reduz a necessidade de realizar publicações manualmente.

## 6. Segurança e configuração

Durante a implementação, foram adotadas medidas básicas de segurança relacionadas à infraestrutura:

- O workflow referencia `AZURE_WEBAPP_PUBLISH_PROFILE`; seu valor não está no
  repositório e sua configuração deve ser verificada no GitHub.
- HTTPS deve ser configurado no App Service/proxy; o workflow não verifica essa
  configuração.
- Separação das credenciais do código-fonte.
- Restrição da exposição de informações sensíveis no repositório.

O uso do perfil de publicação depende das configurações de publicação do Azure
App Service, que não podem ser verificadas a partir do código versionado.

## 7. Arquitetura da publicação versionada

A arquitetura implementada utiliza os seguintes componentes:

**GitHub:** armazenamento e versionamento do código-fonte.

**GitHub Actions:** automação da validação e publicação da aplicação.

**Azure App Service:** recebe os arquivos estáticos `public/` por meio do
workflow atual. O back-end Node.js não faz parte desse pacote.

**Usuário:** acesso ao sistema por meio de um navegador utilizando o endereço disponibilizado pela Azure.

O fluxo de publicação versionado é:

GitHub → GitHub Actions → Azure App Service (public/) → Navegador.

Na execução local, o navegador usa a API HTTP fornecida pelo mesmo servidor
Node.js que entrega os arquivos estáticos; consulte o diagrama no README
principal. Esse caminho local não comprova que a API esteja implantada na Azure.

## 8. Testes e validação

Os testes automatizados locais confirmam a inicialização do servidor, login,
propriedades, relatórios e regras de autorização. Antes da publicação devem ser
verificados separadamente os arquivos persistentes em `DATA_DIR`, a chave
`SENSOR_API_KEY`, a configuração de HTTPS e o cookie seguro.

Para serviços Azure, o endpoint `GET /health` pode ser usado em health checks,
pois responde sem exigir autenticação e não expõe dados da aplicação.

## 9. Conclusão

O repositório contém automação para publicar a interface estática no Azure App
Service. O workflow não publica o back-end Node.js nem seus dados; a implantação
da API, a persistência, a configuração HTTPS e a disponibilidade pública precisam
ser verificadas e tratadas separadamente.

O documento descreve a infraestrutura e a automação que constam no repositório,
mas não certifica o estado atual dos recursos Azure ou dos secrets do GitHub.