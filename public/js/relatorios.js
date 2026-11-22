"use strict";

const $ = id => document.getElementById(id);
const formRelatorio = $("form-relatorio");
const mensagemRelatorio = $("mensagem-relatorio");
const relatorio = $("relatorio");
const listaRelatorios = $("lista-relatorios");
const ptNumero = valor => valor === null ? "—" : valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const brData = data => data.split("-").reverse().join("/");

function mostrarMensagem(elemento, texto, tipo = "") {
  elemento.textContent = texto;
  elemento.className = `management-message${tipo ? ` ${tipo}` : ""}`;
}

function adicionarMetrica(titulo, valor) {
  const item = document.createElement("div");
  item.className = "report-item";
  const nome = document.createElement("strong");
  nome.textContent = titulo;
  const dado = document.createElement("span");
  dado.textContent = valor;
  item.append(nome, dado);
  return item;
}

function adicionarSecao(titulo, itens) {
  const secao = document.createElement("section");
  const cabecalho = document.createElement("h3");
  cabecalho.textContent = titulo;
  const grade = document.createElement("div");
  grade.className = "report-grid";
  for (const [nome, valor] of itens) grade.appendChild(adicionarMetrica(nome, valor));
  secao.append(cabecalho, grade);
  relatorio.appendChild(secao);
}

function formatarExtremo(extremo, unidade) {
  if (!extremo) return "Sem leituras";
  return `${ptNumero(extremo.valor)} ${unidade} · ${extremo.sensor} · ${brData(extremo.data)} ${extremo.hora}`;
}

function renderizarRelatorio(dados, observacoes) {
  relatorio.replaceChildren();
  const titulo = document.createElement("h2");
  titulo.textContent = "Relatório técnico climático";
  const meta = document.createElement("p");
  meta.className = "report-meta";
  meta.textContent = `Período: ${brData(dados.inicio)} a ${brData(dados.fim)} · Gerado em ${new Date(dados.geradoEm).toLocaleString("pt-BR")}`;
  relatorio.append(titulo, meta);

  const r = dados.resumo, l = dados.limites;
  adicionarSecao("Resumo das leituras", [
    ["Leituras consideradas", String(r.leituras)],
    ["Sensores monitorados", String(r.sensores)],
    ["Temperatura média", r.temperaturaMedia === null ? "Sem leituras" : `${ptNumero(r.temperaturaMedia)} °C`],
    ["Umidade média", r.umidadeMedia === null ? "Sem leituras" : `${ptNumero(r.umidadeMedia)} %`],
    ["Leituras fora da faixa de temperatura", String(r.leiturasForaTemperatura)],
    ["Leituras fora da faixa de umidade", String(r.leiturasForaUmidade)]
  ]);
  adicionarSecao("Extremos observados", [
    ["Temperatura mínima", formatarExtremo(r.temperaturaMinima, "°C")],
    ["Temperatura máxima", formatarExtremo(r.temperaturaMaxima, "°C")],
    ["Umidade mínima", formatarExtremo(r.umidadeMinima, "%")],
    ["Umidade máxima", formatarExtremo(r.umidadeMaxima, "%")]
  ]);
  adicionarSecao("Faixas e alarmes", [
    ["Temperatura configurada", `${ptNumero(l.temperaturaMinima)} a ${ptNumero(l.temperaturaMaxima)} °C`],
    ["Umidade configurada", `${ptNumero(l.umidadeMinima)} a ${ptNumero(l.umidadeMaxima)} %`],
    ["Alarmes no período", String(dados.alarmes.total)],
    ["Alarmes ainda ativos", String(dados.alarmes.ativos)]
  ]);

  const porTipo = Object.entries(dados.alarmes.porTipo);
  if (porTipo.length) {
    const lista = document.createElement("p");
    lista.className = "report-note";
    lista.textContent = `Alarmes por tipo: ${porTipo.map(([tipo, total]) => `${tipo.replaceAll("_", " ")} (${total})`).join("; ")}.`;
    relatorio.appendChild(lista);
  }
  const nota = document.createElement("p");
  nota.className = "report-note";
  nota.textContent = "Relatório calculado a partir das leituras e alarmes armazenados localmente. Leituras demonstrativas foram excluídas.";
  relatorio.appendChild(nota);
  if (observacoes.trim()) {
    const secaoObservacoes = document.createElement("section");
    const tituloObservacoes = document.createElement("h3");
    tituloObservacoes.textContent = "Observações técnicas";
    const textoObservacoes = document.createElement("p");
    textoObservacoes.className = "report-observation-text";
    textoObservacoes.textContent = observacoes;
    secaoObservacoes.append(tituloObservacoes, textoObservacoes);
    relatorio.appendChild(secaoObservacoes);
  }
  const fechar = document.createElement("button");
  fechar.type = "button";
  fechar.className = "report-close";
  fechar.textContent = "Fechar relatório";
  fechar.addEventListener("click", () => {
    relatorio.hidden = true;
    $("imprimir-relatorio").disabled = true;
  });
  relatorio.appendChild(fechar);
  relatorio.hidden = false;
  $("imprimir-relatorio").disabled = false;
}

