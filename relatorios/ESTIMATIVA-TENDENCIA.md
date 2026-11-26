# Estimativa de tendência ambiental

A estimativa é calculada localmente pelo módulo
[`src/domain/previsao.js`](./src/domain/previsao.js). Ela extrapola a tendência
recente de temperatura e umidade por sensor; não é uma previsão meteorológica
nem uma garantia de que o limite será atingido.

## Dados usados

- Leituras dentro das últimas 6 horas.
- Pelo menos 5 leituras por sensor, cobrindo no mínimo 1 hora.
- A leitura mais recente do sensor deve ter até 15 minutos.
- Os limites configurados para a propriedade; na ausência deles, temperatura
  de 20 a 30 °C e umidade de 50 a 80%.

Para cada variável dentro de sua faixa, o módulo ajusta uma regressão linear às
leituras do sensor. Se a inclinação indicar aproximação de um limite, estima o
tempo até ele. Só retorna estimativas positivas de até 3 horas. Valores que já
estão fora da faixa não geram uma estimativa de cruzamento.

## Estados retornados

- `sem_leituras`: não há leituras dentro da janela de 6 horas.
- `sem_dados_recentes`: há leituras na janela, mas nenhum sensor tem leitura
  recente o bastante.
- `dados_insuficientes`: há sensor recente, mas faltam quantidade ou intervalo
  mínimo de leituras.
- `sem_tendencia`: há dados suficientes, mas nenhuma variável deve cruzar um
  limite dentro do horizonte.
- `previsoes`: uma ou mais variáveis têm cruzamento estimado em até 3 horas.

Os resultados são ordenados pelo tempo estimado até o limite. Sensores de
demonstração são identificados no resultado; o resumo inteligente os exclui.
