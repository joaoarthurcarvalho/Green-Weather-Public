"use strict";

const formFuncionario = document.getElementById("form-funcionario");
const listaFuncionarios = document.getElementById("lista-funcionarios");
const mensagemFuncionario = document.getElementById("mensagem-funcionario");
const mensagemLista = document.getElementById("mensagem-lista");
const botaoFuncionario = document.getElementById("salvar-funcionario");
const tabFuncionarios = document.getElementById("tab-funcionarios");
const tabSenhaDoDia = document.getElementById("tab-senha-do-dia");
const painelFuncionarios = document.getElementById("painel-funcionarios");
const painelSenhaDoDia = document.getElementById("painel-senha-do-dia");
const codigoSenhaDoDia = document.getElementById("codigo-senha-do-dia");
const dataSenhaDoDia = document.getElementById("data-senha-do-dia");
const mensagemSenhaDoDia = document.getElementById("mensagem-senha-do-dia");
const botaoAtualizarSenhaDoDia = document.getElementById("atualizar-senha-do-dia");

function mostrarMensagem(texto, tipo = "") {
  mensagemFuncionario.textContent = texto;
  mensagemFuncionario.className = `management-message${tipo ? ` ${tipo}` : ""}`;
}

async function carregarFuncionarios() {
  const { funcionarios } = await GW.requisitar("GET", "/api/funcionarios");
  listaFuncionarios.replaceChildren();
  for (const funcionario of funcionarios) {
    const linha = document.createElement("tr");
    const dados = [
      funcionario.matricula || "—",
      `${funcionario.nome} ${funcionario.sobrenome}`,
      funcionario.email,
      funcionario.papel === "superadmin" ? "Superadmin" :
        funcionario.papel === "engenheiro" ? "Engenheiro agrônomo" : "Funcionário"
    ];
    for (const valor of dados) {
      const celula = document.createElement("td");
      celula.textContent = valor;
      linha.appendChild(celula);
    }
    const status = document.createElement("td");
    status.textContent = funcionario.ativo === false ? "Desativada" : "Ativa";
    status.className = funcionario.ativo === false ? "management-status inactive" : "management-status";
    linha.appendChild(status);

    const acoes = document.createElement("td");
    if (funcionario.papel === "superadmin") {
      acoes.textContent = "—";
    } else {
      const botaoStatus = document.createElement("button");
      botaoStatus.type = "button";
      botaoStatus.className = "management-status-button";
      botaoStatus.textContent = funcionario.ativo === false ? "Ativar" : "Desativar";
      botaoStatus.setAttribute(
        "aria-label",
        `${funcionario.ativo === false ? "Ativar" : "Desativar"} conta de ${funcionario.nome} ${funcionario.sobrenome}`
      );
      botaoStatus.addEventListener("click", () => alterarStatusFuncionario(funcionario, botaoStatus));
      acoes.appendChild(botaoStatus);

      const botaoExcluir = document.createElement("button");
      botaoExcluir.type = "button";
      botaoExcluir.className = "management-delete-button";
      botaoExcluir.textContent = "Excluir";
      botaoExcluir.setAttribute("aria-label", `Excluir conta de ${funcionario.nome} ${funcionario.sobrenome}`);
      botaoExcluir.addEventListener("click", () => excluirFuncionario(funcionario, botaoExcluir));
      acoes.appendChild(botaoExcluir);
    }
    linha.appendChild(acoes);
    listaFuncionarios.appendChild(linha);
  }
  if (!funcionarios.length) {
    const linha = document.createElement("tr");
    const celula = document.createElement("td");
    celula.colSpan = 6;
    celula.className = "empty";
    celula.textContent = "Nenhuma conta cadastrada.";
    linha.appendChild(celula);
    listaFuncionarios.appendChild(linha);
  }
}

async function carregarSenhaDoDia(rotacionar = false) {
  mensagemSenhaDoDia.textContent = "Carregando senha…";
  mensagemSenhaDoDia.className = "management-message";
  botaoAtualizarSenhaDoDia.disabled = true;
  try {
    const metodo = rotacionar ? "POST" : "GET";
    const { senha, data } = await GW.requisitar(metodo, "/api/funcionarios/senha-do-dia");
    codigoSenhaDoDia.textContent = senha;
    dataSenhaDoDia.textContent = data;
    mensagemSenhaDoDia.textContent = rotacionar
      ? "Nova senha gerada. A senha anterior foi invalidada."
      : "A senha é atualizada automaticamente no início de cada dia.";
  } catch (erro) {
    codigoSenhaDoDia.textContent = "Indisponível";
    mensagemSenhaDoDia.textContent = erro.message;
    mensagemSenhaDoDia.className = "management-message error";
  } finally {
    botaoAtualizarSenhaDoDia.disabled = false;
  }
}

