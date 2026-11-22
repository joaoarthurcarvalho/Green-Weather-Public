"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

module.exports = function criarAlarmes({ dir, partes }) {
  const ARQ_LIMITES = path.join(dir, "limites-climaticos.json");
  const PADRAO = { temperaturaMinima: 20, temperaturaMaxima: 30, umidadeMinima: 50, umidadeMaxima: 80 };
  let limites = { ...PADRAO };
  if (fs.existsSync(ARQ_LIMITES)) {
    limites = { ...PADRAO, ...JSON.parse(fs.readFileSync(ARQ_LIMITES, "utf8")) };
    validarLimites(limites);
  }
  const LIM = {
    tMin: limites.temperaturaMinima, tMax: limites.temperaturaMaxima,
    uMin: limites.umidadeMinima, uMax: limites.umidadeMaxima,
    histT: 0.5, histU: 2,        // margem para encerrar o alarme (evita abrir/fechar sem parar na borda)
    offlineMs: (Number(process.env.ALARME_OFFLINE_MIN) || 15) * 60 * 1000
  };
  const TIPOS = {
    temperatura_alta:  { categoria: "ambiente", titulo: "Temperatura acima do ideal" },
    temperatura_baixa: { categoria: "ambiente", titulo: "Temperatura abaixo do ideal" },
    umidade_alta:      { categoria: "ambiente", titulo: "Umidade acima do ideal" },
    umidade_baixa:     { categoria: "ambiente", titulo: "Umidade abaixo do ideal" },
    sensor_offline:    { categoria: "sensor",   titulo: "Sensor sem comunicação" }
  };

  function validarLimites(v) {
    if (!v || !Number.isFinite(v.temperaturaMinima) || !Number.isFinite(v.temperaturaMaxima) ||
        !Number.isFinite(v.umidadeMinima) || !Number.isFinite(v.umidadeMaxima) ||
        v.temperaturaMinima < -50 || v.temperaturaMaxima > 100 ||
        v.temperaturaMinima >= v.temperaturaMaxima ||
        v.umidadeMinima < 0 || v.umidadeMaxima > 100 ||
        v.umidadeMinima >= v.umidadeMaxima)
      throw new Error("Limites climáticos inválidos.");
  }

  function configurarLimites(novos) {
    validarLimites(novos);
    const tmp = ARQ_LIMITES + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(novos, null, 2));
    fs.renameSync(tmp, ARQ_LIMITES);
    limites = { ...novos };
    LIM.tMin = novos.temperaturaMinima;
    LIM.tMax = novos.temperaturaMaxima;
    LIM.uMin = novos.umidadeMinima;
    LIM.uMax = novos.umidadeMaxima;
  }

  /* ---- armazenamento (arquivo JSON, gravado de forma atômica) ---- */
  const ARQ = path.join(dir, "alarmes.json");
  let lista = [];
  try { lista = JSON.parse(fs.readFileSync(ARQ, "utf8")); } catch {}
  let sujo = false;
  function salvar() {
    if (!sujo) return;
    const tmp = ARQ + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(lista));
    fs.renameSync(tmp, ARQ);
    sujo = false;
  }

  const abertos = new Map();      // "tipo|sensor" -> alarme ativo
  for (const a of lista) if (a.fim === null) abertos.set(a.tipo + "|" + a.sensor, a);
  const ultimoTs = new Map();     // sensor -> instante da última leitura já avaliada

  function abrir(tipo, sensor, ts, valor, limite) {
    const a = { id: crypto.randomUUID(), tipo, sensor, inicio: ts, fim: null, valor, pico: valor, limite };
    lista.push(a); abertos.set(tipo + "|" + sensor, a); sujo = true;
  }
  function fechar(tipo, sensor, ts) {
    const a = abertos.get(tipo + "|" + sensor);
    if (a) { a.fim = ts; abertos.delete(tipo + "|" + sensor); sujo = true; }
  }

  /* Avalia um valor (temperatura ou umidade) de um sensor */
  function avalia(sensor, ts, v, grandeza, min, max, hist) {
    const kAlta = grandeza + "_alta", kBaixa = grandeza + "_baixa";
    const aAlta = abertos.get(kAlta + "|" + sensor), aBaixa = abertos.get(kBaixa + "|" + sensor);
    if (v > max) {
      if (aBaixa) fechar(kBaixa, sensor, ts);
      if (!aAlta) abrir(kAlta, sensor, ts, v, max);
      else if (v > aAlta.pico) { aAlta.pico = v; sujo = true; }
    } else if (v < min) {
      if (aAlta) fechar(kAlta, sensor, ts);
      if (!aBaixa) abrir(kBaixa, sensor, ts, v, min);
      else if (v < aBaixa.pico) { aBaixa.pico = v; sujo = true; }
    } else {
      if (aAlta && v <= max - hist) fechar(kAlta, sensor, ts);
      if (aBaixa && v >= min + hist) fechar(kBaixa, sensor, ts);
    }
  }

  /* Chamado quando chegam leituras novas: [{ s, ts, t, u }] */
  function processar(leituras) {
    for (const l of [...leituras].sort((a, b) => a.ts - b.ts)) {
      if (l.ts <= (ultimoTs.get(l.s) || 0)) continue;      // ignora leituras mais antigas que a última avaliada
      ultimoTs.set(l.s, l.ts);
      fechar("sensor_offline", l.s, l.ts);                  // voltou a enviar → encerra o alarme de offline
      avalia(l.s, l.ts, l.t, "temperatura", LIM.tMin, LIM.tMax, LIM.histT);
      avalia(l.s, l.ts, l.u, "umidade", LIM.uMin, LIM.uMax, LIM.histU);
    }
    salvar();
  }

  /* Chamado de tempos em tempos: sensores calados viram alarme de offline */
  function verificarSensores(sensores, agora = Date.now()) {
    for (const [id, s] of sensores) {
      if (id.startsWith("demo-")) continue;
      if (agora - s.ts > LIM.offlineMs && !abertos.has("sensor_offline|" + id))
        abrir("sensor_offline", id, s.ts + LIM.offlineMs, null, null);
    }
    salvar();
  }

  /* ---- consulta para a API ---- */
  function descrever(a) {
    if (a.tipo === "sensor_offline") return `${a.sensor} parou de enviar leituras`;
    const un = a.tipo.startsWith("temperatura") ? " °C" : " %";
    const f = v => String(v).replace(".", ",") + un;
    return `${a.sensor}: ${a.tipo.endsWith("alta") ? "máxima" : "mínima"} de ${f(a.pico)} (limite ${f(a.limite)})`;
  }

  function consultar({ inicio, fim, inicioTs, tipo, categoria, limite = 100, sensores }) {
    const filtroSensores = sensores === undefined ? null : new Set(sensores);
    const filtrados = lista.filter(a => {
      const d = partes(a.inicio).d;
      return (!inicio || d >= inicio) && (!fim || d <= fim) &&
             (inicioTs === undefined || a.inicio >= inicioTs) &&
             (!filtroSensores || filtroSensores.has(a.sensor)) &&
             (!tipo || a.tipo === tipo) && (!categoria || TIPOS[a.tipo].categoria === categoria);
    });
    const porDia = {}, porTipo = {};
    for (const a of filtrados) {
      const d = partes(a.inicio).d;
      porDia[d] = (porDia[d] || 0) + 1;
      porTipo[a.tipo] = (porTipo[a.tipo] || 0) + 1;
    }
    const agora = Date.now();
    const alarmes = filtrados.sort((a, b) => b.inicio - a.inicio).slice(0, limite).map(a => {
      const pi = partes(a.inicio), pf = a.fim ? partes(a.fim) : null;
      return {
        id: a.id, tipo: a.tipo, categoria: TIPOS[a.tipo].categoria, titulo: TIPOS[a.tipo].titulo,
        sensor: a.sensor, descricao: descrever(a), ativo: a.fim === null,
        data: pi.d, hora: pi.h, fimData: pf ? pf.d : null, fimHora: pf ? pf.h : null,
        duracaoMin: Math.max(0, Math.round(((a.fim || agora) - a.inicio) / 60000))
      };
    });
    return { total: filtrados.length, ativos: filtrados.filter(a => a.fim === null).length,
             ativosAgora: filtroSensores
               ? lista.filter(a => a.fim === null && filtroSensores.has(a.sensor)).length
               : abertos.size,
             porDia, porTipo, alarmes };
  }

  return {
    processar, verificarSensores, consultar,
    obterLimites: () => ({ ...limites }),
    configurarLimites
  };
};
