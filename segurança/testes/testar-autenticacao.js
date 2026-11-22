"use strict";

const path = require("node:path");
const { spawnSync } = require("node:child_process");

const raizProjeto = path.resolve(__dirname, "..", "..");
const testeAutenticacao = path.join(raizProjeto, "tests", "relatorios.test.js");
const resultado = spawnSync(process.execPath, ["--test", testeAutenticacao], {
  cwd: raizProjeto,
  stdio: "inherit"
});

if (resultado.error) {
  console.error("Não foi possível iniciar os testes de autenticação:", resultado.error.message);
  process.exitCode = 1;
} else if (resultado.signal) {
  console.error(`Os testes de autenticação foram interrompidos (${resultado.signal}).`);
  process.exitCode = 1;
} else {
  process.exitCode = resultado.status === null ? 1 : resultado.status;
}
