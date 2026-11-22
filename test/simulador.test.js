"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { gerarAnomalia, valores } = require("../scripts/simulador-leituras");

test("gera anomalias ocasionais e as mantém fora das faixas climáticas padrão", () => {
  assert.equal(gerarAnomalia(() => 0.5), null);
  assert.equal(gerarAnomalia((() => {
    const valores = [0.01, 0.99];
    return () => valores.shift();
  })()), "umidade_baixa");

  const ts = Date.UTC(2026, 10, 22, 14);
  const previsoes = [
    ["temperatura_alta", "temperatura", valor => valor > 30],
    ["temperatura_baixa", "temperatura", valor => valor < 20],
    ["umidade_alta", "umidade", valor => valor > 80],
    ["umidade_baixa", "umidade", valor => valor < 50]
  ];
  for (const [anomalia, grandeza, foraDaFaixa] of previsoes) {
    assert.equal(foraDaFaixa(valores(ts, 3, anomalia, () => 0.5)[grandeza]), true);
  }
});

test("mantém as leituras normais dentro das faixas climáticas padrão", () => {
  const ts = Date.UTC(2026, 10, 22, 14);
  for (const aleatorio of [() => 0, () => 0.5, () => 0.99]) {
    const leitura = valores(ts, 3, null, aleatorio);
    assert.ok(leitura.temperatura >= 20 && leitura.temperatura <= 30);
    assert.ok(leitura.umidade >= 50 && leitura.umidade <= 80);
  }
});
