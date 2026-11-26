# Green Weather

Sistema web para monitoramento de temperatura e umidade, com cadastro de usuários, sensores, histórico e alarmes.

## Arquitetura do projeto

```text
GreenWeather/
├── .github/
│   └── workflows/             # publicação da interface estática
├── src/
│   ├── server.js              # servidor HTTP, API, autenticação e arquivos estáticos
│   └── domain/                # regras de alarmes, previsão e resumo inteligente
├── public/                    # interface web: html/, css/, js/ e assets/
├── scripts/                   # ferramentas de simulação e demonstração
├── tests/                     # testes automatizados
├── segurança/                 # documentação e testes de segurança
├── cloud/                     # documentação de infraestrutura em nuvem
├── relatorios/                # relatórios técnicos e de mudanças
├── data/                      # dados locais, ignorados pelo Git
├── ESTIMATIVA-TENDENCIA.md    # critérios e estados da estimativa local
├── package.json               # comandos e versão mínima do Node.js
└── README.md
```

As regras de negócio reutilizáveis ficam em `src/domain/`; o servidor está em
`src/server.js`. Os testes são executados com `npm test`.

As páginas são servidas em `/html/<pagina>.html`; CSS, JavaScript e imagens ficam
nas pastas `/css/`, `/js/` e `/assets/`. Para compatibilidade, `/` abre o login,
e os atalhos `/<pagina>.html` redirecionam para as páginas correspondentes em
`/html/` (inclusive funcionários e propriedades). O atalho legado
`/cadastro.html` continua direcionando ao login.

## Comunicação entre os componentes

O front-end e a API usam a mesma origem. A API HTTP faz parte do servidor
Node.js; não é um serviço separado.

```text
Sensores ── POST /api/leituras (x-api-key) ──┐
                                             v
Navegador (front-end em public/) <── HTTP/JSON ──> API (/api/*)
                                                   │
                                                   v
                                   Servidor Node.js (src/server.js)
                                      │ regras: src/domain/
                                      v
                                  Arquivos em data/
```

O servidor também entrega os arquivos estáticos do front-end. As chamadas de
leitura e gestão passam pelas rotas `/api/*`; o servidor valida a sessão e o
escopo de acesso antes de consultar ou persistir dados.

## O que já existe

- Aplicação web servida diretamente pelo Node.js, sem dependências externas.
- Login com senha e senha diária adicional para funcionários e engenheiros; senhas armazenadas com `scrypt`, sessões por cookie e funções de conta. O superadministrador acessa a senha diária na aba correspondente da tela Funcionários e não precisa dela para entrar. O código muda à meia-noite do fuso configurado em `FUSO`, pode ser rotacionado manualmente pelo superadministrador e é derivado de um segredo privado persistido em `data/config.json`.
- Cadastro, ativação, desativação e exclusão de contas de funcionários e engenheiros pelo superadministrador, com matrícula automática. Contas de superadmin não podem ser alteradas ou excluídas pela tela de funcionários; desativar uma conta encerra suas sessões e bloqueia novos logins.
- Cadastro e configuração de propriedades rurais por engenheiros agrônomos; o superadmin pode consultar e editar todas, atribuir sensores e designar propriedades a funcionários e engenheiros. Esses usuários podem configurar somente as propriedades atribuídas à própria conta; funcionários não podem cadastrar novas propriedades.
- Funcionários e engenheiros acessam dados, histórico e alarmes apenas dos sensores vinculados às propriedades atribuídas à própria conta. O superadmin mantém acesso e gestão globais. O sistema atualmente recebe leituras dos sensores, mas não possui uma API de comandos físicos para dispositivos.
- Limites climáticos configuráveis por propriedade: engenheiros alteram somente as propriedades atribuídas, e o superadmin também controla o padrão do sistema. Alarmes, previsões, painel e relatórios aplicam os limites correspondentes a cada propriedade.
- Engenheiros agrônomos e superadministradores podem gerar relatórios técnicos, salvá-los na conta, reabri-los e imprimir ou salvar em PDF pelo navegador.
- Recepção de leituras de sensores com chave de API, validação básica e deduplicação.
- Resumo de sensores e consulta de histórico agrupado por intervalo.
- Alarmes ambientais e de sensor offline, com consulta por período e categoria.
- Resumo inteligente local de alarmes, leituras recentes e tendências ambientais.
- Estimativa local de tendências de temperatura e umidade, exibindo possíveis saídas da faixa ideal em até 3 horas quando há leituras recentes suficientes.
- Interface em português com painel, histórico, configurações de conta e preferências visuais.
- Simuladores para envio contínuo, geração de histórico e criação de dados demonstrativos.

## Requisitos

- Node.js 18 ou superior.
- Um navegador moderno.
- Sensores capazes de enviar JSON para a API (ou o simulador incluído).

## Estimativa de condições ambientais