function adicionarCelula(linha, valor) {
  const celula = document.createElement("td");
  celula.textContent = valor;
  linha.appendChild(celula);
  return celula;
}

function renderizarRelatoriosSalvos(relatorios) {
  listaRelatorios.replaceChildren();
  if (!relatorios.length) {
    const linha = document.createElement("tr");
    const celula = adicionarCelula(linha, "Nenhum relatório salvo ainda.");
    celula.colSpan = 5;
    celula.className = "empty";
    listaRelatorios.appendChild(linha);
    return;
  }
  for (const salvo of relatorios) {
    const linha = document.createElement("tr");
    adicionarCelula(linha, new Date(salvo.geradoEm).toLocaleString("pt-BR"));
    adicionarCelula(linha, `${brData(salvo.inicio)} a ${brData(salvo.fim)}`);
    adicionarCelula(linha, String(salvo.resumo.leituras));
    adicionarCelula(linha, salvo.observacoes || "—");
    const acoes = adicionarCelula(linha, "");
    const abrir = document.createElement("button");
    abrir.type = "button";
    abrir.className = "saved-report-open";
    abrir.textContent = "Abrir";
    abrir.addEventListener("click", () => abrirRelatorioSalvo(salvo));
    acoes.appendChild(abrir);
    listaRelatorios.appendChild(linha);
  }
}

async function carregarRelatoriosSalvos() {
  try {
    const { relatorios } = await GW.requisitar("GET", "/api/relatorios-tecnicos");
    renderizarRelatoriosSalvos(relatorios);
  } catch (erro) {
    const linha = document.createElement("tr");
    const celula = adicionarCelula(linha, erro.message);
    celula.colSpan = 5;
    celula.className = "empty";
    listaRelatorios.replaceChildren(linha);
  }
}

function abrirRelatorioSalvo(salvo) {
  $("data-inicial").value = salvo.inicio;
  $("data-final").value = salvo.fim;
  $("observacoes").value = salvo.observacoes || "";
  renderizarRelatorio(salvo, salvo.observacoes || "");
  mostrarMensagem(mensagemRelatorio, "Relatório salvo aberto.", "success");
  relatorio.scrollIntoView({ behavior: "smooth", block: "start" });
}

formRelatorio.addEventListener("submit", async event => {
  event.preventDefault();
  const inicio = $("data-inicial").value, fim = $("data-final").value;
  const observacoes = $("observacoes").value;
  if (!inicio || !fim || inicio > fim) {
    mostrarMensagem(mensagemRelatorio, "Informe um período válido, com data inicial menor ou igual à final.", "error");
    return;
  }
  const botao = $("gerar-relatorio");
  botao.disabled = true;
  $("imprimir-relatorio").disabled = true;
  mostrarMensagem(mensagemRelatorio, "Gerando relatório…");
  try {
    const { relatorio: salvo } = await GW.requisitar("POST", "/api/relatorios-tecnicos", {
      inicio, fim, observacoes
    });
    renderizarRelatorio(salvo, observacoes);
    await carregarRelatoriosSalvos();
    mostrarMensagem(mensagemRelatorio, "Relatório técnico gerado.", "success");
  } catch (erro) {
    mostrarMensagem(mensagemRelatorio, erro.message, "error");
  } finally {
    botao.disabled = false;
  }
});

$("imprimir-relatorio").addEventListener("click", () => window.print());

const hoje = new Date();
const hojeISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
const inicioDefault = new Date(hoje);
inicioDefault.setDate(inicioDefault.getDate() - 6);
$("data-inicial").value = `${inicioDefault.getFullYear()}-${String(inicioDefault.getMonth() + 1).padStart(2, "0")}-${String(inicioDefault.getDate()).padStart(2, "0")}`;
$("data-final").value = hojeISO;
carregarRelatoriosSalvos();

