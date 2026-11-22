"use strict";

const TIPOS_ANOMALIA = [
  "temperatura_alta",
  "temperatura_baixa",
  "umidade_alta",
  "umidade_baixa"
];
const CHANCE_ANOMALIA = 0.02;

function gerarAnomalia(aleatorio = Math.random){
  if (aleatorio() >= CHANCE_ANOMALIA) return null;
  return TIPOS_ANOMALIA[Math.min(3, Math.floor(aleatorio() * TIPOS_ANOMALIA.length))];
}

function valores(ts, indice, anomalia = null, aleatorio = Math.random){
  const ruido = amplitude => (aleatorio() - 0.5) * 2 * amplitude;
  const data = new Date(ts);
  const hora = data.getHours() + data.getMinutes() / 60;
  let temperatura = 25 + 5 * Math.sin((hora - 9) / 24 * 2 * Math.PI) +
    (indice - 6) * 0.08 + ruido(0.7);
  let umidade = 70 - (temperatura - 25) * 2.4 + ruido(2);

  temperatura = Math.max(20.5, Math.min(29.5, temperatura));
  umidade = Math.max(52, Math.min(78, umidade));

  if (anomalia === "temperatura_alta") temperatura = 32 + aleatorio() * 4;
  if (anomalia === "temperatura_baixa") temperatura = 16 + aleatorio() * 3;
  if (anomalia === "umidade_alta") umidade = Math.round(85 + aleatorio() * 10);
  if (anomalia === "umidade_baixa") umidade = Math.round(30 + aleatorio() * 15);

  return {
    temperatura: Math.round(temperatura * 10) / 10,
    umidade: Math.round(umidade)
  };
}

module.exports = { gerarAnomalia, valores };
