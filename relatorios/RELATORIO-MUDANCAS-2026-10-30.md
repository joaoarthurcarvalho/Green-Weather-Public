# Relatório de mudanças — Green Weather

**Data:** 30 de outubro de 2026  
**Projeto:** Green Weather — monitoramento ambiental  
**Escopo:** gestão de contas, navegação, identidade visual e experiência da interface.

## Resumo executivo

Foram realizadas melhorias na área administrativa do sistema e na apresentação visual. O superadministrador agora dispõe de controles para ativar, desativar e excluir contas de funcionários e engenheiros. Também foram corrigidos elementos de navegação e relógio nas páginas de gestão, reforçada a legibilidade do botão de criação no tema escuro e atualizada a marca do sistema.

## Mudanças implementadas

### Gestão de funcionários e engenheiros

- Adicionadas ações de **Ativar/Desativar** e **Excluir** na lista de contas.
- A desativação bloqueia novos logins e encerra as sessões existentes da conta.
- A reativação permite que o usuário volte a entrar com suas credenciais.
- A exclusão remove a conta e invalida suas sessões.
- As ações exigem autenticação de superadministrador, confirmação na interface e validação no servidor.
- Contas de superadministrador não podem ser alteradas ou excluídas pela tela de funcionários.
- Novas contas são criadas com status ativo por padrão.

### Navegação e experiência de uso

- Adicionados ícones aos links de navegação das páginas de Funcionários e Propriedades.
- A página atual passa a ser identificada e destacada automaticamente na navegação.
- Adicionado ícone ao botão de saída da conta.
- Criado um relógio compartilhado para exibir dia, data e hora nas páginas de Funcionários e Propriedades.
- Ajustada a tabela de contas para manter a coluna de ações acessível em telas estreitas.
- Melhorado o contraste do botão **Criar funcionário** no tema escuro, incluindo estados de hover, foco e carregamento.

### Identidade visual

- Atualizada a marca SVG para representar uma folha central em pé, uma pequena nuvem lateral e três faixas diagonais contíguas — vermelha, azul e verde — dentro da folha.
- Reforçada a paleta azul do tema escuro em superfícies, navegação, cartões, bordas e destaques.

## Arquivos envolvidos

| Arquivo | Alteração |
|---|---|
| `server.js` | Rotas protegidas para atualização de status e exclusão; bloqueio de login e invalidação de sessões para contas desativadas. |
| `public/html/funcionarios.html` | Navegação com ícones, coluna de status e ações de gestão. |
| `public/html/propriedades.html` | Navegação com ícones e inclusão do relógio compartilhado. |
| `public/js/gestao-funcionarios.js` | Renderização de status, ativação/desativação, exclusão, confirmação e mensagens de resultado. |
| `public/js/api.js` | Ícones e seleção automática do item atual na navegação; ícone do botão de saída. |
| `public/js/relogio.js` | Atualização compartilhada de dia, data e hora. |
| `public/css/gestao.css` | Estilos dos controles de gestão, tabela e botão de criação. |
| `public/css/style.css` | Ajustes da paleta azul do tema escuro e do botão de saída. |
| `public/assets/logo.svg` | Nova composição da marca com folha, nuvem e faixas coloridas. |
| `README.md` | Atualização da descrição das capacidades de gestão de contas. |

## Validação realizada

- Verificada a sintaxe JavaScript com `node --check` nos arquivos de servidor e interface alterados.
- Validada a estrutura XML do SVG da marca.
- Executados testes de integração da API para criação, ativação, desativação e exclusão de contas.
- Confirmado que contas desativadas não conseguem iniciar sessão e que sessões existentes são encerradas.
- Confirmado que ações sem autenticação são recusadas e que contas de superadministrador são protegidas.
- Verificado o relógio e a presença de ícones na navegação das páginas de gestão.

## Aplicação das mudanças

Reinicie o servidor Node.js para carregar as alterações do backend. Em seguida, atualize as páginas no navegador com **Ctrl+F5** para recarregar JavaScript, CSS e a nova marca.

## Observação de segurança

Uma senha foi compartilhada durante a conversa de suporte. Ela não foi incluída neste relatório; por segurança, não deve ser reutilizada e deve ser trocada caso ainda esteja em uso.
