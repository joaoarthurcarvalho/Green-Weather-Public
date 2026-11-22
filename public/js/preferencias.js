/* =========================================================
   Green Weather preferencias do usuario (tema, graficos, alarmes)
   ========================================================= */
const GWPrefs = (() => {
  const CHAVE  = "gw_prefs_v2";
  const CHAVE_ANTIGA = "gw_prefs";

  const PADRAO = { tema: "claro", graficos: true, alarmes: true };

  const ler = () => {
    try {
      const atual = localStorage.getItem(CHAVE);
      if (atual) return { ...PADRAO, ...JSON.parse(atual) };
      const antigo = JSON.parse(localStorage.getItem(CHAVE_ANTIGA) || "null");
      const migrado = { ...PADRAO };
      if (antigo && typeof antigo === "object") {
        migrado.graficos = typeof antigo.graficos === "boolean" ? antigo.graficos : PADRAO.graficos;
        migrado.alarmes = typeof antigo.alarmes === "boolean" ? antigo.alarmes : PADRAO.alarmes;
      }
      localStorage.setItem(CHAVE, JSON.stringify(migrado));
      return migrado;
    } catch { return { ...PADRAO }; }
  };

  function aplicar(p = ler()){
    const html = document.documentElement;
    html.setAttribute("data-tema", p.tema);
    html.classList.toggle("sem-graficos", !p.graficos);
  }

  function definir(chave, valor){
    const p = ler();
    p[chave] = valor;
    localStorage.setItem(CHAVE, JSON.stringify(p));
    aplicar(p);
  }

  document.write('<link rel="stylesheet" href="../css/tema-claro.css">');
  aplicar();

  document.addEventListener("DOMContentLoaded", () => {
    const botaoTema = document.querySelector("[data-theme-toggle]");
    if (!botaoTema) return;

    const atualizaBotaoTema = () => {
      const temaEscuro = ler().tema === "escuro";
      const acao = temaEscuro ? "Ativar tema claro" : "Ativar tema escuro";
      botaoTema.setAttribute("aria-checked", String(temaEscuro));
      botaoTema.setAttribute("aria-label", acao);
      botaoTema.title = acao;
    };

    atualizaBotaoTema();
    botaoTema.addEventListener("click", () => {
      definir("tema", ler().tema === "claro" ? "escuro" : "claro");
      atualizaBotaoTema();
    });
  });

  return { ler, definir };
})();
