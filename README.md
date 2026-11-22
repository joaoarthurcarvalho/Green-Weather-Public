# Green Weather

Sistema web para monitoramento de temperatura e umidade, com cadastro de usuários, sensores, histórico e alarmes.

## Estrutura atual

```text
GreenWeather/
├── server.js                  # servidor HTTP, API, autenticação e arquivos estáticos
├── alarmes.js                 # regras e persistência de alarmes
├── package.json               # comandos e versão mínima do Node.js
├── scripts/                   # ferramentas de simulação e demonstração
│   ├── simulador.js
│   └── exemplo.js
├── data/                      # dados locais persistidos pelo sistema
│   ├── alarmes.json
│   ├── config.json            # chave local dos sensores
│   ├── leituras.jsonl
│   └── usuarios.json
└── public/
    ├── html/                  # páginas do sistema
    ├── css/                   # estilos compartilhados e por tela
    ├── js/                    # integração com API e interação da interface
    └── assets/                # logotipo e recursos estáticos
```

As páginas são servidas em `/html/<pagina>.html`; CSS, JavaScript e imagens ficam
nas pastas `/css/`, `/js/` e `/assets/`. Para compatibilidade, `/` abre o login,
e os atalhos `/<pagina>.html` redirecionam para as páginas correspondentes em
`/html/` (inclusive funcionários e propriedades). O atalho legado
`/cadastro.html` continua direcionando ao login.

## O que já existe

- Aplicação web servida diretamente pelo Node.js, sem dependências externas.
- Login com senha e senha diária adicional para funcionários e engenheiros; senhas armazenadas com `scrypt`, sessões por cookie e funções de conta. O superadministrador acessa a senha diária na aba correspondente da tela Funcionários e não precisa dela para entrar. O código muda à meia-noite do fuso configurado em `FUSO`, pode ser rotacionado manualmente pelo superadministrador e é derivado de um segredo privado persistido em `data/config.json`.
- Cadastro, ativação, desativação e exclusão de contas de funcionários e engenheiros pelo superadministrador, com matrícula automática. Contas de superadmin não podem ser alteradas ou excluídas pela tela de funcionários; desativar uma conta encerra suas sessões e bloqueia novos logins.
- Cadastro e configuração de propriedades rurais por engenheiros agrônomos; o superadmin pode consultar e editar todas, além de atribuir sensores. O Histórico lista os dados por sensor em intervalos de 30 minutos, com a propriedade vinculada quando disponível.
- Engenheiros acessam dados apenas dos sensores vinculados às propriedades sob sua responsabilidade. Funcionários comuns podem consultar todos os dados de sensores, histórico e alarmes em modo somente leitura; não podem consultar, criar ou editar propriedades. O superadmin mantém acesso e gestão globais. Propriedades só podem ser editadas pelo responsável ou pelo superadmin. O sistema atualmente recebe leituras dos sensores, mas não possui uma API de comandos físicos para dispositivos.
- Configuração compartilhada de limites climáticos no Histórico por engenheiros agrônomos e superadministradores; esses perfis também podem gerar relatórios técnicos, salvá-los na conta, reabri-los e imprimir ou salvar em PDF pelo navegador.
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

## Relatório: necessidades e prioridades

### Prioridade alta — antes de uso público ou produção

1. **Persistência e concorrência:** os dados são arquivos JSON/JSONL carregados em memória. Recomenda-se migrar para SQLite ou PostgreSQL, com migrações e tratamento de concorrência.
2. **Proteção operacional:** configurar HTTPS, backups testados e política de retenção para leituras e alarmes. Os arquivos em `data/` contêm dados operacionais e não devem ser publicados.
3. **Cobertura de testes:** há testes para a previsão, o resumo local e regras de alarmes; rotas, autenticação, histórico e simuladores ainda precisam de cobertura automatizada.
4. **Painel conectado aos dados reais:** o resumo inteligente, a previsão e os alarmes consultam dados reais; cartões de valores atuais, tabela inicial e gráfico em `public/html/dashboard.html` ainda usam valores demonstrativos e precisam ser conectados às APIs.

### Prioridade média

5. **Validação e observabilidade:** adicionar logs estruturados, endpoint de saúde e validações centralizadas de entrada.
6. **Configurações de alarmes:** permitir ajustar o tempo de offline sem editar o código.
7. **Manutenção de dados:** implementar exportação/importação e retenção configurável para o histórico.
8. **Qualidade da interface:** substituir datas demonstrativas fixas por períodos dinâmicos e revisar acessibilidade e estados de carregamento/erro.

## Segurança e dados locais

- `data/config.json`, `data/usuarios.json`, `data/alarmes.json`, `data/leituras.jsonl` e `data/propriedades.json` são arquivos locais de execução e estão excluídos do Git.
- Não armazene senhas ou chaves de sensores em arquivos de exemplo, documentação ou repositórios.
- Se uma chave ou senha real já tiver sido compartilhada, substitua-a antes de colocar o sistema em produção.
