/* =========================================================
   Green Weather Historico: versao em grafico
   ========================================================= */
(function(){
  const css = document.createElement("link");
  css.rel = "stylesheet"; css.href = "../css/vistas.css";
  document.head.appendChild(css);

  const fmt1 = v => v.toFixed(1).replace(".", ",");
  const p2   = n => String(n).padStart(2, "0");

  /* O conteudo atual do cartao vira a "vista de texto" e ganha uma "vista de grafico" ao lado */
  const alvo = {};
  ["tmax", "umax", "periodo"].forEach(id => {
    const card = document.getElementById(id).closest(".card");
    card.querySelector(".stat-row").classList.add("vista-texto");
    const box = document.createElement("div");
    box.className = "vista-grafico";
    card.appendChild(box);
    alvo[id] = box;
  });

  /* Medidor horizontal com faixa ideal */
  function medidor({valor, quando, min, max, ideMin, ideMax, un, txt}){
    const pct  = v => Math.max(0, Math.min(100, (v - min) / (max - min) * 100));
    const tem  = valor !== null;
    const fora = tem && (valor < ideMin || valor > ideMax);
    return `
      <div class="g-topo"><span class="g-valor">${tem ? txt(valor) : "—"}</span><span class="g-quando">${quando}</span></div>
      <div class="g-trilho${fora ? " fora" : ""}" role="img" aria-label="${tem ? txt(valor) : "Sem dados"}, em uma escala de ${min} a ${max}${un}">
        ${tem ? `<div class="g-preench" style="width:${pct(valor)}%"></div>` : ""}
        <div class="g-ideal" style="left:${pct(ideMin)}%;width:${pct(ideMax) - pct(ideMin)}%"></div>
        ${tem ? `<div class="g-marca" style="left:${pct(valor)}%"></div>` : ""}
      </div>
      <div class="g-escala"><span>${min}${un}</span><span>Ideal ${ideMin}–${ideMax}${un}</span><span>${max}${un}</span></div>`;
  }

  /* Dias do periodo (no maximo os ultimos 31, para as barras caberem) */
  function diasDoPeriodo(ini, fim){
    const lista = [], d = new Date(ini + "T12:00:00"), f = new Date(fim + "T12:00:00");
    while (d <= f){ lista.push(`${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`); d.setDate(d.getDate() + 1); }
    return lista.slice(-31);
  }

  function desenha(ini, fim){
    const lista = leituras.filter(r => r.data >= ini && r.data <= fim);
    const mT = lista.length ? lista.reduce((a, b) => b.t > a.t ? b : a) : null;
    const mU = lista.length ? lista.reduce((a, b) => b.u > a.u ? b : a) : null;
    const quando = r => r ? `${br(r.data)} às ${r.hora}` : "Sem leituras no período";

    alvo.tmax.innerHTML = medidor({valor: mT ? mT.t : null, quando: quando(mT), min: 0, max: 50, ideMin: 20, ideMax: 30, un: "°C", txt: v => fmt1(v) + " °C"});
    alvo.umax.innerHTML = medidor({valor: mU ? mU.u : null, quando: quando(mU), min: 0, max: 100, ideMin: 50, ideMax: 80, un: "%",  txt: v => v + " %"});

    const dias = diasDoPeriodo(ini, fim), cont = {};
    lista.forEach(r => cont[r.data] = (cont[r.data] || 0) + 1);
    const maiorCont = Math.max(1, ...Object.values(cont));
    const nDias = diasNoPeriodo(ini, fim);
    alvo.periodo.innerHTML = `
      <div class="g-topo"><span class="g-valor g-valor-sm">${textoPeriodo(ini, fim)}</span></div>
      <div class="p-barras" role="img" aria-label="Leituras por dia no período">
        ${dias.map(d => { const c = cont[d] || 0;
          return `<span class="p-barra${c ? "" : " vazia"}" style="height:${c ? Math.max(15, c / maiorCont * 100) : 8}%" title="${br(d)}: ${c} leituras"></span>`; }).join("")}
      </div>
      <div class="g-escala"><span>${br(dias[0])}</span><span>${lista.length} leituras • ${nDias} ${nDias === 1 ? "dia" : "dias"}</span><span>${br(dias[dias.length - 1])}</span></div>`;
  }


  const renderOriginal = render;
  render = function(ini, fim){ renderOriginal(ini, fim); desenha(ini, fim); };
  render(document.getElementById("ini").value, document.getElementById("fim").value);
})();
