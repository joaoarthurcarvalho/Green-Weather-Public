
(function(){
  const css = document.createElement("link");
  css.rel = "stylesheet"; css.href = "../css/alarmes.css";
  document.head.appendChild(css);

  const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const br  = d => d.split("-").reverse().join("/");
  const p2  = n => String(n).padStart(2, "0");
  const dur = m => m < 60 ? `${m} min` : m < 1440 ? `${Math.floor(m / 60)} h${m % 60 ? " " + (m % 60) + " min" : ""}`
                                                  : `${Math.floor(m / 1440)} d${Math.floor(m % 1440 / 60) ? " " + Math.floor(m % 1440 / 60) + " h" : ""}`;

  /* ---- card "Frequência de alarmes" (no lugar do "Período selecionado") ---- */
  const cardFreq = document.getElementById("periodo").closest(".card");
  cardFreq.innerHTML = `
    <h3 class="card-title">Frequência de alarmes</h3>
    <div id="alm-freq"><p class="alm-vazio">Carregando…</p></div>
    <span id="periodo" hidden></span><span id="periodo-info" hidden></span>`;   /* ocultos: a página ainda escreve neles */

  /* ---- card "Registros de alarmes" ---- */
  const cardReg = document.createElement("section");
  cardReg.className = "card alm-registros";
  cardReg.innerHTML = `
    <div class="table-head"><h2>Registros de alarmes</h2><span id="alm-contagem">—</span></div>
    <div class="table-wrap" tabindex="0" aria-label="Histórico de alarmes; use a rolagem para ver todos os registros"><table>
      <thead><tr><th>Data</th><th>Início</th><th>Duração</th><th>Alarme</th><th>Sensor</th><th>Detalhe</th><th>Situação</th></tr></thead>
      <tbody id="alm-tabela"></tbody>
    </table></div>`;
  document.getElementById("tabela").closest(".card").insertAdjacentElement("afterend", cardReg);

  function diasDoPeriodo(ini, fim){
    const lista = [], d = new Date(ini + "T12:00:00"), f = new Date(fim + "T12:00:00");
    while (d <= f){ lista.push(`${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`); d.setDate(d.getDate() + 1); }
    return lista.slice(-31);
  }

  function desenha(ini, fim, d){
    /* frequência */
    const dias = diasDoPeriodo(ini, fim), maior = Math.max(1, ...dias.map(x => d.porDia[x] || 0));
    const t = k => d.porTipo[k] || 0;
    const temp = t("temperatura_alta") + t("temperatura_baixa"), umid = t("umidade_alta") + t("umidade_baixa");
    document.getElementById("alm-freq").innerHTML = `
      <div><span class="alm-total">${d.total} ${d.total === 1 ? "alarme" : "alarmes"}</span>
        <span class="alm-sub">${d.ativos} ativo(s)</span></div>
      <div class="alm-grafico">
        <div class="alm-barras" role="img" aria-label="Alarmes por dia no período">
          ${dias.map(x => { const c = d.porDia[x] || 0;
            return `<span class="alm-barra${c ? "" : " vazia"}" style="height:${c ? Math.max(15, c / maior * 100) : 8}%" title="${br(x)}: ${c} alarme(s)"></span>`; }).join("")}
        </div>
        <div class="alm-escala"><span>${br(dias[0])}</span><span>${br(dias[dias.length - 1])}</span></div>
      </div>
      <div class="alm-chips"><span>Temperatura <b>${temp}</b></span><span>Umidade <b>${umid}</b></span><span>Sensores <b>${t("sensor_offline")}</b></span></div>`;

    /* registros */
    document.getElementById("alm-contagem").textContent =
      `${d.total} registros${d.alarmes.length < d.total ? ` (mostrando ${d.alarmes.length})` : ""} • Mais recentes primeiro ↓`;
    document.getElementById("alm-tabela").innerHTML = d.alarmes.length
      ? d.alarmes.map(a => {
          const detalhe = a.descricao.replace(a.sensor + ": ", "").replace(a.sensor + " ", "");
          return `<tr>
            <td>${br(a.data)}</td><td>${esc(a.hora)}</td><td>${dur(a.duracaoMin)}</td>
            <td>${esc(a.titulo)}</td><td>${esc(a.sensor)}</td>
            <td class="alm-det">${esc(detalhe.charAt(0).toUpperCase() + detalhe.slice(1))}</td>
            <td><span class="alm-badge ${a.ativo ? "ativo" : "resolvido"}">${a.ativo ? "Ativo" : "Resolvido"}</span></td></tr>`; }).join("")
      : '<tr><td colspan="7" class="empty">Nenhum alarme no período selecionado.</td></tr>';
  }

  let pedido = 0;
  async function carregar(ini, fim){
    const meu = ++pedido;                                   // ignora respostas antigas se o filtro mudar rápido
    try {
      const d = await GW.requisitar("GET", `/api/alarmes?inicio=${ini}&fim=${fim}&limite=500`);
      if (meu === pedido) desenha(ini, fim, d);
    } catch (e) {
      if (meu !== pedido) return;
      document.getElementById("alm-freq").innerHTML = `<p class="alm-vazio">${esc(e.message)}</p>`;
      document.getElementById("alm-tabela").innerHTML = `<tr><td colspan="7" class="empty">${esc(e.message)}</td></tr>`;
    }
  }

  /* acompanha o filtro de datas da página */
  const renderAnterior = render;
  render = function(ini, fim){ renderAnterior(ini, fim); carregar(ini, fim); };
  carregar(document.getElementById("ini").value, document.getElementById("fim").value);
})();
