"use strict";
const http   = require("node:http");
const fs     = require("node:fs");
const path   = require("node:path");
const crypto = require("node:crypto");
const { promisify } = require("node:util");
const scrypt = promisify(crypto.scrypt);
const preverCondicoes = require("./previsao");
const criarResumoInteligente = require("./resumo-inteligente");

/* ---------- Configuração ---------- */
const PORTA       = Number(process.env.PORT) || 3000;
const FUSO        = process.env.FUSO || "America/Recife";
const HTTPS       = process.env.HTTPS === "1";
const SESSAO_MS   = 7 * 24 * 3600 * 1000;
const ONLINE_MS   = 15 * 60 * 1000;
const DIR_DADOS   = path.resolve(process.env.DATA_DIR || path.join(__dirname, "data"));
const DIR_PUBLICO = path.join(__dirname, "public");
const ATALHOS_PAGINAS = new Map([
  ["/login.html", "/html/login.html"],
  ["/dashboard.html", "/html/dashboard.html"],
  ["/historico.html", "/html/historico.html"],
  ["/configuracoes.html", "/html/configuracoes.html"],
  ["/funcionarios.html", "/html/funcionarios.html"],
  ["/propriedades.html", "/html/propriedades.html"],
  ["/relatorios.html", "/html/relatorios.html"],
  ["/cadastro.html", "/html/login.html"]
]);
fs.mkdirSync(DIR_DADOS, { recursive: true });

/* ---------- Chave que os sensores usam para enviar dados ---------- */
const ARQ_CONFIG = path.join(DIR_DADOS, "config.json");
function salvarConfig() {
  const tmp = ARQ_CONFIG + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(config, null, 2));
  fs.renameSync(tmp, ARQ_CONFIG);
}
let config = {};
try {
  const lida = JSON.parse(fs.readFileSync(ARQ_CONFIG, "utf8"));
  if (lida && typeof lida === "object" && !Array.isArray(lida)) config = lida;
} catch {}
let chaveSensores = process.env.SENSOR_API_KEY || config.chaveSensores || "";
let configAlterada = false;
if (!chaveSensores) {
  chaveSensores = "gw_" + crypto.randomBytes(16).toString("hex");
  config.chaveSensores = chaveSensores;
  configAlterada = true;
}
if (typeof config.segredoSenhaDiaria !== "string" || !/^[a-f\d]{64}$/i.test(config.segredoSenhaDiaria)) {
  config.segredoSenhaDiaria = crypto.randomBytes(32).toString("hex");
  configAlterada = true;
}
if (configAlterada || !fs.existsSync(ARQ_CONFIG)) {
  salvarConfig();
}
let segredoSenhaDiaria = config.segredoSenhaDiaria;

/* ---------- Usuários e sessões (arquivo JSON) ---------- */
const ARQ_DB = path.join(DIR_DADOS, "usuarios.json");
let db = { usuarios: [], sessoes: [] };
try { db = { ...db, ...JSON.parse(fs.readFileSync(ARQ_DB, "utf8")) }; } catch {}
const ARQ_PROPRIEDADES = path.join(DIR_DADOS, "propriedades.json");
let propriedades = [];
try { propriedades = JSON.parse(fs.readFileSync(ARQ_PROPRIEDADES, "utf8")); } catch {}
const ARQ_RELATORIOS = path.join(DIR_DADOS, "relatorios-tecnicos.json");
let relatoriosSalvos = [];
if (fs.existsSync(ARQ_RELATORIOS)) {
  relatoriosSalvos = JSON.parse(fs.readFileSync(ARQ_RELATORIOS, "utf8"));
  if (!Array.isArray(relatoriosSalvos)) throw new Error("Arquivo de relatórios técnicos inválido.");
}
function salvarDb() {
  const tmp = ARQ_DB + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, ARQ_DB);
}
function salvarPropriedades() {
  const tmp = ARQ_PROPRIEDADES + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(propriedades, null, 2));
  fs.renameSync(tmp, ARQ_PROPRIEDADES);
}
function salvarRelatorios() {
  const tmp = ARQ_RELATORIOS + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(relatoriosSalvos, null, 2));
  fs.renameSync(tmp, ARQ_RELATORIOS);
}
function limparSessoes() {
  const antes = db.sessoes.length;
  db.sessoes = db.sessoes.filter(s => s.expira > Date.now());
  if (db.sessoes.length !== antes) salvarDb();
}
limparSessoes();
setInterval(limparSessoes, 3600 * 1000).unref();

/* ---------- Leituras dos sensores ---------- */
const ARQ_LEIT = path.join(DIR_DADOS, "leituras.jsonl");
const porDia   = new Map();
const sensores = new Map();
const vistos   = new Set();
const recentesPrevisao = [];
const leiturasRecentesResumo = [];
let ultimaLimpezaPrevisao = 0;