O painel analisa as leituras das últimas 6 horas por sensor usando uma tendência
linear simples. Uma estimativa só é exibida com pelo menos 5 leituras ao longo de
1 hora e uma leitura recente (até 15 minutos); o horizonte é de até 3 horas.
É uma indicação estatística, não uma previsão meteorológica nem uma garantia, e
não envia dados para provedores externos de IA.
Consulte [Como funciona a estimativa de tendência](ESTIMATIVA-TENDENCIA.md) para
uma explicação detalhada do cálculo e dos estados possíveis.
Quando não houver histórico, leituras recentes ou dados suficientes, o painel
informa a causa em vez de mostrar uma lista vazia. Se as leituras pararem por
mais de 15 minutos, não é gerada uma previsão com dados desatualizados.
Para experimentar o card sem sensores ativos, execute `npm run demonstrar:previsao`
com o servidor ligado. O comando grava cinco leituras simuladas no histórico
usando o sensor `demo-previsao`; elas são identificadas no card e excluídas do
resumo inteligente. Como a previsão exige dados recentes, rode o comando
novamente para renovar a demonstração depois de 15 minutos.

## Resumo inteligente

O painel também apresenta um resumo local das leituras, tendências ambientais,
alarmes ativos e sensores sem comunicação nas últimas 24 horas. A análise usa
regras e estatísticas simples, sem enviar dados a serviços externos de IA. As
leituras do sensor `demo-previsao` são ignoradas neste resumo.

## Executar localmente

```powershell
npm start
```

Abra `http://localhost:3000`. O primeiro superadministrador é criado por variáveis de ambiente:

```powershell
$env:SUPERADMIN_NAME = "Nome do administrador"
$env:SUPERADMIN_EMAIL = "admin@exemplo.com"
$env:SUPERADMIN_PASSWORD = "defina-uma-senha-segura"
npm start
```

Configure essas variáveis na máquina/serviço de hospedagem, nunca dentro dos arquivos do projeto. Se já existir um superadmin, a inicialização não cria outro. Para um banco de dados de usuários existente sem superadmin, configure as três variáveis para provisionar o administrador inicial.

Para desenvolvimento com reinício automático:

```powershell
npm run dev
```

Com o servidor ativo, use outro terminal para simular leituras:

```powershell
npm run simular
npm run historico
node scripts/simulador.js falha
```

`node scripts/exemplo.js` grava dados de demonstração nos arquivos locais de leituras e alarmes. Faça uma cópia dos dados antes de executá-lo em uma instalação em uso.

## Configuração

O servidor aceita as variáveis de ambiente `PORT`, `FUSO`, `SENSOR_API_KEY`, `HTTPS`, `ALARME_OFFLINE_MIN`, `DATA_DIR` e as três variáveis de bootstrap do superadmin. Sem `SENSOR_API_KEY`, uma chave local é criada em `data/config.json`; mantenha esse arquivo privado. Para desenvolvimento, o simulador também aceita `API` para definir a URL do servidor.

Em produção, configure HTTPS em um proxy reverso confiável e defina `HTTPS=1` para que o cookie de sessão use `Secure`. O servidor HTTP incluído não configura TLS por conta própria.

O endpoint público `GET /health` retorna JSON com o estado básico do processo
e pode ser usado por monitoração ou verificações de prontidão.

## Relatório: necessidades e prioridades

### Prioridade alta — antes de uso público ou produção

1. **Persistência e concorrência:** os dados são arquivos JSON/JSONL carregados em memória. Recomenda-se migrar para SQLite ou PostgreSQL, com migrações e tratamento de concorrência.
2. **Proteção operacional:** configurar HTTPS, backups testados e política de retenção para leituras e alarmes. Os arquivos em `data/` contêm dados operacionais e não devem ser publicados.
3. **Cobertura de testes:** há testes unitários e de integração para domínio, autenticação, propriedades e relatórios; simuladores e rotas secundárias podem receber mais cobertura automatizada.
4. **Publicação do back-end:** o workflow versionado em `.github/workflows/development_green-weather.yml` publica somente `public/`. Para usar a API na hospedagem, o servidor Node.js e sua persistência precisam ser publicados e configurados também.

### Prioridade média

5. **Validação e observabilidade:** ampliar logs estruturados e centralizar mais validações de entrada. O endpoint `GET /health` já fornece um check básico.
6. **Configurações de alarmes:** permitir ajustar o tempo de offline sem editar o código.
7. **Manutenção de dados:** implementar exportação/importação e retenção configurável para o histórico.
8. **Qualidade da interface:** substituir datas demonstrativas fixas por períodos dinâmicos e revisar acessibilidade e estados de carregamento/erro.

## Segurança e dados locais

- Os arquivos JSON/JSONL em `data/` são dados locais de execução e estão excluídos do Git.
- Não armazene senhas ou chaves de sensores em arquivos de exemplo, documentação ou repositórios.
- Se uma chave ou senha real já tiver sido compartilhada, substitua-a antes de colocar o sistema em produção.
