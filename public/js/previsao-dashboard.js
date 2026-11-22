(function(){
  const lista = document.getElementById("previsao-lista");
  const f1 = valor => Number(valor).toFixed(1).replace(".", ",");

  function mostrarVazio(texto){
    const mensagem = document.createElement("p");
    mensagem.className = "previsao-vazio";
    mensagem.textContent = texto;
    lista.replaceChildren(mensagem);
  }

  function desenhar(resultado){
    const previsoes = resultado.previsoes;
    if (!previsoes.length) {
      const mensagens = {
        sem_leituras: "Não há leituras nas últimas 6 horas. Verifique se os sensores estão enviando dados para o sistema.",
        sem_dados_recentes: "Há histórico, mas nenhum sensor enviou uma leitura nos últimos 15 minutos. Confira a conexão dos sensores.",
        dados_insuficientes: `Há ${resultado.sensoresRecentes} sensor(es) enviando dados, mas ainda faltam leituras: são necessárias 5 ao longo de pelo menos 1 hora.`,
        sem_tendencia: `Analisamos ${resultado.sensoresAnalisados} sensor(es) com dados suficientes e não identificamos tendência de saída da faixa ideal nas próximas 3 horas.`
      };
      mostrarVazio(mensagens[resultado.status] || "Não foi possível gerar uma estimativa com os dados disponíveis.");
      return;
    }

    const itens = previsoes.map(previsao => {
      const item = document.createElement("article");
      item.className = "previsao-item";
      const cabecalho = document.createElement("strong");
      cabecalho.textContent = `${previsao.sensor} · ${previsao.grandeza}`;
      if (previsao.demonstracao) {
        const selo = document.createElement("small");
        selo.className = "previsao-demo";
        selo.textContent = "Dados demonstrativos";
        item.append(cabecalho, selo);
      } else {
        item.append(cabecalho);
      }
      const detalhe = document.createElement("span");
      detalhe.textContent = `Tendência de ${previsao.tendencia}: ${f1(previsao.valorAtual)} ${previsao.unidade} agora; pode atingir ${previsao.limite} ${previsao.unidade} em ${previsao.horas < 1 ? "menos de 1 hora" : `cerca de ${f1(previsao.horas)} horas`}.`;
      const horario = document.createElement("small");
      horario.textContent = `Estimativa para ${new Date(previsao.previstoEm).toLocaleString("pt-BR")}`;
      item.append(detalhe, horario);
      return item;
    });
    lista.replaceChildren(...itens);
  }

  async function carregar(){
    try {
      const resultado = await GW.requisitar("GET", "/api/previsao");
      desenhar(resultado);
    } catch (erro) {
      mostrarVazio(`Não foi possível gerar a estimativa: ${erro.message}`);
    }
  }

  carregar();
  setInterval(carregar, 5 * 60 * 1000);
})();