const fmtLocal = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23"
});
function partes(ts) {
  const o = {};
  for (const p of fmtLocal.formatToParts(ts)) o[p.type] = p.value;
  return { d: `${o.year}-${o.month}-${o.day}`, h: `${o.hour}:${o.minute}` };
}
function senhaDoDia() {
  const data = partes(Date.now()).d;
  const senha = crypto.createHmac("sha256", segredoSenhaDiaria)
    .update(`green-weather-senha-diaria:${data}`).digest("hex").slice(0, 10).toUpperCase();
  return { data, senha };
}
function confereSenhaDoDia(senhaInformada) {
  const atual = Buffer.from(senhaDoDia().senha);
  const informada = Buffer.from(String(senhaInformada || "").trim().toUpperCase());
  return informada.length === atual.length && crypto.timingSafeEqual(informada, atual);
}
function indexar(l) {
  vistos.add(l.s + "|" + l.ts);
  if (!porDia.has(l.d)) porDia.set(l.d, []);
  porDia.get(l.d).push(l);
  const agora = Date.now();
  if (l.ts >= agora - 6 * 60 * 60 * 1000 && l.ts <= agora) recentesPrevisao.push(l);
  if (l.ts >= agora - 24 * 60 * 60 * 1000 && l.ts <= agora) leiturasRecentesResumo.push(l);
  if (agora - ultimaLimpezaPrevisao >= 5 * 60 * 1000) {
    const inicio = agora - 6 * 60 * 60 * 1000;
    for (let i = recentesPrevisao.length - 1; i >= 0; i--)
      if (recentesPrevisao[i].ts < inicio || recentesPrevisao[i].ts > agora) recentesPrevisao.splice(i, 1);
    const inicioResumo = agora - 24 * 60 * 60 * 1000;
    for (let i = leiturasRecentesResumo.length - 1; i >= 0; i--)
      if (leiturasRecentesResumo[i].ts < inicioResumo || leiturasRecentesResumo[i].ts > agora) leiturasRecentesResumo.splice(i, 1);
    ultimaLimpezaPrevisao = agora;
  }
  const s = sensores.get(l.s);
  if (!s || l.ts >= s.ts) sensores.set(l.s, { ts: l.ts, t: l.t, u: l.u });
}
if (fs.existsSync(ARQ_LEIT)) {
  for (const linha of fs.readFileSync(ARQ_LEIT, "utf8").split("\n")) {
    if (!linha) continue;
    try { indexar(JSON.parse(linha)); } catch {}
  }
}

/* ---------- Alarmes ---------- */
const alarmes = require("./alarmes")({ dir: DIR_DADOS, partes });
alarmes.verificarSensores(sensores);
setInterval(() => alarmes.verificarSensores(sensores), 60 * 1000).unref();

/* ---------- Utilidades ---------- */
class ErroHttp extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const sha256    = s => crypto.createHash("sha256").update(s).digest("hex");
const normEmail = e => String(e || "").trim().toLowerCase();
const emailOk   = e => /^\S+@\S+\.\S+$/.test(e) && e.length <= 120;
const textoOk   = (v, max) => typeof v === "string" && v.trim().length > 0 && v.trim().length <= max;
const senhaOk   = s => typeof s === "string" && s.length >= 6 && s.length <= 200;
const publico   = u => ({
  nome: u.nome, sobrenome: u.sobrenome, email: u.email,
  papel: u.papel || "funcionario", matricula: u.matricula || null,
  ativo: u.ativo !== false
});

async function hashSenha(senha) {
  const sal = crypto.randomBytes(16);
  const h = await scrypt(senha, sal, 64);
  return sal.toString("hex") + ":" + h.toString("hex");
}
async function confereSenha(senha, guardado) {
  const [sal, h] = guardado.split(":");
  const calc = await scrypt(senha, Buffer.from(sal, "hex"), 64);
  const orig = Buffer.from(h, "hex");
  return calc.length === orig.length && crypto.timingSafeEqual(calc, orig);
}
const HASH_FALSO = hashSenha("senha-falsa");

function enviar(res, status, corpo, cabecalhos = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...cabecalhos
  });
  res.end(JSON.stringify(corpo));
}
function lerCorpo(req, limite = 1_000_000) {
  return new Promise((ok, falha) => {
    const blocos = []; let tam = 0, estourou = false;
    req.on("data", c => { tam += c.length; if (tam > limite) estourou = true; else blocos.push(c); });
    req.on("end", () => {
      if (estourou) return falha(new ErroHttp(413, "Corpo da requisição grande demais."));
      if (!blocos.length) return ok({});
      try { ok(JSON.parse(Buffer.concat(blocos).toString("utf8"))); }
      catch { falha(new ErroHttp(400, "JSON inválido.")); }
    });
    req.on("error", falha);
  });
}
function cookies(req) {
  const o = {};
  for (const par of (req.headers.cookie || "").split(";")) {
    const i = par.indexOf("=");
    if (i > 0) { try { o[par.slice(0, i).trim()] = decodeURIComponent(par.slice(i + 1).trim()); } catch {} }
  }
  return o;
}
const cookieSessao = (token, seg) =>
  `gw_sid=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${seg}${HTTPS ? "; Secure" : ""}`;

function criarSessao(req, usuario) {
  const token = crypto.randomBytes(32).toString("hex");
  db.sessoes.push({ id: sha256(token), usuario: usuario.id, expira: Date.now() + SESSAO_MS,
                    ua: String(req.headers["user-agent"] || "").slice(0, 120) });
  salvarDb();
  return token;
}
function sessaoAtual(req) {
  const t = cookies(req).gw_sid;
  if (!t) return null;
  const id = sha256(t);
  const sessao = db.sessoes.find(s => s.id === id);
  if (!sessao || sessao.expira < Date.now()) return null;
  const usuario = db.usuarios.find(u => u.id === sessao.usuario);
  return usuario && usuario.ativo !== false ? { sessao, usuario } : null;
}
function exigir(req) {
  const a = sessaoAtual(req);
  if (!a) throw new ErroHttp(401, "Sessão expirada. Faça login novamente.");
  return a;
}
function exigirPapel(req, papel) {
  const acesso = exigir(req);
  const permitidos = Array.isArray(papel) ? papel : [papel];
  if (!permitidos.includes(acesso.usuario.papel)) throw new ErroHttp(403, "Você não tem permissão para acessar este recurso.");
  return acesso;
}

