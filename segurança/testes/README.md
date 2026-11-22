# Testes de segurança

Execute os comandos na raiz do projeto.

## Suíte completa

```powershell
npm test
```

## Autenticação

```powershell
node segurança/testes/testar-autenticacao.js
```

O script executa o teste de integração de autenticação: senha diária,
autenticação do superadmin, código incorreto ou expirado após rotação,
permissão de consulta e persistência após reiniciar o servidor de teste.

## IDOR e isolamento de sensores

```powershell
node segurança/testes/testar-idor.js
```

O script verifica que um engenheiro não recebe dados de sensores de outro
responsável e que alterar o ID consultado não contorna a autorização. Também
confirma que funcionários podem consultar o histórico e alarmes de todos os
sensores, mas recebem 403 ao tentar consultar, criar ou editar propriedades.
Leituras, alarmes, resumos e relatórios do engenheiro continuam limitados ao
seu escopo; relatórios salvos legados também são testados.

Os dois scripts podem ser executados separadamente. Para executar todos os
testes do projeto, use `npm test`.

## Sintaxe dos arquivos principais

```powershell
node --check server.js
node --check alarmes.js
node --check test/propriedades.test.js
```

Os testes executam o servidor em uma pasta temporária e removem os dados
temporários ao final. Guarde em `evidencias/` a saída real dos testes, a data e
a versão do código validada; não inclua arquivos de dados de produção, cookies
ou chaves.
