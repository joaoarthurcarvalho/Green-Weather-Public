"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const preverCondicoes = require("../src/domain/previsao");

function leiturasDeTemperatura(agora, valores, intervalo = 30 * 60 * 1000) {
  return valores.map((t, i) => ({
    s: "sensor-01", ts: agora - (valores.length - 1 - i) * intervalo, t, u: 65
  }));
}

test("estima cruzamento de limite dentro do horizonte", () => {
  const agora = Date.now();
  const resultado = preverCondicoes(leiturasDeTemperatura(agora, [24, 25, 26, 27, 28]), agora);

  assert.equal(resultado.status, "previsoes");
  assert.equal(resultado.previsoes.length, 1);
  assert.equal(resultado.previsoes[0].grandeza, "temperatura");
  assert.equal(resultado.previsoes[0].tendencia, "alta");
  assert.equal(resultado.previsoes[0].demonstracao, false);
  assert.equal(resultado.previsoes[0].limite, 30);
  assert.equal(resultado.previsoes[0].horas, 1);
});

test("usa os limites da propriedade atribuída ao sensor", () => {
  const agora = Date.now();
  const leituras = leiturasDeTemperatura(agora, [21, 22, 23, 24, 24.5]);
  const resultado = preverCondicoes(leituras, agora, () => ({
    temperaturaMinima: 10, temperaturaMaxima: 25,
    umidadeMinima: 40, umidadeMaxima: 70
  }));

  assert.equal(resultado.previsoes.length, 1);
  assert.equal(resultado.previsoes[0].limite, 25);
});

test("marca como demonstrativa a previsão do sensor de demonstração", () => {
  const agora = Date.now();
  const leituras = leiturasDeTemperatura(agora, [27.8, 28.2, 28.6, 29, 29.4])
    .map(leitura => ({ ...leitura, s: "demo-previsao" }));
  const resultado = preverCondicoes(leituras, agora);

  assert.equal(resultado.previsoes.length, 1);
  assert.equal(resultado.previsoes[0].demonstracao, true);
});

test("não prevê com poucos dados, leitura antiga ou variável já fora da faixa", () => {
  const agora = Date.now();
  const poucas = leiturasDeTemperatura(agora, [24, 26, 28, 29]);
  const antigas = leiturasDeTemperatura(agora - 20 * 60 * 1000, [24, 25, 26, 27, 28]);
  const fora = leiturasDeTemperatura(agora, [32, 33, 34, 35, 36]);

  assert.deepEqual(preverCondicoes(poucas, agora).previsoes, []);
  assert.deepEqual(preverCondicoes(antigas, agora).previsoes, []);
  assert.deepEqual(preverCondicoes(fora, agora).previsoes, []);
  assert.equal(preverCondicoes(poucas, agora).status, "dados_insuficientes");
  assert.equal(preverCondicoes(antigas, agora).status, "sem_dados_recentes");
  assert.equal(preverCondicoes(fora, agora).status, "sem_tendencia");
});

test("não extrapola quando o limite está além das próximas três horas", () => {
  const agora = Date.now();
  const leituras = leiturasDeTemperatura(agora, [21, 21.5, 22, 22.5, 23]);

  assert.deepEqual(preverCondicoes(leituras, agora).previsoes, []);
});

test("informa quando não há leituras dentro da janela analisada", () => {
  const agora = Date.now();
  const resultado = preverCondicoes([], agora);

  assert.equal(resultado.status, "sem_leituras");
  assert.equal(resultado.leiturasNaJanela, 0);
  assert.equal(resultado.ultimaLeituraEm, null);
});
