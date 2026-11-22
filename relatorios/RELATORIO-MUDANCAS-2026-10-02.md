# Relatório de mudanças — Green Weather

**Data de referência:** 2 de outubro de 2026  
**Projeto:** Green Weather — monitoramento ambiental  
**Escopo:** tema, responsividade e gráficos do painel inicial.

## Resumo

O acesso ao tema foi movido de Configurações para o cabeçalho, e o painel inicial passou a mostrar gráficos compactos de variação nos cartões de temperatura e umidade. Também foram feitos ajustes de layout e leitura em telas menores.

## Mudanças realizadas

### Tema e cabeçalho

- Removido de Configurações o seletor de tema, mantendo as opções de gráficos e alarmes nessa página.
- Adicionado ao cabeçalho das telas autenticadas um switch para alternar entre tema claro e escuro.
- Mantida a preferência do tema entre páginas e atualizados o estado e o rótulo acessível do switch.
- Ajustado o posicionamento do switch ao lado do calendário, incluindo espaçamento e alinhamento em páginas sem bloco de boas-vindas.
- Adicionado o bloco “Bem-vindo” ao cabeçalho do Histórico.

### Painel inicial e gráficos

- Restaurada a posição do gráfico principal junto à área de leituras.
- Incluídos gráficos compactos de variação nos cartões de Temperatura e Umidade.
- Os gráficos dos cartões e o gráfico principal respeitam a opção **Usar Gráficos**; quando desativada, permanece disponível a visualização resumida em texto.
- Reduzida a altura do cartão de Status dos sensores para evitar espaço vazio.

### Responsividade e legibilidade

- Ajustado o cabeçalho para evitar transbordamento em telas estreitas.
- Corrigidas a largura das colunas e a rolagem da tabela de leituras.
- Removido o cabeçalho fixo da tabela, que se sobrepunha aos dados durante a rolagem.
- Rebalanceadas as colunas da tabela em resoluções pequenas para evitar conflito entre os textos.
- Empilhados os cartões do painel em resoluções intermediárias.

## Arquivos envolvidos

| Arquivo | Alteração |
|---|---|
| `public/html/configuracoes.html` | Remoção do seletor de tema da seção Aparência. |
| `public/html/dashboard.html` | Switch no cabeçalho e gráficos compactos nos cartões de temperatura e umidade. |
| `public/html/historico.html` | Switch e bloco de boas-vindas no cabeçalho. |
| `public/html/funcionarios.html` | Switch no cabeçalho. |
| `public/html/propriedades.html` | Switch no cabeçalho. |
| `public/js/preferencias.js` | Alternância, persistência e atualização acessível do switch de tema. |
| `public/css/style.css` | Estilos do switch, ajustes responsivos e altura do cartão de sensores. |
| `public/css/configuracoes.css` | Remoção dos estilos do antigo seletor de tema. |
| `public/css/tema-claro.css` | Remoção dos estilos do antigo seletor de tema. |
| `public/css/alarmes.css` | Ajustes de largura e rolagem da tabela de leituras. |

## Validação

- Conferida a sintaxe dos scripts JavaScript alterados.
- Verificada no navegador a alternância do tema e a exibição dos gráficos conforme a preferência.
- Conferida a tabela em larguras de 320 px a 1440 px, sem transbordamento horizontal ou sobreposição entre cabeçalho e linhas.
