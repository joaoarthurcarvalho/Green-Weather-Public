"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
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
  return spawn(process.execPath, ["src/server.js"], {
    cwd: path.resolve(__dirname, ".."),
    env: {
      ...process.env,
      DATA_DIR: dir,
      PORT: String(port),
      SENSOR_API_KEY: "test-key",
      SUPERADMIN_NAME: "",
      SUPERADMIN_EMAIL: "",
      SUPERADMIN_PASSWORD: ""
    },
    stdio: "ignore"
  });
}

async function aguardarServidor(child, base) {
  for (let tentativa = 0; tentativa < 50; tentativa++) {
    if (child.exitCode !== null) throw new Error("O servidor de teste encerrou antes de iniciar.");
    try {
      const resposta = await fetch(`${base}/health`);
      if (resposta.ok) return;
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

async function comServidor(teste) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "green-weather-api-"));
  const port = await portaDisponivel();
  const base = `http://127.0.0.1:${port}`;
  let child = iniciarServidor(dir, port);
  try {
    await aguardarServidor(child, base);
    await teste({ dir, base });
  } finally {
    await pararServidor(child);
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("GET /health informa estado básico sem expor dados sensíveis", async () => {
  await comServidor(async ({ base }) => {
    const resposta = await fetch(`${base}/health`);
    assert.equal(resposta.status, 200);
    const dados = await resposta.json();
    assert.equal(dados.status, "ok");
    assert.ok(Number.isFinite(dados.uptimeSegundos));
    assert.ok(Number.isFinite(Date.parse(dados.timestamp)));
    assert.equal("chaveSensores" in dados, false);
    assert.equal("usuarios" in dados, false);
  });
});

test("POST /api/leituras valida chave e lote, deduplica e aceita até 1000 leituras", async () => {
  await comServidor(async ({ dir, base }) => {
    const url = `${base}/api/leituras`;
    const enviar = (leituras, chave = "test-key") => fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": chave },
      body: JSON.stringify(leituras)
    });

    const leitura = {
      sensor: "sensor-teste",
      temperatura: 24,
      umidade: 60,
      momento: Date.now() - 1000
    };
    assert.equal((await enviar(leitura, "chave-incorreta")).status, 401);

    const loteInvalido = await enviar([leitura, { ...leitura, sensor: "sensor-invalido", temperatura: 101 }]);
    assert.equal(loteInvalido.status, 400);
    assert.equal(fs.existsSync(path.join(dir, "leituras.jsonl")), false);

    const loteDuplicado = await enviar([leitura, leitura]);
    assert.equal(loteDuplicado.status, 201);
    assert.deepEqual(await loteDuplicado.json(), { salvas: 1, ignoradas: 1 });

    const reenvio = await enviar(leitura);
    assert.equal(reenvio.status, 201);
    assert.deepEqual(await reenvio.json(), { salvas: 0, ignoradas: 1 });

    const baseTs = Date.now() - 5000;
    const loteMaximo = Array.from({ length: 1000 }, (_, indice) => ({
      sensor: `sensor-${indice}`,
      temperatura: 24,
      umidade: 60,
      momento: baseTs + indice
    }));
    const acimaDoLimite = await enviar([...loteMaximo, {
      sensor: "sensor-extra", temperatura: 24, umidade: 60, momento: baseTs + 1000
    }]);
    assert.equal(acimaDoLimite.status, 400);

    const aceito = await enviar(loteMaximo);
    assert.equal(aceito.status, 201);
    assert.deepEqual(await aceito.json(), { salvas: 1000, ignoradas: 0 });

    const linhas = fs.readFileSync(path.join(dir, "leituras.jsonl"), "utf8").trim().split("\n");
    assert.equal(linhas.length, 1001);
  });
});
