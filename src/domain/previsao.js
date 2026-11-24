"use strict";

const JANELA_MS = 6 * 60 * 60 * 1000;
const HORIZONTE_H = 3;
const MIN_LEITURAS = 5;
const MIN_INTERVALO_MS = 60 * 60 * 1000;
const TEMP_MIN = 20;
const TEMP_MAX = 30;
const UMID_MIN = 50;
const UMID_MAX = 80;

function regressao(pontos, chave, tsReferencia) {
  const xs = pontos.map(p => (p.ts - tsReferencia) / 3600000);
  const ys = pontos.map(p => p[chave]);
  const mediaX = xs.reduce((a, b) => a + b, 0) / xs.length;
  const mediaY = ys.reduce((a, b) => a + b, 0) / ys.length;
  const variacaoX = xs.reduce((s, x) => s + (x - mediaX) ** 2, 0);
  if (!variacaoX) return 0;
  return xs.reduce((s, x, i) => s + (x - mediaX) * (ys[i] - mediaY), 0) / variacaoX;
}

function preverCondicoes(leituras, agora = Date.now(), limitesParaSensor = () => null) {
  const porSensor = new Map();
  let totalJanela = 0;
  let ultimaLeituraTs = null;
  for (const leitura of leituras) {
    if (leitura.ts < agora - JANELA_MS || leitura.ts > agora) continue;
    totalJanela++;
    if (ultimaLeituraTs === null || leitura.ts > ultimaLeituraTs) ultimaLeituraTs = leitura.ts;
    if (!porSensor.has(leitura.s)) porSensor.set(leitura.s, []);
    porSensor.get(leitura.s).push(leitura);
  }

  const previsoes = [];
  let sensoresRecentes = 0;
  let sensoresAnalisados = 0;
  for (const [sensor, pontos] of porSensor) {
    pontos.sort((a, b) => a.ts - b.ts);
    const atual = pontos[pontos.length - 1];
    if (agora - atual.ts > 15 * 60 * 1000) continue;
    sensoresRecentes++;
    if (pontos.length < MIN_LEITURAS || atual.ts - pontos[0].ts < MIN_INTERVALO_MS) continue;
    sensoresAnalisados++;
    const limites = limitesParaSensor(sensor) || {
      temperaturaMinima: TEMP_MIN, temperaturaMaxima: TEMP_MAX,
      umidadeMinima: UMID_MIN, umidadeMaxima: UMID_MAX
    };

    for (const faixa of [
      { chave: "t", grandeza: "temperatura", unidade: "°C", min: limites.temperaturaMinima, max: limites.temperaturaMaxima },
      { chave: "u", grandeza: "umidade", unidade: "%", min: limites.umidadeMinima, max: limites.umidadeMaxima }
    ]) {
      const valor = atual[faixa.chave];
      if (valor < faixa.min || valor > faixa.max) continue;

      const taxa = regressao(pontos, faixa.chave, atual.ts);
      let limite, tendencia;
      if (taxa > 0) { limite = faixa.max; tendencia = "alta"; }
      else if (taxa < 0) { limite = faixa.min; tendencia = "baixa"; }
      else continue;

      const horas = (limite - valor) / taxa;
      if (!(horas > 0 && horas <= HORIZONTE_H)) continue;

      previsoes.push({
        sensor, demonstracao: sensor.startsWith("demo-"),
        grandeza: faixa.grandeza, unidade: faixa.unidade, tendencia,
        valorAtual: Math.round(valor * 10) / 10, limite,
        horas: Math.round(horas * 10) / 10,
        previstoEm: new Date(atual.ts + horas * 3600000).toISOString()
      });
    }
  }

  previsoes.sort((a, b) => a.horas - b.horas || a.sensor.localeCompare(b.sensor));
  const status = !totalJanela ? "sem_leituras"
    : !sensoresRecentes ? "sem_dados_recentes"
      : !sensoresAnalisados ? "dados_insuficientes"
        : previsoes.length ? "previsoes" : "sem_tendencia";
  return {
    geradoEm: new Date(agora).toISOString(),
    janelaHoras: JANELA_MS / 3600000,
    horizonteHoras: HORIZONTE_H,
    status,
    leiturasNaJanela: totalJanela,
    sensoresRecentes,
    sensoresAnalisados,
    ultimaLeituraEm: ultimaLeituraTs === null ? null : new Date(ultimaLeituraTs).toISOString(),
    previsoes
  };
}

module.exports = preverCondicoes;
