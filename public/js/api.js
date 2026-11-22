/* =========================================================
   Green Weather — conexão com o backend
   ========================================================= */
const GW = (() => {
  const K_USUARIO = "gw_usuario";   // só guarda nome/e-mail para exibir; a sessão de verdade está no cookie

  const lerCache = () => { try { return JSON.parse(localStorage.getItem(K_USUARIO)); } catch { return null; } };
  const salvarCache = u => localStorage.setItem(K_USUARIO, JSON.stringify(u));
  const limparCache = () => localStorage.removeItem(K_USUARIO);

  /* Faz uma chamada à API. Se a sessão expirou (401), volta para o login. */
  async function requisitar(metodo, url, corpo, extra = {}) {
    let r;
    try {
      r = await fetch(url, {
        method: metodo, credentials: "same-origin",
        headers: metodo === "GET" ? {} : { "Content-Type": "application/json" },
        body: metodo === "GET" ? undefined : JSON.stringify(corpo || {}),
        ...extra
      });
    } catch {
      throw new Error("Não foi possível falar com o servidor. Ele está ligado?");
    }
    let dados = {};
    try { dados = await r.json(); } catch {}
    if (r.status === 401 && url !== "/api/login") { limparCache(); location.replace("/html/login.html"); }
    if (!r.ok) throw new Error(dados.erro || "Erro inesperado no servidor.");
    return dados;
  }

  function mostrarNome(u) {
    if (!u) return;
    document.querySelectorAll("[data-user-name]").forEach(el => el.textContent = `${u.nome} ${u.sobrenome}`);
  }

  async function entrar(email, senha, senhaDoDia) {
    const resposta = await requisitar("POST", "/api/login", { email, senha, senhaDoDia });
    if (resposta.etapa === "senha_diaria") return resposta;
    salvarCache(resposta.usuario);
    return resposta;
  }
  async function sair() {
    try { await requisitar("POST", "/api/logout"); }
    finally {
      limparCache();
      location.replace("/html/login.html");
    }
  }
  const usuarioAtual = lerCache;

  async function atualizarSenha(atual, nova) { await requisitar("POST", "/api/me/senha", { atual, nova }); }
  async function atualizarEmail(senha, novoEmail) {
    const { usuario } = await requisitar("POST", "/api/me/email", { senha, novoEmail });
    salvarCache(usuario);
  }
  async function desconectarOutros() {
    const { desconectados } = await requisitar("POST", "/api/me/desconectar-outros");
    return desconectados;
  }

  /* Use no <head> das páginas protegidas */
  function exigirLogin() {
    if (!lerCache()) { location.replace("/html/login.html"); return; }
    // confirma com o servidor em segundo plano (se a sessão expirou, o requisitar() leva ao login)
    requisitar("GET", "/api/me").then(({ usuario }) => {
      salvarCache(usuario);
      mostrarNome(usuario);
      prepararNavegacao(usuario);
    }).catch(() => {});
  }

  function redirecionarSeLogado() { if (lerCache()) location.replace("/html/dashboard.html"); }

  function exigirPapel(papel) {
    if (!lerCache()) { location.replace("/html/login.html"); return; }
    requisitar("GET", "/api/me").then(({ usuario }) => {
      salvarCache(usuario);
      mostrarNome(usuario);
      prepararNavegacao(usuario);
      const papeisPermitidos = Array.isArray(papel) ? papel : [papel];
      if (!papeisPermitidos.includes(usuario.papel)) location.replace("/html/dashboard.html");
    }).catch(erro => console.error("Não foi possível confirmar o perfil da conta:", erro));
  }

  function prepararNavegacao(usuario) {
    const sidebar = document.querySelector(".sidebar");
    if (!sidebar) return;
    if (usuario.papel === "superadmin" && !sidebar.querySelector('[data-nav="funcionarios"]')) {
      const link = document.createElement("a");
      link.href = "funcionarios.html";
      link.dataset.nav = "funcionarios";
      link.className = "nav-management";
      link.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>Funcionários';
      sidebar.appendChild(link);
    }
    if (["engenheiro", "superadmin"].includes(usuario.papel) && !sidebar.querySelector('[data-nav="propriedades"]')) {
      const link = document.createElement("a");
      link.href = "propriedades.html";
      link.dataset.nav = "propriedades";
      link.className = "nav-management";
      link.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01"/></svg>Propriedades';
      sidebar.appendChild(link);
    }
    if (["engenheiro", "superadmin"].includes(usuario.papel) && !sidebar.querySelector('[data-nav="relatorios"]')) {
      const link = document.createElement("a");
      link.href = "relatorios.html";
      link.dataset.nav = "relatorios";
      link.className = "nav-management";
      link.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 3h16v18H4z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>Relatórios técnicos';
      sidebar.appendChild(link);
    }

    const atualizarVisibilidadeLimites = () => {
      const limites = document.querySelector("[data-recurso='limites-climaticos']");
      if (limites) limites.hidden = !["engenheiro", "superadmin"].includes(usuario.papel);
    };
    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", atualizarVisibilidadeLimites, { once: true });
    else atualizarVisibilidadeLimites();
    const configuracoes = sidebar.querySelector('a[href$="configuracoes.html"]');
    if (configuracoes) sidebar.insertBefore(configuracoes, sidebar.querySelector("#sair"));

    const paginaAtual = location.pathname.split("/").pop();
    sidebar.querySelectorAll("a[href]").forEach(link => {
      if (link.getAttribute("href").split("/").pop() === paginaAtual) {
        link.classList.add("active");
        link.setAttribute("aria-current", "page");
      } else {
        link.classList.remove("active");
        link.removeAttribute("aria-current");
      }
    });

    if (!sidebar.querySelector("#sair")) {
      const botao = document.createElement("button");
      botao.type = "button";
      botao.id = "sair";
      botao.className = "logout";
      botao.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7"/></svg><span>Sair da conta</span>';
      botao.addEventListener("click", async () => {
        botao.disabled = true;
        try { await sair(); }
        catch (erro) {
          botao.disabled = false;
          console.error("Não foi possível encerrar a sessão:", erro);
        }
      });
      sidebar.appendChild(botao);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    mostrarNome(lerCache());
    const usuario = lerCache();
    if (usuario) prepararNavegacao(usuario);
    document.querySelectorAll("[data-password-toggle]").forEach(botao => {
      botao.addEventListener("click", () => {
        const campo = document.getElementById(botao.dataset.passwordToggle);
        if (!campo) return;
        const mostrar = campo.type === "password";
        campo.type = mostrar ? "text" : "password";
        botao.setAttribute("aria-label", mostrar ? "Ocultar senha" : "Mostrar senha");
        botao.setAttribute("aria-pressed", String(mostrar));
      });
    });
  });

  return { entrar, sair, usuarioAtual, exigirLogin, exigirPapel, redirecionarSeLogado,
           atualizarSenha, atualizarEmail, desconectarOutros, requisitar };
})();
