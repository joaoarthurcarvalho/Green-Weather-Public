# Modelo de ameaças

## Ativos e limites de confiança

- Sessões autenticadas, contas e papéis de usuário.
- Leituras, alarmes, previsões, relatórios e identificadores de sensores.
- Relação de propriedade/responsável e associações sensor-propriedade.
- Segredo da senha diária e chave de ingestão dos sensores.
- Navegador do usuário, que não é confiável para decidir propriedade ou papel.

O servidor Node.js é a fronteira de autorização. IDs e dados enviados pelo
navegador devem ser tratados como entrada não confiável.

## Ameaças e proteções

| Ameaça | Cenário | Proteção existente | Risco residual / ação recomendada |
|---|---|---|---|
| IDOR ao consultar sensores | Um engenheiro troca o ID do sensor em uma URL ou consulta de histórico para tentar ler dados de outra propriedade. | O servidor calcula o escopo do engenheiro a partir das propriedades sob sua responsabilidade. IDs fora desse escopo retornam 404. Funcionários comuns têm permissão explícita de leitura global, sem permissão de edição; o acesso deles não é considerado isolamento por propriedade. | Repetir testes de autorização ao adicionar endpoints. Se funcionários precisarem de isolamento por propriedade, criar associação explícita antes de restringir o escopo deles. |
| IDOR ao editar propriedades ou atribuições | Um usuário altera o ID da propriedade no corpo da requisição para modificar propriedade alheia ou atribuir sensores. | A API verifica o responsável da propriedade; somente o superadmin pode enviar a lista de sensores. O responsável é determinado no servidor no cadastro. | Manter autorização em cada nova operação de edição/exclusão; não confiar em controles de interface. |
| Vazamento por relatórios agregados ou antigos | Um relatório inclui médias, alarmes ou extremos de sensores de outro responsável; um relatório legado mantém totais globais. | Relatórios novos são calculados apenas com sensores permitidos. Relatórios salvos são recalculados com o escopo atual antes de serem retornados. A listagem também é limitada ao autor. | Verificar novos campos adicionados ao relatório e manter testes para registros antigos. |
| Roubo ou compartilhamento da senha diária | Um código compartilhado é encaminhado a alguém sem autorização ou capturado junto com a senha da conta. | Consulta e rotação exigem sessão de superadmin; o segredo de derivação é guardado em arquivo privado; a rotação manual invalida o código anterior e há limite de tentativas de login. | O código continua compartilhado e é um fator de conhecimento. Adotar TOTP/passkeys individuais e revisar retenção/proteção de `data/config.json`. |
| Falsificação de leituras com chave de ingestão | Alguém obtém `SENSOR_API_KEY` e envia leituras declarando IDs de sensores. | A API de ingestão exige a chave e valida formato e faixa dos valores; a chave não é exibida pela interface. | A chave é compartilhada entre sensores e não prova a identidade individual de um dispositivo. Proteger o segredo e considerar credenciais por dispositivo, rotação e transporte HTTPS. |

## Fora do escopo atual

O projeto não possui endpoint de comando físico para sensores/atuadores. Logo,
esta aplicação não consegue demonstrar autorização de comandos ainda
inexistentes. Se comandos forem implementados, cada comando deverá identificar
o sensor no servidor, validar a sessão e o responsável associado, validar a
ação permitida e registrar a operação sem aceitar o proprietário do cliente.

## Testes relacionados

- `node --test test/propriedades.test.js`: isolamento por responsável,
  modificação de IDs, leituras, alarmes e relatórios.
- `npm test`: suíte automatizada completa.

Os testes confirmam os casos implementados, mas não substituem revisão de
segurança, testes de implantação ou monitoramento operacional.
