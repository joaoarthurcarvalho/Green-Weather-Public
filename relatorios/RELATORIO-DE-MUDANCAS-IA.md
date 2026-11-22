# Relatório de mudanças IA

**Projeto:** Green Weather  
**Escopo:** previsão de condições fora da faixa ideal e resumo inteligente de alarmes e leituras.

## Resumo

Foram desenvolvidas duas funcionalidades de análise local para o painel. Ambas
usam regras e estatísticas sobre os dados do sistema; não enviam informações a
provedores externos nem dependem de um modelo de linguagem ou de credenciais de
IA.

## 1. Previsão de condições fora da faixa ideal

- Analisa leituras por sensor em uma janela de até 6 horas.
- Calcula uma tendência linear para estimar se temperatura ou umidade podem
  cruzar os limites configurados em até 3 horas.
- Só apresenta uma estimativa quando há pelo menos 5 leituras ao longo de uma
  hora e a leitura mais recente tem até 15 minutos.
- Identifica separadamente dados insuficientes, ausência de leituras recentes e
  ausência de tendência prevista, evitando deixar o card sem explicação.
- A rota autenticada `GET /api/previsao` fornece as estimativas ao painel.
- Foi criado o comando `npm run demonstrar:previsao`, que registra cinco
  leituras simuladas do sensor `demo-previsao`, distribuídas ao longo de uma
  hora, para demonstrar o funcionamento sem sensores ativos. O painel identifica
  esses resultados como demonstrativos; eles não são tratados como dados reais
  pelo resumo inteligente.
- A demonstração é gravada no histórico local. Para renovar os dados recentes,
  execute o comando novamente com o servidor ligado.

## 2. Resumo inteligente de alarmes e leituras

- Adicionado um card ao painel com uma síntese das últimas 24 horas.
- Resume quantidade de leituras e sensores, médias de temperatura e umidade,
  tendências de alta/baixa ou estabilidade, alarmes ativos e sensores sem
  comunicação.
- Informa quando não há dados recentes para produzir uma análise.
- A rota autenticada `GET /api/resumo-inteligente` reúne os dados para o painel.
- Leituras do sensor demonstrativo `demo-previsao` são excluídas do resumo, para
  que dados simulados não alterem a visão das condições reais.
- O resumo é atualizado periodicamente e apresentado em linguagem natural,
  junto de destaques categorizados.

## Arquivos relacionados

| Arquivo | Responsabilidade |
|---|---|
| `previsao.js` | Cálculo das tendências e identificação do estado da previsão. |
| `resumo-inteligente.js` | Geração do resumo, médias, tendências e destaques. |
| `server.js` | Rotas autenticadas e manutenção das leituras recentes usadas pelas análises. |
| `alarmes.js` | Filtro de alarmes por instante e exclusão de sensores de demonstração da verificação de offline. |
| `public/html/dashboard.html` | Cards de previsão e resumo inteligente no painel. |
| `public/js/previsao-dashboard.js` | Consulta e apresentação das previsões, com identificação dos resultados demonstrativos. |
| `public/js/resumo-inteligente-dashboard.js` | Consulta periódica e apresentação do resumo. |
| `public/css/previsao.css` | Estilos dos cards de análise. |
| `scripts/demonstracao-previsao.js` | Geração de leituras demonstrativas pela API. |
| `package.json` | Comando `demonstrar:previsao`. |
| `test/previsao.test.js` | Testes de previsão, dados insuficientes e dados demonstrativos. |
| `test/resumo-inteligente.test.js` | Testes do resumo e do caso sem leituras. |
| `test/alarmes.test.js` | Teste do filtro temporal de alarmes e do tratamento de sensores demonstrativos. |
| `README.md` | Instruções de uso e limitações das duas funcionalidades. |

## Validação

- `npm test`: 8 testes passaram.
- Verificada a sintaxe JavaScript dos arquivos relacionados.
- Testadas em ambiente isolado as rotas autenticadas da previsão e do resumo.
- Confirmado que a demonstração gera previsão identificada como demonstrativa
  sem incluir suas leituras no resumo real.

## Observação

As funcionalidades são análises estatísticas e baseadas em regras, não
previsões meteorológicas nem garantias de que uma condição ocorrerá. A qualidade
da previsão depende da frequência, atualidade e qualidade das leituras dos
sensores.
