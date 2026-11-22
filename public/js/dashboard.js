(function(){
  const nomesDias = ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
  const resumoElementos = {
    temperatura: document.getElementById("temp"),
    temperaturaStatus: document.getElementById("temp-status"),
    umidade: document.getElementById("umid"),
    umidadeStatus: document.getElementById("umid-status"),
    sensores: document.getElementById("sensores"),
    sensoresStatus: document.getElementById("sensores-status"),
    faixaTemperatura: document.getElementById("faixa-temperatura"),
    faixaUmidade: document.getElementById("faixa-umidade")
  };
  const tabela = document.getElementById("leituras");
  const svg = document.getElementById("chart");
  const tip = document.getElementById("tip");
  let pontosGrafico = [];
  let geometriaGrafico = null;
  let limites = null;
  let sensoresOnline = new Map();
  let resumoAtual = null;
  let leiturasAtuais = [];

  function atualizaRelogio(){
    const data = new Date();
    const doisDigitos = numero => String(numero).padStart(2, "0");
    document.getElementById("dia").textContent = nomesDias[data.getDay()];
    document.getElementById("data").textContent =
      `${doisDigitos(data.getDate())}/${doisDigitos(data.getMonth() + 1)}/${data.getFullYear()}`;
    document.getElementById("hora").textContent =
      `${doisDigitos(data.getHours())}:${doisDigitos(data.getMinutes())}`;
  }

  function classifica(elemento, valor, minimo, maximo){
    elemento.classList.remove("warn", "danger");
    if (!Number.isFinite(valor)) {
      elemento.textContent = "Sem leituras recentes";
      return;
    }
    if (valor < minimo || valor > maximo) {
      elemento.classList.add("warn");
      elemento.textContent = valor < minimo ? "Abaixo do ideal" : "Acima do ideal";
      return;
    }
    elemento.textContent = "Dentro do ideal";
  }

  function atualizarCartoes(resumo){
    resumoAtual = resumo;
    const temperatura = Number.isFinite(resumo.temp) ? resumo.temp : null;
    const umidade = Number.isFinite(resumo.umid) ? resumo.umid : null;
    resumoElementos.temperatura.textContent =
      temperatura === null ? "—" : `${temperatura.toFixed(1)} °C`;
    resumoElementos.umidade.textContent =
      umidade === null ? "—" : `${Math.round(umidade)} %`;
    resumoElementos.sensores.textContent = `${resumo.sensoresOnline} / ${resumo.sensoresTotal}`;
    resumoElementos.sensoresStatus.classList.remove("warn", "danger");

    if (resumo.sensoresTotal === 0) {
      resumoElementos.sensoresStatus.textContent = "Nenhum sensor disponível";
    } else if (resumo.sensoresOnline < resumo.sensoresTotal) {
      resumoElementos.sensoresStatus.classList.add("warn");
      resumoElementos.sensoresStatus.textContent =
        `${resumo.sensoresTotal - resumo.sensoresOnline} offline`;
    } else {
      resumoElementos.sensoresStatus.textContent = "Todos online";
    }

    sensoresOnline = new Map((resumo.sensores || []).map(sensor => [sensor.id, sensor.online]));
    desenharTabela(leiturasAtuais);
    if (limites) {
      classifica(resumoElementos.temperaturaStatus, temperatura, limites.temperaturaMinima, limites.temperaturaMaxima);
      classifica(resumoElementos.umidadeStatus, umidade, limites.umidadeMinima, limites.umidadeMaxima);
    } else {
      classifica(resumoElementos.temperaturaStatus, temperatura, 20, 30);
      classifica(resumoElementos.umidadeStatus, umidade, 50, 80);
    }
  }

  function formatoDataHora(leitura){
    const [ano, mes, dia] = leitura.data.split("-");
    return `${dia}/${mes} ${leitura.hora}`;
  }

  function montarPontos(leituraLista){
    const grupos = new Map();
    leituraLista.forEach(leitura => {
      if (!Number.isFinite(leitura.t) || !Number.isFinite(leitura.u)) return;
      const chave = `${leitura.data} ${leitura.hora}`;
      let grupo = grupos.get(chave);
      if (!grupo) {
        grupo = { data: leitura.data, hora: leitura.hora, somaT: 0, somaU: 0, total: 0 };
        grupos.set(chave, grupo);
      }
      grupo.somaT += leitura.t;
      grupo.somaU += leitura.u;
      grupo.total++;
    });

    return [...grupos.values()]
      .map(grupo => ({
        data: grupo.data,
        hora: grupo.hora,
        h: grupo.hora,
        dataHora: formatoDataHora(grupo),
        t: grupo.somaT / grupo.total,
        u: grupo.somaU / grupo.total
      }))
      .sort((a, b) => `${a.data} ${a.hora}`.localeCompare(`${b.data} ${b.hora}`))
      .slice(-12);
  }

  function desenharGrafico(serie){
    pontosGrafico = serie;
    tip.style.opacity = 0;
    if (!serie.length) {
      geometriaGrafico = null;
      svg.innerHTML = '<text x="320" y="130" fill="#9fb3d9" font-size="14" text-anchor="middle">Nenhuma leitura real disponível</text>';
      svg.setAttribute("aria-label", "Sem leituras reais disponíveis para o gráfico");
      return;
    }

    const W = 640, H = 270, L = 46, R = 42, T = 16, B = 44;
    const iw = W - L - R, ih = H - T - B;
    const menor = Math.min(...serie.map(ponto => ponto.t));
    const maior = Math.max(...serie.map(ponto => ponto.t));
    const margem = Math.max(2, (maior - menor) * 0.1);
    const minT = menor - margem, maxT = maior + margem;
    const x = indice => serie.length === 1 ? L + iw / 2 : L + indice * iw / (serie.length - 1);
    const yT = valor => T + ih - (valor - minT) / (maxT - minT) * ih;
    const yU = valor => T + ih - valor / 100 * ih;
    const linha = (escala, chave) =>
      serie.map((ponto, indice) => `${indice ? "L" : "M"}${x(indice).toFixed(1)},${escala(ponto[chave]).toFixed(1)}`).join(" ");
    const area = (escala, chave) =>
      `${linha(escala, chave)} L${x(serie.length - 1)},${T + ih} L${x(0)},${T + ih} Z`;
    const passo = (maxT - minT) / 5;

    geometriaGrafico = { W, L, T, ih, x, yT, yU };
    let markup = `<defs>
      <linearGradient id="gT" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cfc4a" stop-opacity=".35"/><stop offset="1" stop-color="#7cfc4a" stop-opacity="0"/></linearGradient>
      <linearGradient id="gU" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7b8cff" stop-opacity=".30"/><stop offset="1" stop-color="#7b8cff" stop-opacity="0"/></linearGradient>
    </defs>`;

    for (let indice = 0; indice <= 5; indice++) {
      const valor = minT + indice * passo;
      const y = yT(valor);
      markup += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="#fff" stroke-opacity=".1" stroke-dasharray="3 4"/>
        <text x="${L - 8}" y="${y + 3}" fill="#9fb3d9" font-size="10" text-anchor="end">${valor.toFixed(1)}°C</text>`;
    }
    for (let valor = 0; valor <= 100; valor += 25) {
      markup += `<text x="${W - R + 8}" y="${yU(valor) + 3}" fill="#9fb3d9" font-size="10">${valor}%</text>`;
    }
    serie.forEach((ponto, indice) => {
      markup += `<text x="${x(indice)}" y="${H - 20}" fill="#cfe0ff" font-size="10" text-anchor="middle">${ponto.h}</text>`;
    });

    markup += `<path d="${area(yU, "u")}" fill="url(#gU)"/><path d="${area(yT, "t")}" fill="url(#gT)"/>
      <path d="${linha(yU, "u")}" fill="none" stroke="#7b8cff" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="${linha(yT, "t")}" fill="none" stroke="#7cfc4a" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    serie.forEach((ponto, indice) => {
      markup += `<circle cx="${x(indice)}" cy="${yU(ponto.u)}" r="3.5" fill="#7b8cff" stroke="#0e2757" stroke-width="1.5"/>
        <circle cx="${x(indice)}" cy="${yT(ponto.t)}" r="3.5" fill="#7cfc4a" stroke="#0e2757" stroke-width="1.5"/>`;
    });
    const larguraHover = serie.length === 1 ? iw : iw / (serie.length - 1);
    serie.forEach((ponto, indice) => {
      const inicio = serie.length === 1 ? L : x(indice) - larguraHover / 2;
      markup += `<rect data-i="${indice}" x="${inicio}" y="${T}" width="${larguraHover}" height="${ih}" fill="transparent"/>`;
    });
    svg.innerHTML = markup;
    svg.setAttribute("aria-label", `Temperatura e umidade em ${serie.length} horários com leituras reais`);
  }

  function desenharTabela(leituraLista){
    const maisRecentes = leituraLista.slice(0, 7);
    if (!maisRecentes.length) {
      tabela.innerHTML = '<tr><td colspan="5">Nenhuma leitura real disponível.</td></tr>';
      return;
    }
    tabela.innerHTML = maisRecentes.map(leitura => {
      const online = sensoresOnline.get(leitura.sensor);
      const status = online === undefined ? "Indisponível" : online ? "Online" : "Offline";
      const hora = `${leitura.data.split("-").reverse().join("/")} ${leitura.hora}`;
      return `<tr>
        <td>${hora}</td>
        <td>${escaparHtml(leitura.sensor)}</td>
        <td>${leitura.t.toFixed(1)} °C</td>
        <td>${Math.round(leitura.u)} %</td>
        <td><span class="badge ${online === false ? "off" : ""}">${status}</span></td>
      </tr>`;
    }).join("");
  }

  function escaparHtml(valor){
    return String(valor).replace(/[&<>"']/g, caractere => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[caractere]);
  }

  async function carregarResumo(){
    try {
      const resumo = await GW.requisitar("GET", "/api/resumo");
      atualizarCartoes(resumo);
    } catch (erro) {
      sensoresOnline = new Map();
      desenharTabela(leiturasAtuais);
      resumoElementos.temperatura.textContent = "—";
      resumoElementos.umidade.textContent = "—";
      resumoElementos.sensores.textContent = "—";
      resumoElementos.temperaturaStatus.classList.remove("warn", "danger");
      resumoElementos.umidadeStatus.classList.remove("warn", "danger");
      resumoElementos.temperaturaStatus.textContent = "Não foi possível carregar";
      resumoElementos.umidadeStatus.textContent = "Não foi possível carregar";
      resumoElementos.sensoresStatus.textContent = "Não foi possível carregar";
      console.error("Não foi possível carregar o resumo dos sensores:", erro);
    }
  }

  async function carregarLeituras(){
    try {
      const resposta = await GW.requisitar("GET", "/api/leituras?intervalo=60&limite=2000&ordem=desc");
      const leituraLista = resposta.leituras || [];
      leiturasAtuais = leituraLista;
      const serie = montarPontos(leituraLista);
      desenharTabela(leituraLista);
      desenharGrafico(serie);
      if (typeof window.GWAtualizarVistaDashboard === "function") {
        window.GWAtualizarVistaDashboard(serie);
      }
    } catch (erro) {
      leiturasAtuais = [];
      tabela.innerHTML = `<tr><td colspan="5">Não foi possível carregar as leituras: ${escaparHtml(erro.message)}</td></tr>`;
      desenharGrafico([]);
      if (typeof window.GWAtualizarVistaDashboard === "function") {
        window.GWAtualizarVistaDashboard([]);
      }
      console.error("Não foi possível carregar as leituras do painel:", erro);
    }
  }

  async function carregarLimites(){
    try {
      ({ limites } = await GW.requisitar("GET", "/api/limites-climaticos"));
      resumoElementos.faixaTemperatura.textContent =
        `Faixa ideal: ${limites.temperaturaMinima} – ${limites.temperaturaMaxima} °C`;
      resumoElementos.faixaUmidade.textContent =
        `Faixa ideal: ${limites.umidadeMinima} – ${limites.umidadeMaxima} %`;
      if (resumoAtual) atualizarCartoes(resumoAtual);
    } catch (erro) {
      console.error("Não foi possível carregar os limites climáticos:", erro);
    }
  }

  svg.addEventListener("mousemove", evento => {
    const alvo = evento.target.closest("rect[data-i]");
    if (!alvo || !geometriaGrafico) {
      tip.style.opacity = 0;
      return;
    }
    const indice = Number(alvo.dataset.i);
    const ponto = pontosGrafico[indice];
    const escala = svg.getBoundingClientRect().width / geometriaGrafico.W;
    tip.innerHTML = `<b>${ponto.h}</b><span style="color:#7cfc4a">●</span> ${ponto.t.toFixed(1)} °C &nbsp; <span style="color:#7b8cff">●</span> ${Math.round(ponto.u)} %`;
    tip.style.left = `${geometriaGrafico.x(indice) * escala}px`;
    tip.style.top = `${Math.min(geometriaGrafico.yT(ponto.t), geometriaGrafico.yU(ponto.u)) * escala}px`;
    tip.style.opacity = 1;
  });
  svg.addEventListener("mouseleave", () => { tip.style.opacity = 0; });

  atualizaRelogio();
  setInterval(atualizaRelogio, 1000);
  carregarLimites();
  carregarResumo();
  carregarLeituras();
  setInterval(() => {
    carregarResumo();
    carregarLeituras();
  }, 60 * 1000);
})();
