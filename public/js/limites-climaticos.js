"use strict";

const formLimites = document.getElementById("form-limites");
const mensagemLimites = document.getElementById("mensagem-limites");
const camposLimites = ["temperaturaMinima", "temperaturaMaxima", "umidadeMinima", "umidadeMaxima"];

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

async function carregarLimites() {
  const { limites } = await GW.requisitar("GET", "/api/limites-climaticos");
  preencherLimites(limites);
}

formLimites.addEventListener("submit", async evento => {
  evento.preventDefault();
  const botao = document.getElementById("salvar-limites");
  if ([...formLimites.querySelectorAll("input")].some(input => !input.value || !input.checkValidity())) {
    mostrarMensagemLimites("Preencha todos os limites dentro das faixas permitidas.", "error");
    return;
  }
  const limites = Object.fromEntries(camposLimites.map(nome => [
    nome, Number(document.getElementById(idLimite(nome)).value)
  ]));
  botao.disabled = true;
  mostrarMensagemLimites("Salvando limites…");
  try {
    const resposta = await GW.requisitar("PUT", "/api/limites-climaticos", limites);
    preencherLimites(resposta.limites);
    mostrarMensagemLimites("Limites climáticos atualizados.", "success");
  } catch (erro) {
    mostrarMensagemLimites(erro.message, "error");
  } finally {
    botao.disabled = false;
  }
});

carregarLimites().catch(erro => mostrarMensagemLimites(erro.message, "error"));
