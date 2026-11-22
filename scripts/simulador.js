"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const BASE = process.env.API || "http://localhost:3000";
let chave = process.env.SENSOR_API_KEY;
if (!chave) {
  try { chave = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "config.json"), "utf8")).chaveSensores; }
  catch { console.error("Não achei data/config.json. Ligue o servidor (node server.js) pelo menos uma vez."); process.exit(1); }
}
const SENSORES = Array.from({ length: 12 }, (_, i) => `sensor-${String(i + 1).padStart(2, "0")}`);
const ruido = amp => (Math.random() - 0.5) * 2 * amp;

/* Curva do dia: mais quente à tarde, mais úmido de manhã */
function valores(ts, indice) {
  const d = new Date(ts), hora = d.getHours() + d.getMinutes() / 60;
  const t = 25 + 5 * Math.sin((hora - 9) / 24 * 2 * Math.PI) + (indice - 6) * 0.08 + ruido(0.7);
  const u = 70 - (t - 25) * 2.4 + ruido(2);
  return { temperatura: Math.round(t * 10) / 10, umidade: Math.round(Math.min(95, Math.max(30, u))) };
}
async function enviar(lote) {
  const r = await fetch(BASE + "/api/leituras", {
    method: "POST", headers: { "Content-Type": "application/json", "x-api-key": chave }, body: JSON.stringify(lote)
  });
  const corpo = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${r.status}: ${corpo.erro || "erro"}`);
  return corpo;
}

async function historico(dias) {
  const passo = 30 * 60 * 1000, agora = Math.floor(Date.now() / passo) * passo;
  const lote = [];
  for (let ts = agora - dias * 24 * 3600 * 1000; ts <= agora; ts += passo)
    SENSORES.forEach((sensor, i) => lote.push({ sensor, momento: ts, ...valores(ts, i) }));
  let salvas = 0, ignoradas = 0;
  for (let i = 0; i < lote.length; i += 500) {
    const r = await enviar(lote.slice(i, i + 500)); salvas += r.salvas; ignoradas += r.ignoradas;
  }
  console.log(`Histórico de ${dias} dia(s): ${salvas} leituras salvas, ${ignoradas} já existiam.`);
}
async function aoVivo() {
  console.log("Enviando leituras a cada 20 s. Ctrl+C para parar.");
  const ATIVOS = process.argv[2] === "falha" ? SENSORES.slice(0, 10) : SENSORES;
  const ciclo = async () => {
    const ts = Date.now();
    try {
      const r = await enviar(ATIVOS.map((sensor, i) => ({ sensor, ...valores(ts, i) })));
      console.log(new Date().toLocaleTimeString(), "→", r.salvas, "leituras enviadas");
    } catch (e) { console.error("Falhou:", e.message); }
  };
  await ciclo(); setInterval(ciclo, 20000);
}

const [modo, arg] = process.argv.slice(2);
(modo === "historico" ? historico(Math.min(Math.max(parseInt(arg) || 3, 1), 30)) : aoVivo())
  .catch(e => { console.error("Erro:", e.message, "\nO servidor está ligado?"); process.exit(1); });
