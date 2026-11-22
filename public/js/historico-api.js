(function(){
  const $ = id => document.getElementById(id);
  const renderAnterior = render;
  let pedido = 0;

  render = async function(ini, fim){
    const meu = ++pedido;
    let erro = "";
    try {
      const d = await GW.requisitar("GET", `/api/leituras?inicio=${ini}&fim=${fim}&intervalo=30&limite=2000&ordem=desc`);
      if (meu !== pedido) return;
      leituras.length = 0;
      d.leituras.forEach(r => leituras.push({
        data: r.data, hora: r.hora, sensor: r.sensor, propriedade: r.propriedade,
        t: r.t, u: r.u, online: r.online
      }));
    } catch (e) {
      if (meu !== pedido) return;
      leituras.length = 0;
      erro = e.message;
    }
    renderAnterior(ini, fim);
    if (erro) $("rodape").textContent = "Não foi possível carregar as leituras: " + erro;
  };

  leituras.length = 0;
  render($("ini").value, $("fim").value);
})();
