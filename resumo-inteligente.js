"use strict";

const LEITURAS_MINIMAS_TENDENCIA = 2;

function media(valores) {
  return valores.reduce((total, valor) => total + valor, 0) / valores.length;
}

function variacaoRecentes(leituras, chave) {
  const ordenadas = [...leituras].sort((a, b) => a.ts - b.ts);
  if (ordenadas.length < LEITURAS_MINIMAS_TENDENCIA) return null;
  const metade = Math.floor(ordenadas.length / 2);
  const anterior = media(ordenadas.slice(0, metade).map(leitura => leitura[chave]));
  const recente = media(ordenadas.slice(-metade).map(leitura => leitura[chave]));
  return Math.round((recente - anterior) * 10) / 10;
}

function formatar(valor) {
  return Number(valor).toFixed(1).replace(".", ",");
}

function descreverVariacao(nome, variacao, unidade, margem) {
  if (variacao === null) return null;
  if (variacao > margem) return `${nome} subiu ${formatar(variacao)} ${unidade} no período.`;
  if (variacao < -margem) return `${nome} caiu ${formatar(Math.abs(variacao))} ${unidade} no período.`;
  return `${nome} permaneceu estável no período.`;
}

function criarResumo({ leituras, alarmes, sensores, agora = Date.now() }) {
  const sensoresLidos = new Set(leituras.map(leitura => leitura.s));
  const destaques = [];
  const temperaturas = leituras.map(leitura => leitura.t);
  const umidades = leituras.map(leitura => leitura.u);
  const tempMedia = temperaturas.length ? media(temperaturas) : null;
  const umidMedia = umidades.length ? media(umidades) : null;
  const variacaoT = variacaoRecentes(leituras, "t");
  const variacaoU = variacaoRecentes(leituras, "u");
  const online = sensores.filter(sensor => sensor.online).length;
  const offline = sensores.length - online;
  const ativos = alarmes.ativosAgora || 0;
  const recentes = alarmes.total || 0;

  if (leituras.length) {
    destaques.push({
      tipo: "neutro",
      texto: `${leituras.length} leitura(s) de ${sensoresLidos.size} sensor(es) nas últimas 24 horas.`
    });
    destaques.push({
      tipo: "neutro",
      texto: `Médias do período: ${formatar(tempMedia)} °C e ${formatar(umidMedia)}% de umidade.`
    });
    const textoT = descreverVariacao("A temperatura", variacaoT, "°C", 0.5);
    const textoU = descreverVariacao("A umidade", variacaoU, "%", 2);
    if (textoT) destaques.push({ tipo: "neutro", texto: textoT });
    if (textoU) destaques.push({ tipo: "neutro", texto: textoU });
  } else {
    destaques.push({
      tipo: "aviso",
      texto: "Nenhuma leitura foi recebida nas últimas 24 horas; não é possível resumir as condições ambientais."
    });
  }

  if (ativos) {
    destaques.push({ tipo: "aviso", texto: `${ativos} alarme(s) está(ão) ativo(s) agora.` });
  } else if (recentes) {
    destaques.push({ tipo: "sucesso", texto: `Sem alarmes ativos agora; ${recentes} registro(s) de alarme nas últimas 24 horas.` });
  } else {
    destaques.push({ tipo: "sucesso", texto: "Nenhum alarme registrado nas últimas 24 horas." });
  }

  if (offline) {
    destaques.push({ tipo: "aviso", texto: `${offline} de ${sensores.length} sensor(es) sem comunicação recente.` });
  } else if (sensores.length) {
    destaques.push({ tipo: "sucesso", texto: `Todos os ${online} sensor(es) cadastrados estão online.` });
  }

  let resumo;
  if (!leituras.length) {
    resumo = ativos
      ? `Há ${ativos} alarme(s) ativo(s), mas faltam leituras recentes para avaliar as condições ambientais.`
      : "Ainda não há leituras ambientais recentes para resumir.";
  } else {
    resumo = `Nas últimas 24 horas, foram analisadas ${leituras.length} leituras de ${sensoresLidos.size} sensor(es). A temperatura média foi ${formatar(tempMedia)} °C e a umidade média foi ${formatar(umidMedia)}%. `;
    resumo += ativos
      ? `Há ${ativos} alarme(s) ativo(s) no momento.`
      : recentes
        ? `Não há alarmes ativos; ${recentes} alarme(s) foram registrados no período.`
        : "Nenhum alarme foi registrado no período.";
  }

  return {
    geradoEm: new Date(agora).toISOString(),
    janelaHoras: 24,
    status: leituras.length ? "com_dados" : "sem_leituras",
    leiturasAnalisadas: leituras.length,
    sensoresAnalisados: sensoresLidos.size,
    resumo,
    destaques
  };
}

module.exports = criarResumo;
