"use strict";

const formPropriedade = document.getElementById("form-propriedade");
const listaPropriedades = document.getElementById("lista-propriedades");
const mensagemPropriedade = document.getElementById("mensagem-propriedade");
const botaoPropriedade = document.getElementById("salvar-propriedade");
const usuarioAtual = GW.usuarioAtual();
const ehSuperadmin = usuarioAtual && usuarioAtual.papel === "superadmin";
const dialogConfiguracao = document.getElementById("dialog-configuracao-propriedade");
const formConfiguracao = document.getElementById("form-configuracao-propriedade");
const campoNomeConfiguracao = document.getElementById("config-nome-propriedade");
const campoAreaConfiguracao = document.getElementById("config-area-propriedade");
const secaoSensoresConfiguracao = document.getElementById("config-sensores");
const listaSensoresConfiguracao = document.getElementById("lista-sensores-config");
const mensagemConfiguracao = document.getElementById("mensagem-configuracao-propriedade");
const botaoSalvarConfiguracao = document.getElementById("salvar-configuracao-propriedade");
let sensoresCarregados = null;
let propriedadeEmEdicao = null;

if (ehSuperadmin) {
  secaoSensoresConfiguracao.hidden = false;
  document.querySelector(".management-intro").textContent =
    "Consulte e configure as propriedades cadastradas, cadastre novas e atribua sensores.";
  document.querySelector(".management-list h2").textContent = "Todas as propriedades";
}

function mostrarMensagem(texto, tipo = "") {
  mensagemPropriedade.textContent = texto;
  mensagemPropriedade.className = `management-message${tipo ? ` ${tipo}` : ""}`;
}

async function carregarPropriedades() {
  const { propriedades } = await GW.requisitar("GET", "/api/propriedades");
  listaPropriedades.replaceChildren();
  for (const propriedade of propriedades) {
    const linha = document.createElement("tr");
    for (const valor of [
      propriedade.nome, propriedade.municipio, propriedade.uf,
      Number(propriedade.areaHa).toLocaleString("pt-BR", { maximumFractionDigits: 2 }),
      Array.isArray(propriedade.sensores) && propriedade.sensores.length
        ? propriedade.sensores.join(", ")
        : "Nenhum"
    ]) {
      const celula = document.createElement("td");
      celula.textContent = valor;
      linha.appendChild(celula);
    }
    const acoes = document.createElement("td");
    const configurar = document.createElement("button");
    configurar.type = "button";
    configurar.className = "management-config-button";
    configurar.textContent = "Configurar";
    configurar.setAttribute("aria-label", `Configurar propriedade ${propriedade.nome}`);
    configurar.addEventListener("click", () => abrirConfiguracao(propriedade));
    acoes.appendChild(configurar);
    linha.appendChild(acoes);
    listaPropriedades.appendChild(linha);
  }
  if (!propriedades.length) {
    listaPropriedades.innerHTML = '<tr><td colspan="6" class="empty">Nenhuma propriedade cadastrada.</td></tr>';
  }
}

async function carregarSensores() {
  const { sensores } = await GW.requisitar("GET", "/api/sensores");
  sensoresCarregados = sensores;
}

async function abrirConfiguracao(propriedade) {
  if (ehSuperadmin && sensoresCarregados === null) {
    try {
      await carregarSensores();
    } catch (erro) {
      mostrarMensagem(`Não foi possível carregar os sensores: ${erro.message}`, "error");
      return;
    }
  }
  propriedadeEmEdicao = propriedade;
  campoNomeConfiguracao.value = propriedade.nome;
  campoAreaConfiguracao.value = propriedade.areaHa;
  mensagemConfiguracao.textContent = "";
  mensagemConfiguracao.className = "management-message management-full";
  listaSensoresConfiguracao.replaceChildren();

  if (ehSuperadmin) {
    const sensoresAtuais = new Set(Array.isArray(propriedade.sensores) ? propriedade.sensores : []);
    if (!sensoresCarregados.length) {
      const vazio = document.createElement("p");
      vazio.className = "empty";
      vazio.textContent = "Nenhum sensor disponível.";
      listaSensoresConfiguracao.appendChild(vazio);
    }
    for (const sensor of sensoresCarregados) {
      const rotulo = document.createElement("label");
      rotulo.className = "property-sensor-option";
      const caixa = document.createElement("input");
      caixa.type = "checkbox";
      caixa.value = sensor.id;
      caixa.checked = sensoresAtuais.has(sensor.id);
      const texto = document.createElement("span");
      texto.textContent = `${sensor.id} · ${sensor.propriedadeNome || "Não vinculada"}`;
      rotulo.append(caixa, texto);
      listaSensoresConfiguracao.appendChild(rotulo);
    }
  }
  dialogConfiguracao.showModal();
}

