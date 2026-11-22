/* =========================================================
   Green Weather Dashboard: versao SEM grafico
   ========================================================= */
(function(){
  const css = document.createElement("link");
  css.rel = "stylesheet"; css.href = "../css/vistas.css";
  document.head.appendChild(css);

  const card = document.getElementById("chart").closest(".card");
  card.querySelector(".chart-wrap").classList.add("vista-grafico");
  card.querySelector(".legend").classList.add("vista-grafico");

  const f1 = v => v.toFixed(1).replace(".", ",");
  const estat = k => {
    const v = serie.map(d => d[k]);
    return {min: Math.min(...v), max: Math.max(...v), med: v.reduce((a, b) => a + b, 0) / v.length};
  };
  const bloco = (titulo, s, fmt) => `
    <div class="evo-bloco"><h4>${titulo}</h4><dl>
      <div><dt>Mín</dt><dd>${fmt(s.min)}</dd></div>
      <div><dt>Média</dt><dd>${fmt(s.med)}</dd></div>
      <div><dt>Máx</dt><dd>${fmt(s.max)}</dd></div>
    </dl></div>`;

  const texto = document.createElement("div");
  texto.className = "vista-texto";
  texto.innerHTML = `
    <div class="evo-resumo">
      ${bloco("Temperatura", estat("t"), v => f1(v) + " °C")}
      ${bloco("Umidade", estat("u"), v => Math.round(v) + " %")}
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Horário</th><th>Temperatura</th><th>Umidade</th></tr></thead>
      <tbody>${serie.map(d => `<tr><td>${d.h}</td><td>${f1(d.t)} °C</td><td>${d.u} %</td></tr>`).join("")}</tbody>
    </table></div>`;
  card.appendChild(texto);
})();
