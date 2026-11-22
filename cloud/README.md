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

Infraestrutura em nuvem

O projeto está preparado para implantação em um Microsoft Azure App Service.
No repositório atual não há arquivos de workflow publicados em `.github/workflows/`;
qualquer implantação precisa ser configurada ou documentada no ambiente Azure.

A publicação é realizada por meio de integração com o GitHub Actions, permitindo automatizar o processo de implantação sempre que alterações são enviadas para a branch development.

Processo de publicação

Com um workflow ou implantação configurados:

1. O código fica armazenado no GitHub.
2. O processo de CI/CD valida e publica a aplicação.
3. A API Node.js e a pasta public são disponibilizadas no App Service.
4. O App Service e o proxy configuram o acesso público por HTTPS.

Segurança

Credenciais de publicação armazenadas no GitHub Secrets.

Não armazenamento de senhas e tokens diretamente no repositório.

Acesso à aplicação por HTTPS.

Hospedagem

Plataforma: Microsoft Azure App Service

Aplicação: Green-Weather

URL: https://green-weather.azurewebsites.net

Estrutura de publicação

A pasta public contém os arquivos HTML, CSS, JavaScript e demais recursos necessários para a apresentação da interface web.