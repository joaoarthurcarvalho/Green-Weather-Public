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
- Usuários sem propriedade vinculada não recebem dados de sensores.
- O superadmin mantém acesso global.
- Sensores sem propriedade vinculada não ficam visíveis aos usuários comuns.
- Consultas por um sensor fora do escopo retornam 404, sem revelar se o sensor
  existe.
- A edição de uma propriedade exige que ela pertença ao usuário autenticado ou
  que o usuário seja superadmin. O responsável não é aceito do corpo enviado
  pelo cliente.
- Relatórios técnicos são calculados com o escopo atual do usuário; relatórios
  salvos anteriormente também são recalculados antes de serem retornados.

O escopo é aplicado às APIs de sensores, leituras, alarmes, resumo, previsão,
resumo inteligente e relatórios. Os testes de integração em
`test/propriedades.test.js` verificam acesso entre dois responsáveis, alteração
de ID na consulta, dados agregados e relatórios salvos.

### Limitações e próximos passos

- O sistema não possui atualmente uma API para enviar comandos físicos aos
  dispositivos. Assim, não há uma operação de comando para autorização por
  dispositivo; qualquer endpoint futuro deverá aplicar a mesma verificação de
  propriedade no servidor.
- O recebimento de leituras de sensores usa a chave compartilhada
  `SENSOR_API_KEY`, não uma credencial individual por sensor. Proteja essa chave
  e planeje credenciais por dispositivo antes de expor a ingestão em ambientes
  não confiáveis.
- A associação atual é feita pela propriedade responsável. Usuários sem
  propriedades sob sua responsabilidade não têm sensores associados por este
  modelo.
- Os limites climáticos são uma configuração compartilhada, não uma configuração
  isolada por propriedade.

## Verificação

Execute a suíte completa com:

```powershell
npm test
```

Para executar apenas os testes de propriedades, sensores e isolamento de
acesso:

```powershell
node --test test/propriedades.test.js
```

Consulte `testes/README.md` para detalhes e `evidencias/` para anexar capturas,
logs e vídeos reais de validação. Nenhuma evidência visual é presumida por este
relatório.
