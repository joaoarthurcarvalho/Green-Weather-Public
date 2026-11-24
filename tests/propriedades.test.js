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
  return spawn(process.execPath, ["src/server.js"], {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, DATA_DIR: dir, PORT: String(port), SENSOR_API_KEY: "test-key" },
    stdio: "ignore"
  });
}

async function aguardarServidor(child, base) {
  for (let tentativa = 0; tentativa < 50; tentativa++) {
    if (child.exitCode !== null) throw new Error("O servidor de teste encerrou antes de iniciar.");
    try {
      const resposta = await fetch(`${base}/health`);
      if (resposta.ok) {
        const corpo = await resposta.json();
        assert.equal(corpo.status, "ok");
        return;
      }
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

async function entrar(base, email, senha, senhaDoDia) {
  const resposta = await fetch(`${base}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, senha, senhaDoDia })
  });
  assert.equal(resposta.status, 200);
  return resposta.headers.get("set-cookie").split(";")[0];
}

test("superadmin vê todas as propriedades e funcionários e engenheiros só as atribuídas", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "green-weather-propriedades-"));
  const port = await portaDisponivel();
  const base = `http://127.0.0.1:${port}`;
  const senha = "senha-teste";
  const dataHoje = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Recife", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date());
  const salt = crypto.randomBytes(16);
  const senhaHash = `${salt.toString("hex")}:${crypto.scryptSync(senha, salt, 64).toString("hex")}`;
  fs.writeFileSync(path.join(dir, "usuarios.json"), JSON.stringify({
    usuarios: [
      { id: "superadmin-1", nome: "Admin", sobrenome: "Sistema", email: "admin@example.test", senha: senhaHash, papel: "superadmin", ativo: true },
      { id: "engenheiro-1", nome: "Ana", sobrenome: "Agrônoma", email: "ana@example.test", senha: senhaHash, papel: "engenheiro", ativo: true },
      { id: "engenheiro-2", nome: "Bia", sobrenome: "Agrônoma", email: "bia@example.test", senha: senhaHash, papel: "engenheiro", ativo: true },
      { id: "funcionario-1", nome: "João", sobrenome: "Funcionário", email: "joao@example.test", senha: senhaHash, papel: "funcionario", ativo: true }
    ],
    sessoes: []
  }));
  fs.writeFileSync(path.join(dir, "relatorios-tecnicos.json"), JSON.stringify([{
    id: "relatorio-antigo-engenheira",
    usuarioId: "engenheiro-1",
    inicio: dataHoje,
    fim: dataHoje,
    geradoEm: new Date().toISOString(),
    observacoes: "Relatório salvo antes da restrição por sensor.",
    resumo: { leituras: 2, sensores: 2, temperaturaMedia: 23 },
    alarmes: { total: 3, ativos: 3, porTipo: { temperatura_alta: 1, temperatura_baixa: 1, umidade_baixa: 1 } }
  }]));
  let child = iniciarServidor(dir, port);

  try {
    await aguardarServidor(child, base);
    const adminCookie = await entrar(base, "admin@example.test", senha);
    const senhaDoDiaResposta = await fetch(`${base}/api/funcionarios/senha-do-dia`, {
      headers: { Cookie: adminCookie }
    });
    const { senha: senhaDoDia } = await senhaDoDiaResposta.json();

    const propriedadeAdmin = await fetch(`${base}/api/propriedades`, {
      method: "POST",
      headers: { Cookie: adminCookie, "Content-Type": "application/json" },
      body: JSON.stringify({ nome: "Fazenda Admin", municipio: "Campinas", uf: "SP", areaHa: 120 })
    });
    assert.equal(propriedadeAdmin.status, 201);

    const engenheiroCookie = await entrar(base, "ana@example.test", senha, senhaDoDia);
    const propriedadeEngenheiro = await fetch(`${base}/api/propriedades`, {
      method: "POST",
      headers: { Cookie: engenheiroCookie, "Content-Type": "application/json" },
      body: JSON.stringify({ nome: "Fazenda Ana", municipio: "Ribeirão Preto", uf: "SP", areaHa: 85 })
    });
    assert.equal(propriedadeEngenheiro.status, 201);
    const { propriedade: fazendaAdmin } = await propriedadeAdmin.json();
    const { propriedade: fazendaAna } = await propriedadeEngenheiro.json();

    const leiturasEnviadas = await fetch(`${base}/api/leituras`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": "test-key" },
      body: JSON.stringify([
        { sensor: "sensor-a", temperatura: 35, umidade: 60 },
        { sensor: "sensor-b", temperatura: 10, umidade: 20 }
      ])
    });
    assert.equal(leiturasEnviadas.status, 201);

    const configuracoes = [
      { id: fazendaAna.id, nome: "Fazenda Ana Atualizada", areaHa: 95, sensores: ["sensor-a"] },
      { id: fazendaAdmin.id, nome: "Fazenda Admin Atualizada", areaHa: 140, sensores: ["sensor-b"] }
    ];
    for (const configuracao of configuracoes) {
      const atualizacao = await fetch(`${base}/api/propriedades`, {
        method: "PATCH",
        headers: { Cookie: adminCookie, "Content-Type": "application/json" },
        body: JSON.stringify(configuracao)
      });
      assert.equal(atualizacao.status, 200);
    }

    const historico = await fetch(`${base}/api/leituras?intervalo=30`, {
      headers: { Cookie: adminCookie }
    });
    assert.equal(historico.status, 200);
    const { leituras } = await historico.json();
    assert.deepEqual(
      leituras.map(leitura => [leitura.sensor, leitura.propriedade]).sort(),
      [["sensor-a", "Fazenda Ana Atualizada"], ["sensor-b", "Fazenda Admin Atualizada"]]
    );

    const sensoresEngenheira = await fetch(`${base}/api/sensores`, {
      headers: { Cookie: engenheiroCookie }
    });
    assert.equal(sensoresEngenheira.status, 200);
    assert.deepEqual((await sensoresEngenheira.json()).sensores.map(sensor => sensor.id), ["sensor-a"]);

    const resumoEngenheira = await fetch(`${base}/api/resumo`, {
      headers: { Cookie: engenheiroCookie }
    });
    const dadosResumo = await resumoEngenheira.json();
    assert.deepEqual(dadosResumo.sensores.map(sensor => sensor.id), ["sensor-a"]);
    assert.equal(dadosResumo.sensoresTotal, 1);

    const historicoEngenheira = await fetch(`${base}/api/leituras`, {
      headers: { Cookie: engenheiroCookie }
    });
    assert.equal(historicoEngenheira.status, 200);
    assert.deepEqual((await historicoEngenheira.json()).leituras.map(leitura => leitura.sensor), ["sensor-a"]);
    const historicoIDOR = await fetch(`${base}/api/leituras?sensor=sensor-b`, {
      headers: { Cookie: engenheiroCookie }
    });
    assert.equal(historicoIDOR.status, 404);

    const alarmesEngenheira = await fetch(`${base}/api/alarmes`, {
      headers: { Cookie: engenheiroCookie }
    });
    assert.equal(alarmesEngenheira.status, 200);
    const dadosAlarmes = await alarmesEngenheira.json();
    assert.ok(dadosAlarmes.alarmes.length > 0);
    assert.ok(dadosAlarmes.alarmes.every(alarme => alarme.sensor === "sensor-a"));
    const alarmesIDOR = await fetch(`${base}/api/alarmes?sensor=sensor-b`, {
      headers: { Cookie: engenheiroCookie }
    });
    assert.equal(alarmesIDOR.status, 404);

    const resumoInteligente = await fetch(`${base}/api/resumo-inteligente`, {
      headers: { Cookie: engenheiroCookie }
    });
    assert.equal(resumoInteligente.status, 200);
    assert.doesNotMatch(await resumoInteligente.text(), /sensor-b/);

    const relatorioDireto = await fetch(
      `${base}/api/relatorio-tecnico?inicio=${dataHoje}&fim=${dataHoje}`,
      { headers: { Cookie: engenheiroCookie } }
    );
    assert.equal(relatorioDireto.status, 200);
    const dadosRelatorio = await relatorioDireto.json();
    assert.equal(dadosRelatorio.resumo.sensores, 1);
    assert.equal(dadosRelatorio.alarmes.total, 1);

    const relatoriosSalvos = await fetch(`${base}/api/relatorios-tecnicos`, {
      headers: { Cookie: engenheiroCookie }
    });
    assert.equal(relatoriosSalvos.status, 200);
    const dadosRelatorioSalvo = await relatoriosSalvos.json();
    assert.equal(dadosRelatorioSalvo.relatorios[0].resumo.sensores, 1);
    assert.equal(dadosRelatorioSalvo.relatorios[0].alarmes.total, 1);

    const propriedadesAdmin = await fetch(`${base}/api/propriedades`, {
      headers: { Cookie: adminCookie }
    });
    assert.equal(propriedadesAdmin.status, 200);
    const { propriedades: todas } = await propriedadesAdmin.json();
    assert.deepEqual(
      todas.map(propriedade => [propriedade.nome, propriedade.areaHa]).sort(),
      [["Fazenda Admin Atualizada", 140], ["Fazenda Ana Atualizada", 95]]
    );

    const propriedadesEngenheiro = await fetch(`${base}/api/propriedades`, {
      headers: { Cookie: engenheiroCookie }
    });
    assert.equal(propriedadesEngenheiro.status, 200);
    const { propriedades: proprias } = await propriedadesEngenheiro.json();
    assert.deepEqual(proprias.map(propriedade => propriedade.nome), ["Fazenda Ana Atualizada"]);

    const edicaoNegada = await fetch(`${base}/api/propriedades`, {
      method: "PATCH",
      headers: { Cookie: engenheiroCookie, "Content-Type": "application/json" },
      body: JSON.stringify({ id: fazendaAdmin.id, nome: "Alteração indevida", areaHa: 120 })
    });
    assert.equal(edicaoNegada.status, 404);

    const atribuicaoFuncionario = await fetch(`${base}/api/funcionarios`, {
      method: "PATCH",
      headers: { Cookie: adminCookie, "Content-Type": "application/json" },
      body: JSON.stringify({ id: "funcionario-1", propriedadeIds: [fazendaAna.id] })
    });
    assert.equal(atribuicaoFuncionario.status, 200);
    const atribuicaoEngenheiro = await fetch(`${base}/api/funcionarios`, {
      method: "PATCH",
      headers: { Cookie: adminCookie, "Content-Type": "application/json" },
      body: JSON.stringify({ id: "engenheiro-2", propriedadeIds: [fazendaAdmin.id] })
    });
    assert.equal(atribuicaoEngenheiro.status, 200);
    const atribuicaoInvalida = await fetch(`${base}/api/funcionarios`, {
      method: "PATCH",
      headers: { Cookie: adminCookie, "Content-Type": "application/json" },
      body: JSON.stringify({ id: "funcionario-1", propriedadeIds: ["propriedade-inexistente"] })
    });
    assert.equal(atribuicaoInvalida.status, 400);
    const funcionariosAtualizados = await fetch(`${base}/api/funcionarios`, {
      headers: { Cookie: adminCookie }
    });
    assert.equal(funcionariosAtualizados.status, 200);
    const { funcionarios } = await funcionariosAtualizados.json();
    assert.deepEqual(
      funcionarios.find(funcionario => funcionario.id === "funcionario-1").propriedadeIds,
      [fazendaAna.id]
    );

    const funcionarioCookie = await entrar(base, "joao@example.test", senha, senhaDoDia);
    const limitesFuncionario = {
      propriedadeId: fazendaAna.id,
      temperaturaMinima: 10, temperaturaMaxima: 25,
      umidadeMinima: 40, umidadeMaxima: 70
    };
    const configurarLimitesAna = await fetch(`${base}/api/limites-climaticos`, {
      method: "PUT",
      headers: { Cookie: engenheiroCookie, "Content-Type": "application/json" },
      body: JSON.stringify(limitesFuncionario)
    });
    assert.equal(configurarLimitesAna.status, 200);
    const limitesPropriedadeFuncionario = await fetch(
      `${base}/api/limites-climaticos?propriedadeId=${fazendaAna.id}`,
      { headers: { Cookie: funcionarioCookie } }
    );
    assert.equal(limitesPropriedadeFuncionario.status, 200);
    assert.deepEqual((await limitesPropriedadeFuncionario.json()).limites, {
      temperaturaMinima: 10, temperaturaMaxima: 25,
      umidadeMinima: 40, umidadeMaxima: 70
    });
    const limitesPropriedadeAlheia = await fetch(
      `${base}/api/limites-climaticos?propriedadeId=${fazendaAdmin.id}`,
      { headers: { Cookie: funcionarioCookie } }
    );
    assert.equal(limitesPropriedadeAlheia.status, 404);
    const alterarPadraoFuncionario = await fetch(`${base}/api/limites-climaticos`, {
      method: "PUT",
      headers: { Cookie: funcionarioCookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        temperaturaMinima: 10, temperaturaMaxima: 25,
        umidadeMinima: 40, umidadeMaxima: 70
      })
    });
    assert.equal(alterarPadraoFuncionario.status, 403);

    const resumoFuncionario = await fetch(`${base}/api/resumo`, {
      headers: { Cookie: funcionarioCookie }
    });
    assert.equal(resumoFuncionario.status, 200);
    const dadosResumoFuncionario = await resumoFuncionario.json();
    assert.equal(dadosResumoFuncionario.sensoresTotal, 1);
    assert.deepEqual(dadosResumoFuncionario.sensores[0].limites, {
      temperaturaMinima: 10, temperaturaMaxima: 25,
      umidadeMinima: 40, umidadeMaxima: 70
    });
    const relatorioComLimitesDaPropriedade = await fetch(
      `${base}/api/relatorio-tecnico?inicio=${dataHoje}&fim=${dataHoje}`,
      { headers: { Cookie: engenheiroCookie } }
    );
    assert.equal(relatorioComLimitesDaPropriedade.status, 200);
    const dadosRelatorioComLimites = await relatorioComLimitesDaPropriedade.json();
    assert.equal(dadosRelatorioComLimites.resumo.leiturasForaTemperatura, 1);
    assert.equal(
      dadosRelatorioComLimites.limitesPorPropriedade.find(item => item.id === fazendaAna.id).temperaturaMaxima,
      25
    );
    const sensoresFuncionario = await fetch(`${base}/api/sensores`, {
      headers: { Cookie: funcionarioCookie }
    });
    assert.equal(sensoresFuncionario.status, 200);
    assert.deepEqual((await sensoresFuncionario.json()).sensores.map(sensor => sensor.id), ["sensor-a"]);

    const historicoFuncionario = await fetch(`${base}/api/leituras`, {
      headers: { Cookie: funcionarioCookie }
    });
    assert.equal(historicoFuncionario.status, 200);
    assert.deepEqual(
      (await historicoFuncionario.json()).leituras.map(leitura => leitura.sensor),
      ["sensor-a"]
    );

    const historicoFuncionarioPorId = await fetch(`${base}/api/leituras?sensor=sensor-b`, {
      headers: { Cookie: funcionarioCookie }
    });
    assert.equal(historicoFuncionarioPorId.status, 404);

    const alarmesFuncionario = await fetch(`${base}/api/alarmes`, {
      headers: { Cookie: funcionarioCookie }
    });
    assert.equal(alarmesFuncionario.status, 200);
    const dadosAlarmesFuncionario = await alarmesFuncionario.json();
    assert.ok(dadosAlarmesFuncionario.alarmes.length > 0);
    assert.ok(dadosAlarmesFuncionario.alarmes.every(alarme => alarme.sensor === "sensor-a"));

    const propriedadesFuncionario = await fetch(`${base}/api/propriedades`, {
      headers: { Cookie: funcionarioCookie }
    });
    assert.equal(propriedadesFuncionario.status, 200);
    assert.deepEqual(
      (await propriedadesFuncionario.json()).propriedades.map(propriedade => propriedade.id),
      [fazendaAna.id]
    );

    const criarPropriedadeFuncionario = await fetch(`${base}/api/propriedades`, {
      method: "POST",
      headers: { Cookie: funcionarioCookie, "Content-Type": "application/json" },
      body: JSON.stringify({ nome: "Propriedade indevida", municipio: "Campinas", uf: "SP", areaHa: 1 })
    });
    assert.equal(criarPropriedadeFuncionario.status, 403);

    const alterarPropriedadeFuncionario = await fetch(`${base}/api/propriedades`, {
      method: "PATCH",
      headers: { Cookie: funcionarioCookie, "Content-Type": "application/json" },
      body: JSON.stringify({ id: fazendaAdmin.id, nome: "Alteração indevida", areaHa: 1 })
    });
    assert.equal(alterarPropriedadeFuncionario.status, 404);

    const alterarPropriedadeAtribuida = await fetch(`${base}/api/propriedades`, {
      method: "PATCH",
      headers: { Cookie: funcionarioCookie, "Content-Type": "application/json" },
      body: JSON.stringify({ id: fazendaAna.id, nome: "Fazenda Ana pelo funcionário", areaHa: 96 })
    });
    assert.equal(alterarPropriedadeAtribuida.status, 200);

    const engenheiroAtribuidoCookie = await entrar(base, "bia@example.test", senha, senhaDoDia);
    const configurarLimitesEngenheiro = await fetch(`${base}/api/limites-climaticos`, {
      method: "PUT",
      headers: { Cookie: engenheiroAtribuidoCookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        propriedadeId: fazendaAdmin.id,
        temperaturaMinima: 5, temperaturaMaxima: 35,
        umidadeMinima: 30, umidadeMaxima: 90
      })
    });
    assert.equal(configurarLimitesEngenheiro.status, 200);
    const limitesAlheiosEngenheiro = await fetch(`${base}/api/limites-climaticos`, {
      method: "PUT",
      headers: { Cookie: engenheiroAtribuidoCookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        propriedadeId: fazendaAna.id,
        temperaturaMinima: 5, temperaturaMaxima: 35,
        umidadeMinima: 30, umidadeMaxima: 90
      })
    });
    assert.equal(limitesAlheiosEngenheiro.status, 404);
    const limitesAdmin = await fetch(`${base}/api/limites-climaticos`, {
      headers: { Cookie: adminCookie }
    });
    assert.equal(limitesAdmin.status, 200);
    const dadosLimitesAdmin = await limitesAdmin.json();
    assert.equal(dadosLimitesAdmin.limitesVariados, true);
    assert.deepEqual(dadosLimitesAdmin.padrao, {
      temperaturaMinima: 20, temperaturaMaxima: 30,
      umidadeMinima: 50, umidadeMaxima: 80
    });
    const propriedadesEngenheiroAtribuido = await fetch(`${base}/api/propriedades`, {
      headers: { Cookie: engenheiroAtribuidoCookie }
    });
    assert.equal(propriedadesEngenheiroAtribuido.status, 200);
    assert.deepEqual(
      (await propriedadesEngenheiroAtribuido.json()).propriedades.map(propriedade => propriedade.id),
      [fazendaAdmin.id]
    );
    const edicaoNegadaEngenheiroAtribuido = await fetch(`${base}/api/propriedades`, {
      method: "PATCH",
      headers: { Cookie: engenheiroAtribuidoCookie, "Content-Type": "application/json" },
      body: JSON.stringify({ id: fazendaAna.id, nome: "Alteração não autorizada", areaHa: 85 })
    });
    assert.equal(edicaoNegadaEngenheiroAtribuido.status, 404);
    const editarPropriedadeAtribuidaEngenheiro = await fetch(`${base}/api/propriedades`, {
      method: "PATCH",
      headers: { Cookie: engenheiroAtribuidoCookie, "Content-Type": "application/json" },
      body: JSON.stringify({ id: fazendaAdmin.id, nome: "Fazenda Admin pela engenheira", areaHa: 141 })
    });
    assert.equal(editarPropriedadeAtribuidaEngenheiro.status, 200);
    const restaurarLimites = await fetch(
      `${base}/api/limites-climaticos?propriedadeId=${fazendaAdmin.id}`,
      {
        method: "DELETE",
        headers: { Cookie: engenheiroAtribuidoCookie, "Content-Type": "application/json" },
        body: JSON.stringify({})
      }
    );
    assert.equal(restaurarLimites.status, 200);
    assert.equal((await restaurarLimites.json()).herdados, true);
  } finally {
    await pararServidor(child);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
