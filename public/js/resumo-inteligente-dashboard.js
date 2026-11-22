(function(){
  const texto = document.getElementById("resumo-inteligente-texto");
  const lista = document.getElementById("resumo-inteligente-destaques");

  function mostrarErro(mensagem){
    texto.textContent = mensagem;
    lista.replaceChildren();
  }

  function desenhar(resultado){
    texto.textContent = resultado.resumo;
    const destaques = resultado.destaques.map(destaque => {
      const item = document.createElement("li");
      item.className = `resumo-destaque ${destaque.tipo}`;
      item.textContent = destaque.texto;
      return item;
    });
    lista.replaceChildren(...destaques);
  }

  async function carregar(){
    try {
      desenhar(await GW.requisitar("GET", "/api/resumo-inteligente"));
    } catch (erro) {
      mostrarErro(`Não foi possível gerar o resumo: ${erro.message}`);
    }
  }

  carregar();
  setInterval(carregar, 5 * 60 * 1000);
})();
