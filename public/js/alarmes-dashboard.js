/* =========================================================
   Green Weather — Início: "Histórico de alarmes"
   Carregue no FINAL do dashboard.html (depois do script principal).
   • Coloca o card de alarmes ao lado de "Últimas Leituras", abaixo do gráfico
   • Mostra um aviso vermelho no topo quando há alarme ativo
     (respeita o interruptor "Alarmes" das Configurações)
   ========================================================= */
(function(){
  const css = document.createElement("link");
  css.rel = "stylesheet"; css.href = "../css/alarmes.css";
  document.head.appendChild(css);

  const ICONES = {
    ambiente: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0zM12 9v4M12 17h.01"/></svg>',
    sensor:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 8.8a15 15 0 0120 0M5 12.5a10 10 0 0114 0M8.5 16a5 5 0 017 0M12 20h.01M3 3l18 18"/></svg>'
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const curto = d => d.slice(8, 10) + "/" + d.slice(5, 7);

  /* Mantém os dois cartões abaixo do gráfico, na mesma grade */
  const painel = document.querySelector(".painel-inferior");
  const card = document.createElement("article");
  card.className = "card";
  card.innerHTML = `
    <div class="table-head"><h2>Histórico de alarmes</h2><span id="alm-ativos"></span></div>
    <div class="alm-lista" id="alm-lista" aria-live="polite"><p class="alm-vazio">Carregando…</p></div>`;
  painel.appendChild(card);

  const banner = document.createElement("div");
  banner.className = "alm-banner"; banner.hidden = true;
  document.querySelector("main").prepend(banner);

  function desenha(d){
    document.getElementById("alm-ativos").textContent = d.ativosAgora ? `${d.ativosAgora} ativo(s) agora` : "Nenhum ativo";
    document.getElementById("alm-lista").innerHTML = d.alarmes.length
      ? d.alarmes.map(a => `
        <div class="alm-item">
          <span class="alm-ic ${a.categoria}">${ICONES[a.categoria] || ""}</span>
          <div class="alm-txt"><strong>${esc(a.titulo)}</strong><small title="${esc(a.descricao)}">${esc(a.descricao)}</small></div>
          <div class="alm-quando">${curto(a.data)} ${esc(a.hora)}<br>
            <span class="alm-badge ${a.ativo ? "ativo" : "resolvido"}">${a.ativo ? "Ativo" : "Resolvido"}</span></div>
        </div>`).join("")
      : '<p class="alm-vazio">Nenhum alarme registrado. Tudo certo por aqui.</p>';

    const ligado = typeof GWPrefs === "undefined" || GWPrefs.ler().alarmes;
    banner.hidden = !(ligado && d.ativosAgora > 0);
    banner.innerHTML = `${ICONES.ambiente}<span>${d.ativosAgora} alarme(s) ativo(s) agora</span><a href="historico.html">Ver histórico</a>`;
  }

  async function carregar(){
    try { desenha(await GW.requisitar("GET", "/api/alarmes?limite=5")); }
    catch (e) { document.getElementById("alm-lista").innerHTML = `<p class="alm-vazio">${esc(e.message)}</p>`; }
  }
  carregar();
  setInterval(carregar, 30000);
})();
