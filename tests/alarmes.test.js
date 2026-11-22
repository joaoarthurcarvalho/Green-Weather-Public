"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const criarAlarmes = require("../src/domain/alarmes");

test("filtra alarmes pelo instante e não abre offline para sensores de demonstração", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "green-weather-alarmes-"));
  try {
    const alarmes = criarAlarmes({ dir, partes: () => ({ d: "2026-11-16", h: "10:00" }) });
    alarmes.processar([
      { s: "sensor-antigo", ts: 1000, t: 35, u: 60 },
      { s: "sensor-recente", ts: 2000, t: 35, u: 60 }
    ]);

    const resultado = alarmes.consultar({ inicioTs: 1500, limite: 10 });
    assert.equal(resultado.total, 1);
    assert.equal(resultado.alarmes[0].sensor, "sensor-recente");

    alarmes.verificarSensores(new Map([["demo-previsao", { ts: 1 }]]), 100000000);
    assert.equal(alarmes.consultar({ limite: 10 }).total, 2);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("persiste limites climáticos alterados e os aplica às novas leituras", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "green-weather-limites-"));
  try {
    const partes = () => ({ d: "2026-11-16", h: "10:00" });
    const alarmes = criarAlarmes({ dir, partes });
    const limites = {
      temperaturaMinima: 10, temperaturaMaxima: 25,
      umidadeMinima: 40, umidadeMaxima: 70
    };
    alarmes.configurarLimites(limites);
    alarmes.processar([{ s: "sensor-1", ts: 1000, t: 27, u: 50 }]);

    const carregado = criarAlarmes({ dir, partes });
    assert.deepEqual(carregado.obterLimites(), limites);
    const resultado = carregado.consultar({ limite: 10 });
    assert.equal(resultado.total, 1);
    assert.equal(resultado.alarmes[0].tipo, "temperatura_alta");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
