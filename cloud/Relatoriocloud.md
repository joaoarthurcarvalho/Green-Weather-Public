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

## 3. Implementação da infraestrutura na Azure

Inicialmente, foi criado um Resource Group na Microsoft Azure, denominado GreenWeather, para organizar os recursos utilizados no projeto.

Em seguida, foi criado um recurso Azure App Service com o nome Green-Weather, responsável por disponibilizar a aplicação web na internet.

O App Service foi configurado para hospedar os arquivos estáticos do sistema, incluindo páginas HTML, folhas de estilo CSS, arquivos JavaScript e recursos visuais.

A aplicação foi organizada em uma pasta chamada `public`, que contém os arquivos necessários para a publicação.

A URL disponibilizada pelo serviço é:

https://green-weather.azurewebsites.net

## 4. Integração com GitHub

Para facilitar a atualização da aplicação, foi realizada a integração entre o Azure App Service e o repositório GitHub do projeto.

Repositório: Green-Weather-Public

A integração permite utilizar o código armazenado no GitHub como origem para as publicações realizadas na Azure.

Também foi configurada uma credencial de publicação, armazenada nos Secrets do GitHub, evitando que informações sensíveis fossem inseridas diretamente no código-fonte.

## 5. Automação de publicação (CI/CD)

Na versão atual do repositório não está incluído um workflow em
`.github/workflows/`. Portanto, o processo de CI/CD descrito nesta etapa é uma
configuração planejada ou aplicada diretamente no ambiente Azure, não um arquivo
versionado que possa ser executado pelo projeto neste estado.

Quando o workflow estiver configurado para a branch `development`, o processo
esperado é:

O processo de publicação funciona da seguinte maneira:

1. O desenvolvedor realiza alterações no projeto.
2. As alterações são enviadas para o GitHub.
3. O GitHub Actions inicia automaticamente o workflow.
4. Os arquivos principais da aplicação são validados.
5. A pasta `public` é enviada para o Azure App Service.
6. A aplicação recebe a atualização publicada.

Para realizar a implantação, foi utilizada a ação `azure/webapps-deploy@v3`.

Essa configuração facilita a manutenção do sistema e reduz a necessidade de realizar publicações manualmente.

## 6. Segurança

Durante a implementação, foram adotadas medidas básicas de segurança relacionadas à infraestrutura:

- Armazenamento das credenciais de publicação nos GitHub Secrets.
- Utilização de HTTPS para acesso à aplicação.
- Separação das credenciais do código-fonte.
- Restrição da exposição de informações sensíveis no repositório.

Também foi necessário habilitar a opção SCM Basic Auth Publishing Credentials no Azure App Service para permitir o download do perfil de publicação utilizado na integração.

## 7. Arquitetura da solução

A arquitetura implementada utiliza os seguintes componentes:

**GitHub:** armazenamento e versionamento do código-fonte.

**GitHub Actions:** automação da validação e publicação da aplicação.

**Azure App Service:** hospedagem dos arquivos da aplicação web.

**Usuário:** acesso ao sistema por meio de um navegador utilizando o endereço disponibilizado pela Azure.

O fluxo de funcionamento é:

GitHub → GitHub Actions → Azure App Service → Usuário.

## 8. Testes e validação

Os testes automatizados locais confirmam a inicialização do servidor, login,
propriedades, relatórios e regras de autorização. Antes da publicação devem ser
verificados separadamente os arquivos persistentes em `DATA_DIR`, a chave
`SENSOR_API_KEY`, a configuração de HTTPS e o cookie seguro.

Para serviços Azure, o endpoint `GET /health` pode ser usado em health checks,
pois responde sem exigir autenticação e não expõe dados da aplicação.

## 9. Conclusão

A implementação da infraestrutura Cloud do Green-Weather permitiu disponibilizar a aplicação web utilizando os serviços da Microsoft Azure.

A integração com o GitHub Actions também possibilitou automatizar o processo de publicação, facilitando futuras atualizações do sistema.

Apesar das pendências identificadas durante os testes de acesso e autenticação, a estrutura de hospedagem e o processo de implantação foram configurados.

Dessa forma, foi possível aplicar conceitos de computação em nuvem, hospedagem de aplicações, gerenciamento de recursos e integração contínua e entrega contínua (CI/CD) utilizando ferramentas da Microsoft Azure e GitHub.