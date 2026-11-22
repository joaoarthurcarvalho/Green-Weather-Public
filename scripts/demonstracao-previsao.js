"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const DIR_DADOS = path.resolve(process.env.DATA_DIR || path.join(ROOT, "data"));
const BASE = process.env.API || "http://localhost:3000";
let chave = process.env.SENSOR_API_KEY;
if (!chave) {
  try { chave = JSON.parse(fs.readFileSync(path.join(DIR_DADOS, "config.json"), "utf8")).chaveSensores; }
  catch { console.error("Não achei a chave dos sensores. Inicie o servidor ao menos uma vez ou configure SENSOR_API_KEY."); process.exit(1); }
}

async function executar() {
  const agora = Date.now();
  const valores = [27.8, 28.2, 28.6, 29, 29.4];
  const leituras = valores.map((temperatura, indice) => ({
    sensor: "demo-previsao",
    momento: agora - (valores.length - 1 - indice) * 15 * 60 * 1000,
    temperatura,
    umidade: Math.round((65 - indice * 0.1) * 10) / 10
  }));
  const resposta = await fetch(BASE + "/api/leituras", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": chave },
    body: JSON.stringify(leituras)
  });
  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(`${resposta.status}: ${corpo.erro || "falha ao enviar leituras"}`);
  console.log(`Demonstração enviada: ${corpo.salvas} leituras simuladas no sensor demo-previsao.`);
  console.log("Os registros ficam no histórico e são identificados como dados demonstrativos.");
}

executar().catch(erro => {
  console.error("Não foi possível gerar a demonstração:", erro.message);
  process.exitCode = 1;
});
