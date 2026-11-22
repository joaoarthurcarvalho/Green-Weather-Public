# Relatório de mudanças — perfis de usuário e propriedades

**Data:** 20 de novembro de 2026  
**Projeto:** Green Weather  
**Escopo:** permissões por perfil, acesso às propriedades rurais, limites climáticos e relatórios técnicos.

## Resumo executivo

O acesso às funcionalidades do Green Weather é definido pelo perfil da conta. O superadministrador gerencia as contas; o engenheiro agrônomo acessa as propriedades sob sua responsabilidade e, junto com o superadministrador, configura limites climáticos e gera relatórios técnicos. Os relatórios podem ser salvos na conta, reabertos e impressos ou salvos em PDF.

## Perfis e permissões

| Perfil | Acessos principais |
|---|---|
| Superadmin | Gerencia contas de funcionários e engenheiros; configura limites climáticos; gera e consulta os próprios relatórios técnicos. |
| Engenheiro agrônomo | Acessa a aba Propriedades e cadastra propriedades sob sua responsabilidade; configura limites climáticos; gera e consulta os próprios relatórios técnicos. |
| Funcionário | Acessa as áreas gerais do sistema, sem acesso à gestão de contas, às propriedades ou às funções técnicas restritas. |

O superadmin inicial é provisionado por `SUPERADMIN_NAME`, `SUPERADMIN_EMAIL` e `SUPERADMIN_PASSWORD`. Pela tela de gestão, o superadmin pode criar contas de funcionário ou engenheiro agrônomo, ativá-las, desativá-las e excluí-las. A tela não permite alterar ou excluir uma conta de superadmin.

## Aba Propriedades

A aba **Propriedades** é apresentada no menu do perfil Engenheiro agrônomo. Nela, o usuário cadastra nome da propriedade, município, UF e área em hectares e consulta a lista das propriedades cadastradas sob sua responsabilidade.

O servidor associa cada propriedade ao identificador do engenheiro autenticado. As rotas `GET /api/propriedades` e `POST /api/propriedades` exigem o perfil `engenheiro`; a consulta retorna apenas as propriedades daquele responsável.

## Limites climáticos e relatórios técnicos

- Engenheiros agrônomos e superadmins podem configurar os limites compartilhados de temperatura e umidade na página Histórico.
- A alteração é persistida em `data/limites-climaticos.json` e passa a orientar a geração de alarmes.
- Os mesmos perfis podem gerar relatórios técnicos com dados do período escolhido e observações.
- Cada relatório é salvo em `data/relatorios-tecnicos.json` associado ao usuário que o criou. A lista de relatórios mostra os registros da própria conta; é possível reabri-los e imprimi-los ou salvá-los em PDF.
- As rotas de configuração e relatórios verificam o perfil no servidor, além de ocultar ou apresentar os acessos correspondentes no menu.

## Arquivos relacionados

| Arquivo | Responsabilidade |
|---|---|
| `server.js` | Criação e gestão de contas, autorização das rotas, cadastro de propriedades e persistência de limites e relatórios. |
| `public/js/api.js` | Exibição dos itens de navegação conforme o perfil e controle da posição de Configurações no menu. |
| `public/html/funcionarios.html` e `public/js/gestao-funcionarios.js` | Gestão de contas pelo superadmin e seleção de perfil para novas contas. |
| `public/html/propriedades.html` e `public/js/gestao-propriedades.js` | Cadastro e consulta das propriedades do engenheiro autenticado. |
| `public/html/historico.html` e `public/js/limites-climaticos.js` | Configuração de limites climáticos pelos perfis autorizados. |
| `public/html/relatorios.html` e `public/js/relatorios.js` | Geração, observações, listagem, reabertura e impressão de relatórios. |
| `alarmes.js` | Aplicação e persistência dos limites usados nos alarmes. |
| `test/relatorios.test.js` e `test/alarmes.test.js` | Testes de persistência dos relatórios e dos limites climáticos. |

## Validação

- `npm test`: 10 testes passaram.
- A persistência dos relatórios foi verificada após reiniciar o servidor.
- Foi verificado que funcionário não pode acessar a API de relatórios e que as rotas técnicas exigem autenticação e perfil autorizado.
