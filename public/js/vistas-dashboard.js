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

  const texto = document.createElement("div");
  texto.className = "vista-texto";
  card.appendChild(texto);

  window.GWAtualizarVistaDashboard = serie => {
    if (!serie.length) {
      texto.innerHTML = "<p>Nenhuma leitura real disponível.</p>";
      return;
    }
    const f1 = valor => valor.toFixed(1).replace(".", ",");
    const estatistica = chave => {
      const valores = serie.map(leitura => leitura[chave]);
      return {
        min: Math.min(...valores),
        max: Math.max(...valores),
        med: valores.reduce((total, valor) => total + valor, 0) / valores.length
      };
    };
    const bloco = (titulo, estat, formatar) => `
      <div class="evo-bloco"><h4>${titulo}</h4><dl>
        <div><dt>Mín</dt><dd>${formatar(estat.min)}</dd></div>
        <div><dt>Média</dt><dd>${formatar(estat.med)}</dd></div>
        <div><dt>Máx</dt><dd>${formatar(estat.max)}</dd></div>
      </dl></div>`;

    texto.innerHTML = `
      <div class="evo-resumo">
        ${bloco("Temperatura", estatistica("t"), valor => f1(valor) + " °C")}
        ${bloco("Umidade", estatistica("u"), valor => Math.round(valor) + " %")}
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Horário</th><th>Temperatura</th><th>Umidade</th></tr></thead>
        <tbody>${serie.map(leitura => `<tr><td>${leitura.dataHora}</td><td>${f1(leitura.t)} °C</td><td>${Math.round(leitura.u)} %</td></tr>`).join("")}</tbody>
      </table></div>`;
  };
})();
