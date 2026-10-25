# SPEC-009 — Fluxo unificado de séries e turmas

## Objetivo

Adicionar um único menu “Séries e turmas” ao Frepp School Web. A tela contém abas “Séries” e “Turmas”, inspiradas na referência visual fornecida, mantendo o estilo e a navegação atuais do produto.

## Séries

- A série é global à escola e pode ser usada em vários anos letivos e unidades.
- SCHOOL_ADMIN lista, cadastra e edita nome, código e ordem de exibição conforme as grants `grade_levels.read/create/update`.
- UNIT_ADMIN consulta a lista, mas não cria nem edita séries globais.
- O contrato atual do Core não contém segmento nem status de série; a interface apresenta os campos persistidos existentes.

## Turmas

- A aba mostra as turmas do ano letivo selecionado. SCHOOL_ADMIN pode filtrar também por unidade; UNIT_ADMIN usa somente a unidade de trabalho escolhida na Visão geral.
- A criação exige nome, série, unidade e ano letivo. Quando não há série, ano ou unidade, a tela aponta o cadastro prévio necessário.
- SCHOOL_ADMIN cadastra e edita turmas pela rota escolar. UNIT_ADMIN usa as rotas locais com verificação de escopo no Core.
- Na edição, unidade e ano ficam fixos para preservar a referência histórica. Nome e série podem ser atualizados.
- Turmas históricas sem série continuam visíveis como “Série não definida”, respeitando o contrato legado nullable do Core.

## Navegação

O menu fica abaixo de “Anos letivos”. A etapa “Turmas” e a ação rápida “Cadastrar turma” da Visão geral levam diretamente à aba Turmas na tela unificada. O retorno à Visão geral usa o padrão de texto azul e três traços amarelos ao interagir.

## Estados e segurança

Carregamento, vazio, erro, falta de permissão, conflito e gravação incerta têm estados próprios. Em gravação incerta, a ação é bloqueada até a lista ser recarregada, evitando duplicidade por reenvio. A UI não decide autorização: o Core revalida grants e escopo em cada operação.

## Verificação

Testes cobrem a sequência cadastrar série → cadastrar turma e o fluxo local do UNIT_ADMIN. O build e a inspeção visual devem verificar responsividade, navegação e ausência de rolagem horizontal.
