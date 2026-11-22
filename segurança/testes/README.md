# Testes de segurança

Execute os comandos na raiz do projeto.

## Suíte completa

```powershell
npm test
```

## Testes de isolamento de sensores e propriedades

```powershell
node --test test/propriedades.test.js
```

Esse teste de integração verifica que um engenheiro não recebe dados de sensor
associado à propriedade de outro responsável, que alterar o ID consultado não
contorna a autorização, e que alarmes, resumos e relatórios respeitam o escopo.
Também verifica a proteção de relatórios salvos legados.

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
