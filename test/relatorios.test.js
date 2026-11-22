"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const net = require("node:net");
const { spawn } = require("node:child_process");

async function portaDisponivel() {
  const servidor = net.createServer();
  await new Promise((resolve, reject) => {
    servidor.once("error", reject);
    servidor.listen(0, "127.0.0.1", resolve);
  });
  const { port } = servidor.address();
  await new Promise((resolve, reject) => servidor.close(erro => erro ? reject(erro) : resolve()));
  return port;
}

function iniciarServidor(dir, port) {
  return spawn(process.execPath, ["server.js"], {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, DATA_DIR: dir, PORT: String(port), SENSOR_API_KEY: "test-key" },
    stdio: "ignore"
  });
}

async function aguardarServidor(child, base) {
  for (let tentativa = 0; tentativa < 50; tentativa++) {
    if (child.exitCode !== null) throw new Error("O servidor de teste encerrou antes de iniciar.");
    try {
      await fetch(`${base}/api/me`);
      return;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  throw new Error("O servidor de teste não iniciou.");
}

async function pararServidor(child) {
  if (!child || child.exitCode !== null) return;
  const encerrado = new Promise(resolve => child.once("exit", resolve));
  child.kill();
  await encerrado;
}

async function login(base, email, senha, senhaDoDia) {
  const resposta = await fetch(`${base}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, senha, senhaDoDia })
  });
  return resposta;
}

async function entrar(base, email, senha, senhaDoDia) {
  const resposta = await login(base, email, senha, senhaDoDia);
  assert.equal(resposta.status, 200);
  return resposta.headers.get("set-cookie").split(";")[0];
}

test("salva relatórios técnicos por usuário e mantém os registros após reiniciar", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "green-weather-relatorios-"));
  const port = await portaDisponivel();
  const base = `http://127.0.0.1:${port}`;
  const senha = "senha-teste";
  const salt = crypto.randomBytes(16);
  const senhaHash = `${salt.toString("hex")}:${crypto.scryptSync(senha, salt, 64).toString("hex")}`;
  fs.writeFileSync(path.join(dir, "usuarios.json"), JSON.stringify({
    usuarios: [
      { id: "superadmin-1", nome: "Admin", sobrenome: "Sistema", email: "admin@example.test", senha: senhaHash, papel: "superadmin", ativo: true },
      { id: "engenheiro-1", nome: "Ana", sobrenome: "Agrônoma", email: "ana@example.test", senha: senhaHash, papel: "engenheiro", ativo: true },
      { id: "funcionario-1", nome: "João", sobrenome: "Funcionário", email: "joao@example.test", senha: senhaHash, papel: "funcionario", ativo: true }
    ],
    sessoes: []
  }));
  let child = iniciarServidor(dir, port);

  try {
    await aguardarServidor(child, base);
    const loginSuperadmin = await login(base, "admin@example.test", senha);
    assert.equal(loginSuperadmin.status, 200);
    const cookieSuperadmin = loginSuperadmin.headers.get("set-cookie").split(";")[0];
    const senhaDoDiaResposta = await fetch(`${base}/api/funcionarios/senha-do-dia`, {
      headers: { Cookie: cookieSuperadmin }
    });
    assert.equal(senhaDoDiaResposta.status, 200);
    const senhaDoDia = await senhaDoDiaResposta.json();
    assert.match(senhaDoDia.senha, /^[A-F0-9]{10}$/);
    assert.match(senhaDoDia.data, /^\d{4}-\d{2}-\d{2}$/);

    const senhaRotacionadaResposta = await fetch(`${base}/api/funcionarios/senha-do-dia`, {
      method: "POST",
      headers: { Cookie: cookieSuperadmin, "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    assert.equal(senhaRotacionadaResposta.status, 200);
    const senhaRotacionada = await senhaRotacionadaResposta.json();
    assert.match(senhaRotacionada.senha, /^[A-F0-9]{10}$/);
    assert.notEqual(senhaRotacionada.senha, senhaDoDia.senha);

    const acessoNegado = await fetch(`${base}/api/funcionarios/senha-do-dia`);
    assert.equal(acessoNegado.status, 401);
    const acessoFuncionario = await fetch(`${base}/api/funcionarios/senha-do-dia`, {
      headers: { Cookie: await entrar(base, "joao@example.test", senha, senhaRotacionada.senha) }
    });
    assert.equal(acessoFuncionario.status, 403);

    const desafio = await login(base, "ana@example.test", senha);
    assert.equal(desafio.status, 202);
    assert.equal(desafio.headers.get("set-cookie"), null);
    const codigoInvalido = await login(base, "ana@example.test", senha, "0000000000");
    assert.equal(codigoInvalido.status, 401);
    assert.equal(codigoInvalido.headers.get("set-cookie"), null);
    assert.equal((await login(base, "ana@example.test", senha, senhaDoDia.senha)).status, 401);
    const cookie = await entrar(base, "ana@example.test", senha, senhaRotacionada.senha);
    const observacoes = "Vistoria do talhão norte.";
    const criado = await fetch(`${base}/api/relatorios-tecnicos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ inicio: "2026-11-13", fim: "2026-11-20", observacoes })
    });
    assert.equal(criado.status, 201);
    const { relatorio } = await criado.json();
    assert.equal(relatorio.observacoes, observacoes);
    assert.equal(fs.existsSync(path.join(dir, "relatorios-tecnicos.json")), true);

    const funcionario = await entrar(base, "joao@example.test", senha, senhaRotacionada.senha);
    const negado = await fetch(`${base}/api/relatorios-tecnicos`, { headers: { Cookie: funcionario } });
    assert.equal(negado.status, 403);

    await pararServidor(child);
    child = iniciarServidor(dir, port);
    await aguardarServidor(child, base);
    const adminAposReinicio = await entrar(base, "admin@example.test", senha);
    const senhaAposReinicio = await fetch(`${base}/api/funcionarios/senha-do-dia`, {
      headers: { Cookie: adminAposReinicio }
    });
    assert.equal(senhaAposReinicio.status, 200);
    assert.equal((await senhaAposReinicio.json()).senha, senhaRotacionada.senha);
    const cookieAposReinicio = await entrar(base, "ana@example.test", senha, senhaRotacionada.senha);
    const lista = await fetch(`${base}/api/relatorios-tecnicos`, { headers: { Cookie: cookieAposReinicio } });
    assert.equal(lista.status, 200);
    const { relatorios } = await lista.json();
    assert.equal(relatorios.length, 1);
    assert.equal(relatorios[0].id, relatorio.id);
    assert.equal(relatorios[0].observacoes, observacoes);
  } finally {
    await pararServidor(child);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