document.getElementById("cancelar-configuracao-propriedade").addEventListener("click", () => {
  dialogConfiguracao.close();
});

formConfiguracao.addEventListener("submit", async event => {
  event.preventDefault();
  const nome = campoNomeConfiguracao.value.trim();
  const areaHa = Number(campoAreaConfiguracao.value);
  if (!propriedadeEmEdicao || !nome || !Number.isFinite(areaHa) || areaHa <= 0) {
    mensagemConfiguracao.textContent = "Informe um nome e uma área válidos.";
    mensagemConfiguracao.className = "management-message management-full error";
    return;
  }
  botaoSalvarConfiguracao.disabled = true;
  mensagemConfiguracao.textContent = "Salvando alterações…";
  mensagemConfiguracao.className = "management-message management-full";
  const dados = { id: propriedadeEmEdicao.id, nome, areaHa };
  if (ehSuperadmin) {
    dados.sensores = [...listaSensoresConfiguracao.querySelectorAll('input[type="checkbox"]:checked')]
      .map(caixa => caixa.value);
  }
  try {
    await GW.requisitar("PATCH", "/api/propriedades", dados);
    dialogConfiguracao.close();
    mostrarMensagem("Propriedade atualizada.", "success");
    try {
      await carregarPropriedades();
    } catch (erro) {
      listaPropriedades.innerHTML = `<tr><td colspan="6" class="empty">${erro.message}</td></tr>`;
      mostrarMensagem(`Propriedade atualizada, mas a lista não pôde ser recarregada: ${erro.message}`, "error");
    }
  } catch (erro) {
    mensagemConfiguracao.textContent = erro.message;
    mensagemConfiguracao.className = "management-message management-full error";
  } finally {
    botaoSalvarConfiguracao.disabled = false;
  }
});

formPropriedade.addEventListener("submit", async event => {
  event.preventDefault();
  const dados = new FormData(formPropriedade);
  const nome = String(dados.get("nome") || "").trim();
  const municipio = String(dados.get("municipio") || "").trim();
  const uf = String(dados.get("uf") || "");
  const areaHa = Number(dados.get("areaHa"));
  if (!nome || !municipio || !uf || !Number.isFinite(areaHa) || areaHa <= 0) {
    mostrarMensagem("Preencha todos os campos com valores válidos.", "error");
    return;
  }

  botaoPropriedade.disabled = true;
  mostrarMensagem("Salvando propriedade…");
  try {
    await GW.requisitar("POST", "/api/propriedades", { nome, municipio, uf, areaHa });
    formPropriedade.reset();
    mostrarMensagem("Propriedade cadastrada.", "success");
    await carregarPropriedades();
  } catch (erro) {
    mostrarMensagem(erro.message, "error");
  } finally {
    botaoPropriedade.disabled = false;
  }
});

carregarPropriedades().catch(erro => {
  listaPropriedades.innerHTML = `<tr><td colspan="6" class="empty">${erro.message}</td></tr>`;
});
if (ehSuperadmin) carregarSensores().catch(erro => {
  sensoresCarregados = null;
  mostrarMensagem(`Não foi possível carregar os sensores: ${erro.message}`, "error");
});