function gerarMatricula() {
  let matricula;
  do {
    matricula = `GW-${new Date().getFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  } while (db.usuarios.some(usuario => usuario.matricula === matricula));
  return matricula;
}

async function prepararSuperAdmin() {
  if (db.usuarios.some(usuario => usuario.papel === "superadmin")) return;

  const nome = process.env.SUPERADMIN_NAME;
  const email = normEmail(process.env.SUPERADMIN_EMAIL);
  const senha = process.env.SUPERADMIN_PASSWORD;
  if (!nome && !email && !senha) {
    console.warn("Superadministrador não configurado. Defina SUPERADMIN_NAME, SUPERADMIN_EMAIL e SUPERADMIN_PASSWORD.");
    return;
  }
  if (!textoOk(nome, 120) || !emailOk(email) || !senhaOk(senha))
    throw new Error("Configuração de superadmin inválida: informe nome, e-mail válido e senha com pelo menos 6 caracteres.");
  if (db.usuarios.some(usuario => usuario.email === email))
    throw new Error("O e-mail definido para o superadmin já pertence a outra conta.");

  const nomes = nome.trim().split(/\s+/);
  db.usuarios.push({
    id: crypto.randomUUID(),
    nome: nomes.shift(),
    sobrenome: nomes.join(" ") || "Administrador",
    email,
    senha: await hashSenha(senha),
    papel: "superadmin",
    matricula: gerarMatricula()
  });
  salvarDb();
  console.log("Superadministrador inicial criado com sucesso.");
}

/* Limite de tentativas de login: 8 a cada 15 minutos por IP + e-mail */
const tentativas = new Map();
function registroTentativas(req, email) {
  const chave = (req.socket.remoteAddress || "") + "|" + email, agora = Date.now();
  let r = tentativas.get(chave);
  if (!r || r.ate < agora) { r = { n: 0, ate: agora + 15 * 60 * 1000 }; tentativas.set(chave, r); }
  if (r.n >= 8) throw new ErroHttp(429, "Muitas tentativas. Tente novamente em alguns minutos.");
  return { r, chave };
}

/* ---------- Rotas da API ---------- */
const dataOk = s => /^\d{4}-\d{2}-\d{2}$/.test(s || "");
function validarPeriodoRelatorio(inicio, fim) {
  if (!dataOk(inicio) || !dataOk(fim))
    throw new ErroHttp(400, "Informe as datas inicial e final no formato AAAA-MM-DD.");
  if (inicio > fim) throw new ErroHttp(400, "A data inicial não pode ser maior que a final.");
}
function propriedadesPorSensor() {
  const mapa = new Map();
  for (const propriedade of propriedades) {
    for (const sensor of Array.isArray(propriedade.sensores) ? propriedade.sensores : []) {
      if (!mapa.has(sensor)) mapa.set(sensor, propriedade);
    }
  }
  return mapa;
}
function sensoresPermitidos(usuario) {
  if (usuario.papel === "superadmin") return new Set(sensores.keys());
  // Sensores pertencem ao responsável da propriedade à qual estão vinculados.
  const mapa = propriedadesPorSensor();
  return new Set([...mapa].filter(([, propriedade]) => propriedade.responsavel === usuario.id)
    .map(([sensor]) => sensor));
}
function validarSensorPermitido(sensor, permitidos) {
  if (sensor && !permitidos.has(sensor))
    throw new ErroHttp(404, "Sensor não encontrado.");
}
function criarDadosRelatorio(inicio, fim, usuario) {
  const permitidos = sensoresPermitidos(usuario);
  const leiturasPeriodo = [...porDia.entries()]
    .filter(([data]) => data >= inicio && data <= fim)
    .flatMap(([, leiturasDia]) => leiturasDia)
    .filter(leitura => !leitura.s.startsWith("demo-") && permitidos.has(leitura.s));
  const extremum = (campo, comparar) => leiturasPeriodo.reduce((atual, leitura) =>
    !atual || comparar(leitura[campo], atual.valor)
      ? { valor: leitura[campo], sensor: leitura.s, data: leitura.d, hora: leitura.h }
      : atual, null);
  const soma = campo => leiturasPeriodo.reduce((total, leitura) => total + leitura[campo], 0);
  const limites = alarmes.obterLimites();
  const dadosAlarmes = alarmes.consultar({ inicio, fim, limite: 0, sensores: [...permitidos] });
  return {
    inicio, fim, geradoEm: new Date().toISOString(), limites,
    resumo: {
      leituras: leiturasPeriodo.length,
      sensores: new Set(leiturasPeriodo.map(l => l.s)).size,
      temperaturaMedia: leiturasPeriodo.length ? Math.round(soma("t") / leiturasPeriodo.length * 10) / 10 : null,
      umidadeMedia: leiturasPeriodo.length ? Math.round(soma("u") / leiturasPeriodo.length * 10) / 10 : null,
      leiturasForaTemperatura: leiturasPeriodo.filter(l =>
        l.t < limites.temperaturaMinima || l.t > limites.temperaturaMaxima).length,
      leiturasForaUmidade: leiturasPeriodo.filter(l =>
        l.u < limites.umidadeMinima || l.u > limites.umidadeMaxima).length,
      temperaturaMinima: extremum("t", (a, b) => a < b),
      temperaturaMaxima: extremum("t", (a, b) => a > b),
      umidadeMinima: extremum("u", (a, b) => a < b),
      umidadeMaxima: extremum("u", (a, b) => a > b)
    },
    alarmes: { total: dadosAlarmes.total, ativos: dadosAlarmes.ativos, porTipo: dadosAlarmes.porTipo }
  };
}
const rotas = {
  "POST /api/login": async (req, res) => {
    const b = await lerCorpo(req, 20_000), email = normEmail(b.email);
    const { r, chave } = registroTentativas(req, email);
    const u = db.usuarios.find(x => x.email === email);
    const ok = u && typeof b.senha === "string"
      ? await confereSenha(b.senha, u.senha)
      : (await confereSenha(String(b.senha || ""), await HASH_FALSO), false);
    if (!ok || u.ativo === false) { r.n++; throw new ErroHttp(401, "E-mail ou senha incorretos."); }
    if (u.papel !== "superadmin" && typeof b.senhaDoDia !== "string") {
      enviar(res, 202, { etapa: "senha_diaria" });
      return;
    }
    if (u.papel !== "superadmin" && !confereSenhaDoDia(b.senhaDoDia)) {
      r.n++;
      throw new ErroHttp(401, "E-mail, senha ou senha do dia incorretos.");
    }
    tentativas.delete(chave);
    const token = criarSessao(req, u);
    enviar(res, 200, { usuario: publico(u) }, { "Set-Cookie": cookieSessao(token, SESSAO_MS / 1000) });
  },

  "POST /api/logout": async (req, res) => {
    const a = sessaoAtual(req);
    if (a) { db.sessoes = db.sessoes.filter(s => s.id !== a.sessao.id); salvarDb(); }
    enviar(res, 200, { ok: true }, { "Set-Cookie": cookieSessao("", 0) });
  },

  "GET /api/me": async (req, res) => {
    enviar(res, 200, { usuario: publico(exigir(req).usuario) });
  },

  "GET /api/limites-climaticos": async (req, res) => {
    exigir(req);
    enviar(res, 200, { limites: alarmes.obterLimites() });
  },

  "PUT /api/limites-climaticos": async (req, res) => {
    exigirPapel(req, ["engenheiro", "superadmin"]);
    const b = await lerCorpo(req, 20_000);
    const campos = ["temperaturaMinima", "temperaturaMaxima", "umidadeMinima", "umidadeMaxima"];
    if (!b || typeof b !== "object" || Array.isArray(b) ||
        campos.some(campo => typeof b[campo] !== "number" || !Number.isFinite(b[campo])))
      throw new ErroHttp(400, "Informe os quatro limites climáticos como números.");
    const limites = Object.fromEntries(campos.map(campo => [campo, b[campo]]));
    if (
        limites.temperaturaMinima < -50 || limites.temperaturaMaxima > 100 ||
        limites.temperaturaMinima >= limites.temperaturaMaxima ||
        limites.umidadeMinima < 0 || limites.umidadeMaxima > 100 ||
        limites.umidadeMinima >= limites.umidadeMaxima)
      throw new ErroHttp(400, "Informe faixas válidas: temperatura de -50 a 100 °C e umidade de 0 a 100%, com mínimo menor que máximo.");
    alarmes.configurarLimites(limites);
    enviar(res, 200, { limites: alarmes.obterLimites() });
  },

  "GET /api/relatorio-tecnico": async (req, res, url) => {
    const { usuario } = exigirPapel(req, ["engenheiro", "superadmin"]);
    const inicio = url.searchParams.get("inicio"), fim = url.searchParams.get("fim");
    validarPeriodoRelatorio(inicio, fim);
    enviar(res, 200, criarDadosRelatorio(inicio, fim, usuario));
  },

  "GET /api/relatorios-tecnicos": async (req, res) => {
    const { usuario } = exigirPapel(req, ["engenheiro", "superadmin"]);
    enviar(res, 200, {
      relatorios: relatoriosSalvos
        .filter(relatorio => relatorio.usuarioId === usuario.id)
        .map(relatorio => ({
          ...criarDadosRelatorio(relatorio.inicio, relatorio.fim, usuario),
          id: relatorio.id,
          usuarioId: relatorio.usuarioId,
          geradoEm: relatorio.geradoEm,
          observacoes: relatorio.observacoes || ""
        }))
        .sort((a, b) => b.geradoEm.localeCompare(a.geradoEm))
    });
  },

  "POST /api/relatorios-tecnicos": async (req, res) => {
    const { usuario } = exigirPapel(req, ["engenheiro", "superadmin"]);
    const b = await lerCorpo(req, 20_000);
    if (!b || typeof b !== "object" || Array.isArray(b) ||
        typeof b.inicio !== "string" || typeof b.fim !== "string" ||
        (b.observacoes !== undefined && typeof b.observacoes !== "string"))
      throw new ErroHttp(400, "Informe o período e as observações do relatório.");
    const observacoes = b.observacoes || "";
    if (observacoes.length > 2000)
      throw new ErroHttp(400, "As observações devem ter no máximo 2000 caracteres.");
    validarPeriodoRelatorio(b.inicio, b.fim);

    const relatorio = {
      id: crypto.randomUUID(),
      usuarioId: usuario.id,
      ...criarDadosRelatorio(b.inicio, b.fim, usuario),
      observacoes
    };
    relatoriosSalvos.push(relatorio);
    salvarRelatorios();
    enviar(res, 201, { relatorio });
  },

  "GET /api/funcionarios": async (req, res) => {
    exigirPapel(req, "superadmin");
    enviar(res, 200, {
      funcionarios: db.usuarios.map(usuario => ({
        ...publico(usuario), id: usuario.id
      }))
    });
  },

  "GET /api/funcionarios/senha-do-dia": async (req, res) => {
    exigirPapel(req, "superadmin");
    enviar(res, 200, senhaDoDia());
  },

  "POST /api/funcionarios/senha-do-dia": async (req, res) => {
    exigirPapel(req, "superadmin");
    const segredoAnterior = config.segredoSenhaDiaria;
    const novoSegredo = crypto.randomBytes(32).toString("hex");
    config.segredoSenhaDiaria = novoSegredo;
    try {
      salvarConfig();
    } catch (erro) {
      config.segredoSenhaDiaria = segredoAnterior;
      throw erro;
    }
    segredoSenhaDiaria = novoSegredo;
    enviar(res, 200, senhaDoDia());
  },

  "POST /api/funcionarios": async (req, res) => {
    exigirPapel(req, "superadmin");
    const b = await lerCorpo(req, 20_000);
    if (!b || typeof b !== "object" || Array.isArray(b))
      throw new ErroHttp(400, "Dados do funcionário inválidos.");
    const email = normEmail(b.email);
    if (!textoOk(b.nome, 120) || !emailOk(email))
      throw new ErroHttp(400, "Informe nome completo e e-mail válido.");
    if (!senhaOk(b.senha)) throw new ErroHttp(400, "A senha precisa ter pelo menos 6 caracteres.");
    if (!["funcionario", "engenheiro"].includes(b.papel))
      throw new ErroHttp(400, "Selecione um perfil de funcionário válido.");
    if (db.usuarios.some(usuario => usuario.email === email))
      throw new ErroHttp(409, "Este e-mail já está cadastrado.");

    const nomes = b.nome.trim().split(/\s+/);
    const usuario = {
      id: crypto.randomUUID(),
      nome: nomes.shift(),
      sobrenome: nomes.join(" ") || "Funcionário",
      email,
      senha: await hashSenha(b.senha),
      papel: b.papel,
      ativo: true,
      matricula: gerarMatricula()
    };
    db.usuarios.push(usuario);
    salvarDb();
    enviar(res, 201, { funcionario: publico(usuario) });
  },

  "PATCH /api/funcionarios": async (req, res) => {
    exigirPapel(req, "superadmin");
    const b = await lerCorpo(req, 20_000);
    if (!b || typeof b !== "object" || Array.isArray(b) ||
        typeof b.id !== "string" || typeof b.ativo !== "boolean")
      throw new ErroHttp(400, "Informe a conta e o novo status.");
    const usuario = db.usuarios.find(conta => conta.id === b.id);
    if (!usuario) throw new ErroHttp(404, "Conta não encontrada.");
    if (usuario.papel === "superadmin")
      throw new ErroHttp(403, "Contas de superadmin não podem ser alteradas por esta tela.");

    usuario.ativo = b.ativo;
    if (!b.ativo) db.sessoes = db.sessoes.filter(sessao => sessao.usuario !== usuario.id);
    salvarDb();
    enviar(res, 200, { funcionario: publico(usuario) });
  },

  "DELETE /api/funcionarios": async (req, res) => {
    exigirPapel(req, "superadmin");
    const b = await lerCorpo(req, 20_000);
    if (!b || typeof b !== "object" || Array.isArray(b) || typeof b.id !== "string")
      throw new ErroHttp(400, "Informe uma conta válida para excluir.");
    const indice = db.usuarios.findIndex(usuario => usuario.id === b.id);
    if (indice === -1) throw new ErroHttp(404, "Conta não encontrada.");
    if (db.usuarios[indice].papel === "superadmin")
      throw new ErroHttp(403, "Contas de superadmin não podem ser excluídas por esta tela.");

    const [usuario] = db.usuarios.splice(indice, 1);
    db.sessoes = db.sessoes.filter(sessao => sessao.usuario !== usuario.id);
    salvarDb();
    enviar(res, 200, { ok: true });
  },

  "GET /api/propriedades": async (req, res) => {
    const { usuario } = exigirPapel(req, ["engenheiro", "superadmin"]);
    enviar(res, 200, {
      propriedades: propriedades
        .filter(propriedade => usuario.papel === "superadmin" || propriedade.responsavel === usuario.id)
        .map(propriedade => ({
          ...propriedade,
          sensores: Array.isArray(propriedade.sensores) ? propriedade.sensores : []
        }))
        .sort((a, b) => b.criadaEm.localeCompare(a.criadaEm))
    });
  },

  "POST /api/propriedades": async (req, res) => {
    const { usuario } = exigirPapel(req, ["engenheiro", "superadmin"]);
    const b = await lerCorpo(req, 20_000);
    if (!b || typeof b !== "object" || Array.isArray(b))
      throw new ErroHttp(400, "Dados da propriedade inválidos.");
    const nome = typeof b.nome === "string" ? b.nome.trim() : "";
    const municipio = typeof b.municipio === "string" ? b.municipio.trim() : "";
    const uf = typeof b.uf === "string" ? b.uf.trim().toUpperCase() : "";
    const areaHa = Number(b.areaHa);
    if (!textoOk(nome, 120) || !textoOk(municipio, 100) || !/^[A-Z]{2}$/.test(uf) ||
        !Number.isFinite(areaHa) || areaHa <= 0 || areaHa > 10_000_000)
      throw new ErroHttp(400, "Informe nome, município, UF e uma área válida em hectares.");

    const propriedade = {
      id: crypto.randomUUID(), nome, municipio, uf, areaHa,
      responsavel: usuario.id, criadaEm: new Date().toISOString()
    };
    propriedades.push(propriedade);
    salvarPropriedades();
    enviar(res, 201, { propriedade });
  },

  "PATCH /api/propriedades": async (req, res) => {
    const { usuario } = exigirPapel(req, ["engenheiro", "superadmin"]);
    const b = await lerCorpo(req, 20_000);
    if (!b || typeof b !== "object" || Array.isArray(b) ||
        typeof b.id !== "string" || !textoOk(b.nome, 120) ||
        typeof b.areaHa !== "number" || !Number.isFinite(b.areaHa) ||
        b.areaHa <= 0 || b.areaHa > 10_000_000)
      throw new ErroHttp(400, "Informe uma propriedade, um nome e uma área válidos.");
    if (b.sensores !== undefined && usuario.papel !== "superadmin")
      throw new ErroHttp(403, "Somente o superadmin pode atribuir sensores às propriedades.");
    if (b.sensores !== undefined &&
        (!Array.isArray(b.sensores) || b.sensores.length > sensores.size ||
         b.sensores.some(sensor => typeof sensor !== "string" || !sensores.has(sensor)) ||
         new Set(b.sensores).size !== b.sensores.length))
      throw new ErroHttp(400, "A lista de sensores é inválida.");

    const propriedade = propriedades.find(item => item.id === b.id);
    if (!propriedade || (usuario.papel !== "superadmin" && propriedade.responsavel !== usuario.id))
      throw new ErroHttp(404, "Propriedade não encontrada.");

    const estadoAnterior = propriedades.map(item => ({
      nome: item.nome,
      areaHa: item.areaHa,
      sensores: Array.isArray(item.sensores) ? [...item.sensores] : undefined
    }));
    try {
      propriedade.nome = b.nome.trim();
      propriedade.areaHa = b.areaHa;
      if (b.sensores !== undefined) {
        const sensoresDesejados = new Set(b.sensores);
        for (const item of propriedades) {
          if (item === propriedade) item.sensores = [...b.sensores];
          else if (Array.isArray(item.sensores))
            item.sensores = item.sensores.filter(sensor => !sensoresDesejados.has(sensor));
        }
      }
      salvarPropriedades();
    } catch (erro) {
      propriedades.forEach((item, indice) => {
        item.nome = estadoAnterior[indice].nome;
        item.areaHa = estadoAnterior[indice].areaHa;
        if (estadoAnterior[indice].sensores) item.sensores = estadoAnterior[indice].sensores;
        else delete item.sensores;
      });
      throw erro;
    }
    enviar(res, 200, {
      propriedade: {
        ...propriedade,
        sensores: Array.isArray(propriedade.sensores) ? propriedade.sensores : []
      }
    });
  },

  "GET /api/sensores": async (req, res) => {
    const { usuario } = exigir(req);
    const permitidos = sensoresPermitidos(usuario);
    const propriedadesDosSensores = propriedadesPorSensor();
    enviar(res, 200, {
      sensores: [...sensores.keys()].filter(id => permitidos.has(id)).sort().map(id => {
        const propriedade = propriedadesDosSensores.get(id);
        return {
          id,
          propriedadeId: propriedade ? propriedade.id : null,
          propriedadeNome: propriedade ? propriedade.nome : null
        };
      })
    });
  },

  "POST /api/me/senha": async (req, res) => {
    const { usuario, sessao } = exigir(req), b = await lerCorpo(req, 20_000);
    if (typeof b.atual !== "string" || !(await confereSenha(b.atual, usuario.senha)))
      throw new ErroHttp(403, "Senha atual incorreta.");
    if (!senhaOk(b.nova)) throw new ErroHttp(400, "A nova senha precisa ter pelo menos 6 caracteres.");
    usuario.senha = await hashSenha(b.nova);
    db.sessoes = db.sessoes.filter(s => s.usuario !== usuario.id || s.id === sessao.id);  // derruba os outros dispositivos
    salvarDb();
    enviar(res, 200, { ok: true });
  },

  "POST /api/me/email": async (req, res) => {
    const { usuario } = exigir(req), b = await lerCorpo(req, 20_000), novo = normEmail(b.novoEmail);
    if (typeof b.senha !== "string" || !(await confereSenha(b.senha, usuario.senha)))
      throw new ErroHttp(403, "Senha incorreta.");
    if (!emailOk(novo)) throw new ErroHttp(400, "Digite um e-mail válido.");
    if (db.usuarios.some(u => u.email === novo && u.id !== usuario.id)) throw new ErroHttp(409, "Este e-mail já está em uso.");
    usuario.email = novo;
    salvarDb();
    enviar(res, 200, { usuario: publico(usuario) });
  },

  "POST /api/me/desconectar-outros": async (req, res) => {
    const { usuario, sessao } = exigir(req);
    const antes = db.sessoes.length;
    db.sessoes = db.sessoes.filter(s => s.usuario !== usuario.id || s.id === sessao.id);
    salvarDb();
    enviar(res, 200, { desconectados: antes - db.sessoes.length });
  },

  /* Os SENSORES enviam por aqui (cabeçalho x-api-key). Aceita 1 leitura ou uma lista de até 1000. */
  "POST /api/leituras": async (req, res) => {
    const enviada = Buffer.from(String(req.headers["x-api-key"] || "")), esperada = Buffer.from(chaveSensores);
    if (enviada.length !== esperada.length || !crypto.timingSafeEqual(enviada, esperada))
      throw new ErroHttp(401, "Chave de sensor inválida.");
    const corpo = await lerCorpo(req), lista = Array.isArray(corpo) ? corpo : [corpo];
    if (!lista.length || lista.length > 1000) throw new ErroHttp(400, "Envie de 1 a 1000 leituras por vez.");
    const agora = Date.now(), novas = [], noLote = new Set(); let ignoradas = 0;
    for (const x of lista) {
      const sensor = String((x && x.sensor) || "").trim();
      const t = Number(x && x.temperatura), u = Number(x && x.umidade);
      let ts = !x || x.momento === undefined ? agora : (typeof x.momento === "number" ? x.momento : Date.parse(x.momento));
      if (!/^[\w.-]{1,40}$/.test(sensor) || !Number.isFinite(t) || t < -50 || t > 100 ||
          !Number.isFinite(u) || u < 0 || u > 100 || !Number.isFinite(ts) || ts > agora + 5 * 60 * 1000)
        throw new ErroHttp(400, "Leitura inválida: " + JSON.stringify(x).slice(0, 120));
      ts = Math.round(ts);
      const k = sensor + "|" + ts;
      if (vistos.has(k) || noLote.has(k)) { ignoradas++; continue; }
      noLote.add(k);
      const p = partes(ts);
      novas.push({ s: sensor, ts, t: Math.round(t * 10) / 10, u: Math.round(u * 10) / 10, d: p.d, h: p.h });
    }
    if (novas.length) {
      fs.appendFileSync(ARQ_LEIT, novas.map(l => JSON.stringify(l)).join("\n") + "\n");
      novas.forEach(indexar);
      alarmes.processar(novas);
    }
    enviar(res, 201, { salvas: novas.length, ignoradas });
  },

  /* Alarmes. Parâmetros opcionais: inicio, fim (AAAA-MM-DD), tipo, categoria (ambiente|sensor), limite */
  "GET /api/alarmes": async (req, res, url) => {
    const { usuario } = exigir(req);
    const permitidos = sensoresPermitidos(usuario);
    const q = url.searchParams, inicio = q.get("inicio"), fim = q.get("fim");
    if ((inicio && !dataOk(inicio)) || (fim && !dataOk(fim))) throw new ErroHttp(400, "Use datas no formato AAAA-MM-DD.");
    validarSensorPermitido(q.get("sensor"), permitidos);
    const limite = Math.min(Math.max(parseInt(q.get("limite")) || 100, 1), 1000);
    enviar(res, 200, alarmes.consultar({
      inicio, fim, tipo: q.get("tipo"), categoria: q.get("categoria"), limite,
      sensores: q.has("sensor") ? [q.get("sensor")] : [...permitidos]
    }));
  },

  /* Cartões do painel: média dos sensores online e contagem */
  "GET /api/resumo": async (req, res) => {
    const { usuario } = exigir(req);
    const permitidos = sensoresPermitidos(usuario);
    const agora = Date.now(); let on = 0, somaT = 0, somaU = 0; const lista = [];
    for (const [id, s] of sensores) {
      if (!permitidos.has(id)) continue;
      const online = agora - s.ts <= ONLINE_MS;
      if (online) { on++; somaT += s.t; somaU += s.u; }
      lista.push({ id, online, ultimaLeitura: new Date(s.ts).toISOString() });
    }
    lista.sort((a, b) => a.id.localeCompare(b.id));
    enviar(res, 200, {
      temp: on ? Math.round(somaT / on * 10) / 10 : null,
      umid: on ? Math.round(somaU / on) : null,
      sensoresOnline: on, sensoresTotal: lista.length,
      atualizadoEm: new Date().toISOString(), sensores: lista
    });
  },

  "GET /api/previsao": async (req, res) => {
    const { usuario } = exigir(req);
    const permitidos = sensoresPermitidos(usuario);
    enviar(res, 200, preverCondicoes(recentesPrevisao.filter(leitura => permitidos.has(leitura.s))));
  },

  "GET /api/resumo-inteligente": async (req, res) => {
    const { usuario } = exigir(req);
    const permitidos = sensoresPermitidos(usuario);
    const agora = Date.now();
    const dadosAlarmes = alarmes.consultar({
      inicioTs: agora - 24 * 60 * 60 * 1000, limite: 1000, sensores: [...permitidos]
    });
    const listaSensores = [...sensores].map(([id, leitura]) => ({
      id, online: agora - leitura.ts <= ONLINE_MS
    })).filter(sensor => permitidos.has(sensor.id) && !sensor.id.startsWith("demo-"));
    enviar(res, 200, criarResumoInteligente({
      leituras: leiturasRecentesResumo.filter(leitura =>
        permitidos.has(leitura.s) && !leitura.s.startsWith("demo-")),
      alarmes: dadosAlarmes,
      sensores: listaSensores,
      agora
    }));
  },

  /* Tabela, gráfico e histórico. Parâmetros  */
  "GET /api/leituras": async (req, res, url) => {
    const { usuario } = exigir(req);
    const permitidos = sensoresPermitidos(usuario);
    const q = url.searchParams, inicio = q.get("inicio"), fim = q.get("fim");
    if ((inicio && !dataOk(inicio)) || (fim && !dataOk(fim))) throw new ErroHttp(400, "Use datas no formato AAAA-MM-DD.");
    validarSensorPermitido(q.get("sensor"), permitidos);
    const intervalo = [5, 10, 15, 30, 60].includes(Number(q.get("intervalo"))) ? Number(q.get("intervalo")) : 30;
    const limite = Math.min(Math.max(parseInt(q.get("limite")) || 500, 1), 2000);
    const ordem = q.get("ordem") === "asc" ? "asc" : "desc";

    let dias = [...porDia.keys()].sort();
    dias = inicio || fim ? dias.filter(d => (!inicio || d >= inicio) && (!fim || d <= fim)) : dias.slice(-2);

    const grupos = new Map();
    for (const d of dias) for (const l of porDia.get(d)) {
      if (!permitidos.has(l.s) || (q.has("sensor") && l.s !== q.get("sensor"))) continue;
      const mm = Math.floor(Number(l.h.slice(3)) / intervalo) * intervalo;
      const hora = `${l.h.slice(0, 2)}:${String(mm).padStart(2, "0")}`, k = d + " " + hora + " " + l.s;
      let g = grupos.get(k);
      if (!g) { g = { data: d, hora, sensor: l.s, somaT: 0, somaU: 0, n: 0 }; grupos.set(k, g); }
      g.somaT += l.t; g.somaU += l.u; g.n++;
    }
    const propriedadeDosSensores = propriedadesPorSensor();
    const todas = [...grupos.values()]
      .map(g => ({
        data: g.data, hora: g.hora, sensor: g.sensor,
        propriedade: propriedadeDosSensores.get(g.sensor) ? propriedadeDosSensores.get(g.sensor).nome : "Não vinculada",
        t: Math.round(g.somaT / g.n * 10) / 10,
        u: Math.round(g.somaU / g.n), online: true
      }))
      .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
    if (ordem === "desc") todas.reverse();
    enviar(res, 200, { intervalo, total: todas.length, leituras: todas.slice(0, limite) });
  }
};

/* ---------- Arquivos do site (pasta "public") ---------- */
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".json": "application/json; charset=utf-8" };
function estatico(req, res, pathname) {
  let rel;
  try { rel = decodeURIComponent(pathname); } catch { res.writeHead(400); return res.end(); }
  if (rel.includes("\0")) { res.writeHead(400); return res.end(); }
  const arq = path.resolve(DIR_PUBLICO, rel.replace(/^[/\\]+/, ""));
  if (!arq.startsWith(DIR_PUBLICO + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(arq, (err, dados) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("Página não encontrada."); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(arq).toLowerCase()] || "application/octet-stream",
                         "Cache-Control": "no-cache", "X-Content-Type-Options": "nosniff" });
    res.end(req.method === "HEAD" ? undefined : dados);
  });
}

/* ---------- Servidor ---------- */
const servidor = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname.startsWith("/api/")) {
      if (req.method !== "GET" && !String(req.headers["content-type"] || "").startsWith("application/json"))
        throw new ErroHttp(415, "Envie o corpo como JSON (Content-Type: application/json).");
      const rota = rotas[req.method + " " + url.pathname];
      if (!rota) throw new ErroHttp(404, "Rota não encontrada.");
      return await rota(req, res, url);
    }
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405); return res.end(); }
    if (url.pathname === "/") {
      res.writeHead(302, { Location: "/html/login.html" });
      return res.end();
    }
    const destino = ATALHOS_PAGINAS.get(url.pathname);
    if (destino) {
      res.writeHead(302, { Location: destino });
      return res.end();
    }
    estatico(req, res, url.pathname);
  } catch (e) {
    if (res.headersSent) return res.end();
    if (e instanceof ErroHttp) return enviar(res, e.status, { erro: e.message });
    console.error(e);
    enviar(res, 500, { erro: "Erro interno do servidor." });
  }
});

(async () => {
  await prepararSuperAdmin();
  servidor.listen(PORTA, () => {
    console.log("\n  Green Weather — servidor ligado");
    console.log(`  Site ........ http://localhost:${PORTA}/html/login.html`);
    console.log("  Chave dos sensores: configurada (não exibida)");
    console.log(`  Fuso das leituras: ${FUSO}`);
    if (!fs.existsSync(DIR_PUBLICO)) console.log('  ATENÇÃO: crie a pasta "public" e coloque nela os arquivos do site.');
    console.log("  Para parar: Ctrl + C\n");
  });
})().catch(erro => {
  console.error("Não foi possível iniciar o servidor:", erro.message);
  process.exitCode = 1;
});
