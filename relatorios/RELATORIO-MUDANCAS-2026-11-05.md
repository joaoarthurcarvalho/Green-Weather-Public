# Relatório de mudanças — Green Weather

**Data:** 5 de novembro de 2026  
**Projeto:** Green Weather — monitoramento ambiental  
**Escopo:** estimativa de condições ambientais e rolagem dos históricos.

## Resumo executivo

Foi adicionada ao painel uma estimativa estatística local de possíveis saídas das faixas ideais de temperatura e umidade. Também foram substituídos os controles de “Mostrar mais” no histórico de leituras por áreas de rolagem próprias, e aplicada rolagem à tabela de registros de alarmes.

## Mudanças implementadas

### Estimativa de condições fora da faixa ideal

- Criado um cálculo por regressão linear sobre as leituras recentes de cada sensor.
- O sistema considera até 6 horas de dados e só estima quando há pelo menos 5 leituras ao longo de 1 hora, com uma leitura recente.
- A estimativa identifica possíveis cruzamentos das faixas configuradas no sistema: temperatura entre 20 °C e 30 °C e umidade entre 50% e 80%.
- O horizonte da estimativa é de até 3 horas. Os resultados incluem sensor, variável, tendência, valor atual, limite e horário estimado.
- Adicionada a rota autenticada `GET /api/previsao`.
- Adicionado ao painel um card que apresenta as estimativas e informa quando os dados disponíveis não são suficientes.
- O cálculo é estatístico, executado localmente, não usa um provedor externo de IA e não representa uma previsão meteorológica ou garantia de que o limite será atingido.

### Rolagem dos históricos

- Substituído o botão “Mostrar mais” do histórico de leituras por uma área rolável com altura máxima de 520 px.
- Aplicada área rolável à tabela de registros de alarmes, também com altura máxima de 520 px.
- Mantidos os cabeçalhos das tabelas visíveis durante a rolagem.
- Adicionados rótulos acessíveis e foco por teclado nas áreas roláveis.
- Removido o script antigo responsável por limitar as linhas e alternar “Mostrar mais/Mostrar menos”.

## Arquivos envolvidos

| Arquivo | Alteração |
|---|---|
| `previsao.js` | Cálculo local das tendências por sensor e produção dos resultados. |
| `server.js` | Indexação temporária das leituras recentes e rota autenticada `GET /api/previsao`. |
| `public/html/dashboard.html` | Inclusão do card de estimativas no painel. |
| `public/js/previsao-dashboard.js` | Consulta periódica da API e apresentação das estimativas. |
| `public/css/previsao.css` | Estilos do card de estimativas, incluindo tema claro e telas estreitas. |
| `test/previsao.test.js` | Testes de cruzamento de limite, dados insuficientes, leituras antigas e horizonte. |
| `package.json` | Inclusão do comando `npm test` usando o test runner nativo do Node.js. |
| `README.md` | Documentação da estimativa, dos requisitos de dados e das limitações. |
| `public/html/historico.html` | Área rolável para as leituras e remoção da referência ao script de limite. |
| `public/css/historico.css` | Rolagem, cabeçalho fixo e indicação de foco nos históricos de leituras e alarmes. |
| `public/js/alarmes-historico.js` | Área rolável e acessível para registros de alarmes. |
| `public/js/historico-limite.js` | Removido; não é mais necessário com a rolagem da tabela. |

## Validação realizada

- `npm test`: 3 testes passaram.
- Verificada a sintaxe de `server.js`, `previsao.js`, `public/js/previsao-dashboard.js`, `public/js/alarmes-historico.js`, `public/js/historico-api.js` e `test/previsao.test.js`.
- Testada a rota autenticada `/api/previsao` em uma instância local com diretório temporário de dados.
- Confirmado que não restaram referências a “Mostrar mais/Mostrar menos” nem ao script removido.
