# Relatório geral de segurança: 2FA e IDOR

## Escopo

Este relatório registra os mecanismos de autenticação e autorização existentes
no GreenWeather, com foco na senha diária e no isolamento de sensores por
responsável. É uma descrição da implementação e dos testes automatizados do
projeto, não uma auditoria independente, certificação ou garantia de ausência de
vulnerabilidades.

## Autenticação em duas etapas

- Funcionários e engenheiros informam a senha da conta e uma senha diária.
- O código diário é derivado no servidor com HMAC-SHA-256 e um segredo privado
  persistido em `data/config.json`.
- A troca automática ocorre à meia-noite do fuso configurado em `FUSO`.
- O superadmin consulta o código na aba **Senha do dia** e pode gerar outro
  código manualmente. A rotação manual invalida o código anterior.
- A consulta e a rotação do código exigem sessão de superadmin.
- O superadmin não precisa da senha diária para entrar.

### Limitação importante

O código é compartilhado entre funcionários e engenheiros, e não é um fator
individual baseado em TOTP, passkey ou dispositivo do usuário. Senha da conta e
código diário são ambos fatores de conhecimento; portanto, esta solução é uma
verificação adicional, mas não oferece a independência de fatores de uma
implementação 2FA individual. Compartilhar o código amplia o impacto caso ele
seja exposto. Para produção, considere TOTP ou passkeys individuais, recuperação
segura e proteção contra tentativas automatizadas.

## Autorização contra IDOR

O servidor determina o escopo do usuário pela relação entre sensores e
propriedades:

- Um sensor pertence à propriedade à qual está vinculado.
- A propriedade pertence ao usuário indicado em `responsavel`.
- Engenheiros acessam somente sensores de suas propriedades.
- Funcionários comuns podem consultar todos os sensores e dados relacionados em
  modo somente leitura; não podem consultar, criar ou editar propriedades.
- O superadmin mantém acesso global.
- Para engenheiros, sensores fora do escopo e IDs não vinculados retornam 404,
  sem revelar se o sensor existe. Funcionários têm escopo global de leitura,
  então podem consultar qualquer sensor existente, mas não podem alterar
  propriedade ou vínculo.
- A edição de uma propriedade exige que ela pertença ao usuário autenticado ou
  que o usuário seja superadmin. O responsável não é aceito do corpo enviado
  pelo cliente.
- Relatórios técnicos são calculados com o escopo atual do usuário; relatórios
  salvos anteriormente também são recalculados antes de serem retornados.

O escopo é aplicado às APIs de sensores, leituras, alarmes, resumo, previsão,
resumo inteligente, relatórios e limites climáticos. Funcionários e engenheiros
consultam e configuram somente propriedades atribuídas; funcionários não podem
cadastrar propriedades, e atribuir sensores continua sendo exclusivo do
superadmin. Os testes de integração em `tests/propriedades.test.js` verificam
atribuições, alteração de ID e negação de acesso a propriedades alheias.

### Limitações e próximos passos

- O sistema não possui atualmente uma API para enviar comandos físicos aos
  dispositivos. Assim, não há uma operação de comando para autorização por
  dispositivo; qualquer endpoint futuro deverá aplicar a mesma verificação de
  propriedade no servidor.
- O recebimento de leituras de sensores usa a chave compartilhada
  `SENSOR_API_KEY`, não uma credencial individual por sensor. Proteja essa chave
  e planeje credenciais por dispositivo antes de expor a ingestão em ambientes
  não confiáveis.
- A atribuição é mantida na propriedade e serve como fonte de autorização para
  funcionários e engenheiros.
- Os limites climáticos são isolados por propriedade; o padrão do sistema só
  pode ser alterado pelo superadmin.

## Verificação

Execute a suíte completa com:

```powershell
npm test
```

Para executar apenas os testes de propriedades, sensores e isolamento de
acesso:

```powershell
node --test tests/propriedades.test.js
```

Consulte [`../tests/README.md`](../tests/README.md) para detalhes. Guarde em
`evidencias/` capturas, logs e vídeos reais de validação. Nenhuma evidência
visual é presumida por este relatório.
