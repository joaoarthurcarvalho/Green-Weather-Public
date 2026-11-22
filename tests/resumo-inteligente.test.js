"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const criarResumoInteligente = require("../src/domain/resumo-inteligente");

test("resume leituras, tendências, alarmes e sensores offline", () => {
  const agora = Date.now();
  const resultado = criarResumoInteligente({
    agora,
    leituras: [
      { s: "sensor-01", ts: agora - 3000, t: 24, u: 70 },
      { s: "sensor-01", ts: agora - 2000, t: 25, u: 67 },
      { s: "sensor-02", ts: agora - 1000, t: 26, u: 64 },
      { s: "sensor-02", ts: agora, t: 27, u: 61 }
    ],
    alarmes: { total: 2, ativosAgora: 1 },
    sensores: [{ id: "sensor-01", online: true }, { id: "sensor-02", online: false }]
  });

  assert.equal(resultado.status, "com_dados");
  assert.equal(resultado.leiturasAnalisadas, 4);
  assert.equal(resultado.sensoresAnalisados, 2);
  assert.match(resultado.resumo, /1 alarme/);
  assert.ok(resultado.destaques.some(item => /subiu/.test(item.texto)));
  assert.ok(resultado.destaques.some(item => /sem comunicação/.test(item.texto)));
});

test("explica quando não há leituras recentes", () => {
  const resultado = criarResumoInteligente({
    agora: Date.now(),
    leituras: [],
    alarmes: { total: 0, ativosAgora: 0 },
    sensores: []
  });

  assert.equal(resultado.status, "sem_leituras");
  assert.equal(resultado.leiturasAnalisadas, 0);
  assert.match(resultado.resumo, /não há leituras/i);
});
