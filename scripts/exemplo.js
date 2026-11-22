"use strict";
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const DIR = path.join(ROOT, "data");
fs.mkdirSync(DIR, { recursive: true });
const FUSO = process.env.FUSO || "America/Recife";
const OFFSET = process.env.FUSO_OFFSET || "-03:00";          // diferença do fuso em relação ao UTC
process.env.ALARME_OFFLINE_MIN = "15";                        // o motor usa 15 min para "sensor offline"

const fmtLocal = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
function partes(ts) {
  const o = {}; for (const p of fmtLocal.formatToParts(ts)) o[p.type] = p.value;
  return { d: `${o.year}-${o.month}-${o.day}`, h: `${o.hour}:${o.minute}` };
}
const p2 = n => String(n).padStart(2, "0");
function rng(seed) {                                          // números "aleatórios" repetíveis
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const rand = rng(20261010);

/* ---------- Situações de propósito ---------- */
const DIAS = ["2026-10-08", "2026-10-09", "2026-10-10"];
const EVENTOS = [   // dT = soma na temperatura, dU = soma na umidade, só nos sensores listados
  { dia: DIAS[0], de: "11:00", ate: "14:30", sensores: [3, 7, 8], dT: +5 },
  { dia: DIAS[1], de: "02:00", ate: "05:30", sensores: [1, 2],    dU: +18 },
  { dia: DIAS[1], de: "04:30", ate: "07:00", sensores: [5],       dT: -7 },
  { dia: DIAS[2], de: "11:30", ate: "13:30", sensores: [4, 9],    dT: +4.5 },
  { dia: DIAS[2], de: "12:00", ate: "13:00", sensores: [4],       dU: -24 },
  { dia: DIAS[2], de: "17:00", ate: "23:30", sensores: [10],      dT: +10 }
];
const LACUNAS = [   // sensor sem enviar nada nesse intervalo
  { dia: DIAS[0], de: "16:00", ate: "17:30", sensor: 11 },
  { dia: DIAS[1], de: "13:00", ate: "14:00", sensor: 12 }
];
const nome = n => `sensor-${p2(n)}`;
const dentro = (hhmm, de, ate) => hhmm >= de && hhmm <= ate;

function leitura(n, h, ts, ev) {
  const base = 25 + 4 * Math.sin((h - 9) / 24 * 2 * Math.PI) + (n - 6.5) * 0.06;
  let t = base + (rand() - 0.5) * 0.6;
  let u = 68 - (base - 25) * 2 + (rand() - 0.5) * 2.4;
  for (const e of ev) { if (e.dT) t += e.dT; if (e.dU) u += e.dU; }
  return { s: nome(n), ts, t: Math.round(t * 10) / 10, u: Math.round(Math.min(100, Math.max(0, u)) * 10) / 10 };
}

/* ---------- Gera as leituras e passa pelo motor de alarmes (numa pasta temporária) ---------- */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gw-exemplo-"));
const motor = require("../src/domain/alarmes")({ dir: tmp, partes });
const sens = new Map(), todas = [];

for (const dia of DIAS) for (let i = 0; i < 48; i++) {
  const hhmm = `${p2(Math.floor(i / 2))}:${i % 2 ? "30" : "00"}`;
  const ts = Date.parse(`${dia}T${hhmm}:00${OFFSET}`);
  const lote = [];
  for (let n = 1; n <= 12; n++) {
    if (LACUNAS.some(l => l.dia === dia && l.sensor === n && dentro(hhmm, l.de, l.ate))) continue;
    const ev = EVENTOS.filter(e => e.dia === dia && e.sensores.includes(n) && dentro(hhmm, e.de, e.ate));
    lote.push(leitura(n, i / 2, ts, ev));
  }
  lote.forEach(l => { todas.push(l); sens.set(l.s, { ts: l.ts }); });
  motor.processar(lote);
  motor.verificarSensores(sens, ts);                          // detecta sensores calados naquele momento
}

/* Leituras de "agora" (todos os sensores, menos o 10) para o painel não nascer com tudo offline */
const agora = Math.floor(Date.now() / (30 * 60 * 1000)) * 30 * 60 * 1000;
const hAgora = Number(partes(agora).h.slice(0, 2)) + Number(partes(agora).h.slice(3)) / 60;
const atuais = [];
for (let n = 1; n <= 12; n++) if (n !== 10) atuais.push(leitura(n, hAgora, agora, []));
atuais.forEach(l => todas.push(l));
motor.processar(atuais);

/* ---------- Grava nos arquivos reais ---------- */
const novosAlarmes = JSON.parse(fs.readFileSync(path.join(tmp, "alarmes.json"), "utf8")).map(a => ({ ...a, exemplo: true }));
const ARQ_AL = path.join(DIR, "alarmes.json");
let existentes = []; try { existentes = JSON.parse(fs.readFileSync(ARQ_AL, "utf8")); } catch {}
existentes = existentes.filter(a => !a.exemplo);              // remove exemplos de execuções anteriores
fs.writeFileSync(ARQ_AL + ".tmp", JSON.stringify(existentes.concat(novosAlarmes)));
fs.renameSync(ARQ_AL + ".tmp", ARQ_AL);

const ARQ_LE = path.join(DIR, "leituras.jsonl");
const jaTem = new Set();
if (fs.existsSync(ARQ_LE)) for (const linha of fs.readFileSync(ARQ_LE, "utf8").split("\n")) {
  if (!linha) continue; try { const x = JSON.parse(linha); jaTem.add(x.s + "|" + x.ts); } catch {}
}
const gravar = todas.filter(l => !jaTem.has(l.s + "|" + l.ts)).map(l => { const p = partes(l.ts); return JSON.stringify({ ...l, d: p.d, h: p.h }); });
if (gravar.length) fs.appendFileSync(ARQ_LE, gravar.join("\n") + "\n");
fs.rmSync(tmp, { recursive: true, force: true });

const ativos = novosAlarmes.filter(a => a.fim === null).length;
console.log(`Pronto: ${gravar.length} leituras novas e ${novosAlarmes.length} alarmes de exemplo (${ativos} ativos).`);
console.log("Agora ligue o servidor:  npm start");