function selecionarAba(senhaDoDia) {
  tabFuncionarios.classList.toggle("active", !senhaDoDia);
  tabSenhaDoDia.classList.toggle("active", senhaDoDia);
  tabFuncionarios.setAttribute("aria-selected", String(!senhaDoDia));
  tabSenhaDoDia.setAttribute("aria-selected", String(senhaDoDia));
  tabFuncionarios.tabIndex = senhaDoDia ? -1 : 0;
  tabSenhaDoDia.tabIndex = senhaDoDia ? 0 : -1;
  painelFuncionarios.hidden = senhaDoDia;
  painelSenhaDoDia.hidden = !senhaDoDia;
  if (senhaDoDia) carregarSenhaDoDia();
}

tabFuncionarios.addEventListener("click", () => selecionarAba(false));
tabSenhaDoDia.addEventListener("click", () => selecionarAba(true));
botaoAtualizarSenhaDoDia.addEventListener("click", () => carregarSenhaDoDia(true));
setInterval(() => {
  if (!painelSenhaDoDia.hidden) carregarSenhaDoDia();
}, 60_000);

async function alterarStatusFuncionario(funcionario, botao) {
  const nome = `${funcionario.nome} ${funcionario.sobrenome}`;
  const novoStatus = funcionario.ativo === false;
  const acao = novoStatus ? "ativar" : "desativar";
  if (!window.confirm(`${novoStatus ? "Ativar" : "Desativar"} a conta de ${nome} (${funcionario.email})?`)) return;

  botao.disabled = true;
  mensagemLista.textContent = "";
  mensagemLista.className = "management-message";
  try {
    await GW.requisitar("PATCH", "/api/funcionarios", { id: funcionario.id, ativo: novoStatus });
  } catch (erro) {
    mensagemLista.textContent = erro.message;
    mensagemLista.className = "management-message error";
    botao.disabled = false;
    return;
  }

  mensagemLista.textContent = `Conta de ${nome} ${novoStatus ? "ativada" : "desativada"}.`;
  mensagemLista.className = "management-message success";
  try {
    await carregarFuncionarios();
  } catch (erro) {
    mensagemLista.textContent = `Conta ${acao}, mas não foi possível atualizar a lista: ${erro.message}`;
    mensagemLista.className = "management-message error";
  }
}

async function excluirFuncionario(funcionario, botao) {
  const nome = `${funcionario.nome} ${funcionario.sobrenome}`;
  if (!window.confirm(`Excluir a conta de ${nome} (${funcionario.email})?`)) return;

  botao.disabled = true;
  mensagemLista.textContent = "";
  mensagemLista.className = "management-message";
  try {
    await GW.requisitar("DELETE", "/api/funcionarios", { id: funcionario.id });
  } catch (erro) {
    mensagemLista.textContent = erro.message;
    mensagemLista.className = "management-message error";
    botao.disabled = false;
    return;
  }

  mensagemLista.textContent = `Conta de ${nome} excluída.`;
  mensagemLista.className = "management-message success";
  try {
    await carregarFuncionarios();
  } catch (erro) {
    mensagemLista.textContent = `Conta excluída, mas não foi possível atualizar a lista: ${erro.message}`;
    mensagemLista.className = "management-message error";
  }
}

formFuncionario.addEventListener("submit", async event => {
  event.preventDefault();
  const dados = new FormData(formFuncionario);
  const nome = String(dados.get("nome") || "").trim();
  const email = String(dados.get("email") || "").trim();
  const senha = String(dados.get("senha") || "");
  const papel = String(dados.get("papel") || "");
  if (!nome || !email || !senha) {
    mostrarMensagem("Preencha nome, e-mail e senha.", "error");
    return;
  }
  if (senha.length < 6) {
    mostrarMensagem("A senha precisa ter pelo menos 6 caracteres.", "error");
    return;
  }

  botaoFuncionario.disabled = true;
  mostrarMensagem("Criando a conta…");
  try {
    const { funcionario } = await GW.requisitar("POST", "/api/funcionarios", { nome, email, senha, papel });
    formFuncionario.reset();
    mostrarMensagem(`Conta criada. Matrícula: ${funcionario.matricula}`, "success");
    await carregarFuncionarios();
  } catch (erro) {
    mostrarMensagem(erro.message, "error");
  } finally {
    botaoFuncionario.disabled = false;
  }
});

carregarFuncionarios().catch(erro => {
  const linha = document.createElement("tr");
  const celula = document.createElement("td");
  celula.colSpan = 6;
  celula.className = "empty";
  celula.textContent = erro.message;
  linha.appendChild(celula);
  listaFuncionarios.replaceChildren(linha);
});
