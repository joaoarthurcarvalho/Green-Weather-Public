# Testes automatizados

Execute toda a suíte a partir da raiz do projeto:

```powershell
npm test
```

Para executar um arquivo específico:

```powershell
node --test tests/propriedades.test.js
```

Os testes de integração iniciam o servidor em uma porta local e usam um
diretório temporário para os dados. Testes e comandos de segurança adicionais
estão documentados em `segurança/`.
