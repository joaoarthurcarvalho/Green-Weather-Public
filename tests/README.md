# Testes automatizados

Execute toda a suíte a partir da raiz do projeto:

```powershell
npm test
```

Para executar um arquivo específico:

```powershell
node --test tests/propriedades.test.js
node --test tests/api.test.js
```

Os testes de integração iniciam o servidor em uma porta local e usam um
diretório temporário para os dados. Testes e comandos de segurança adicionais
estão documentados em `segurança/`.

`tests/api.test.js` cobre a resposta básica de `/health` e cenários essenciais
de `POST /api/leituras`: chave incorreta, lote inválido, deduplicação e os
limites de 1000/1001 registros. A suíte não substitui uma auditoria completa de
todos os endpoints ou testes visuais de navegador.
