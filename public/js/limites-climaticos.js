"use strict";

const formLimites = document.getElementById("form-limites");
const mensagemLimites = document.getElementById("mensagem-limites");
const seletorPropriedade = document.getElementById("propriedade-limites");
const mensagemHeranca = document.getElementById("mensagem-heranca-limites");
const botaoRestaurar = document.getElementById("restaurar-limites");
const botaoSalvar = document.getElementById("salvar-limites");
const camposLimites = ["temperaturaMinima", "temperaturaMaxima", "umidadeMinima", "umidadeMaxima"];
const usuario = GW.usuarioAtual();
const ehSuperadmin = usuario && usuario.papel === "superadmin";
const VALOR_PADRAO = "__padrao__";

function mostrarMensagemLimites(texto, tipo = "") {
  mensagemLimites.textContent = texto;
  mensagemLimites.className = `management-message${tipo ? ` ${tipo}` : ""}`;
}

function idLimite(nome) {
  return nome.replace(/[A-Z]/g, letra => `-${letra.toLowerCase()}`);
}

function preencherLimites(limites) {
  for (const nome of camposLimites)
    document.getElementById(idLimite(nome)).value = limites[nome];
}

function urlLimites(propriedadeId) {
  return propriedadeId === VALOR_PADRAO
    ? "/api/limites-climaticos"
    : `/api/limites-climaticos?propriedadeId=${encodeURIComponent(propriedadeId)}`;
}

async function carregarLimites() {
  const propriedadeId = seletorPropriedade.value;
  if (!propriedadeId) return;
  botaoSalvar.disabled = true;
  const resposta = await GW.requisitar("GET", urlLimites(propriedadeId));
  const limites = propriedadeId === VALOR_PADRAO ? resposta.padrao : resposta.limites;
  const herdados = resposta.herdados;
  preencherLimites(limites);
  botaoRestaurar.hidden = propriedadeId === VALOR_PADRAO || herdados;
  mensagemHeranca.textContent = propriedadeId === VALOR_PADRAO
    ? "Este é o limite padrão usado por propriedades sem configuração própria."
    : herdados
      ? "Esta propriedade usa os limites padrão. Salvar definirá limites próprios para ela."
      : "Esta propriedade tem limites próprios configurados.";
  botaoSalvar.disabled = false;
  mostrarMensagemLimites("");
}

async function carregarPropriedades() {
  botaoSalvar.disabled = true;
  const { propriedades } = await GW.requisitar("GET", "/api/propriedades");
  seletorPropriedade.replaceChildren();
  if (ehSuperadmin) {
    const padrao = document.createElement("option");
    padrao.value = VALOR_PADRAO;
    padrao.textContent = "Padrão do sistema";
    seletorPropriedade.appendChild(padrao);
  }
  for (const propriedade of propriedades) {
    const opcao = document.createElement("option");
    opcao.value = propriedade.id;
    opcao.textContent = propriedade.nome;
    seletorPropriedade.appendChild(opcao);
  }
  if (!seletorPropriedade.options.length) {
    const vazia = document.createElement("option");
    vazia.value = "";
    vazia.textContent = "Nenhuma propriedade atribuída";
    seletorPropriedade.appendChild(vazia);
    seletorPropriedade.disabled = true;
    botaoSalvar.disabled = true;
    mensagemHeranca.textContent = "Não há propriedades atribuídas a esta conta.";
    return;
  }
  await carregarLimites();
}

seletorPropriedade.addEventListener("change", () => {
  carregarLimites().catch(erro => mostrarMensagemLimites(erro.message, "error"));
});

botaoRestaurar.addEventListener("click", async () => {
  const propriedadeId = seletorPropriedade.value;
  if (!propriedadeId || propriedadeId === VALOR_PADRAO) return;
  botaoRestaurar.disabled = true;
  mostrarMensagemLimites("Restaurando limites padrão…");
  try {
    await GW.requisitar("DELETE", urlLimites(propriedadeId));
    await carregarLimites();
    mostrarMensagemLimites("A propriedade voltou a usar os limites padrão.", "success");
  } catch (erro) {
    mostrarMensagemLimites(erro.message, "error");
  } finally {
    botaoRestaurar.disabled = false;
  }
});

formLimites.addEventListener("submit", async evento => {
  evento.preventDefault();
  if ([...formLimites.querySelectorAll("input")].some(input => !input.value || !input.checkValidity())) {
    mostrarMensagemLimites("Preencha todos os limites dentro das faixas permitidas.", "error");
    return;
  }
  const limites = Object.fromEntries(camposLimites.map(nome => [
    nome, Number(document.getElementById(idLimite(nome)).value)
  ]));
  const propriedadeId = seletorPropriedade.value;
  if (!propriedadeId) return;
  if (propriedadeId !== VALOR_PADRAO) limites.propriedadeId = propriedadeId;
  botaoSalvar.disabled = true;
  mostrarMensagemLimites("Salvando limites…");
  try {
    await GW.requisitar("PUT", "/api/limites-climaticos", limites);
    await carregarLimites();
    mostrarMensagemLimites("Limites climáticos atualizados.", "success");
  } catch (erro) {
    mostrarMensagemLimites(erro.message, "error");
  } finally {
    botaoSalvar.disabled = false;
  }
});

carregarPropriedades().catch(erro => mostrarMensagemLimites(erro.message, "error"));
