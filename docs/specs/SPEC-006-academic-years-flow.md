# SPEC-006 — Fluxo de anos letivos

## Objetivo

Permitir que o `SCHOOL_ADMIN` consulte, cadastre e edite os períodos acadêmicos da escola. A entrada fica na navegação principal e na etapa “Ano letivo” da Visão geral. A ação rápida “Cadastrar ano letivo” aponta para a mesma página.

## Contrato

O School Web consome as quatro rotas `/admin/academic-years` do School BFF descritas na `frepp-school-bff/docs/specs/SPEC-005-academic-years-management.md`. A tela usa `year`, `startDate` e `endDate`; não oferece `status`, exclusão, ativação manual ou escolha de unidade. A lista mantém períodos anteriores visíveis. O Core determina a vigência pela data no fuso escolar; o resumo da Visão geral é a fonte dessa informação.

## Fluxo

1. Lista com estado de carregamento, erro recuperável, vazio ou períodos cadastrados.
2. Cadastro com ano numérico e datas obrigatórias. A interface valida ordem das datas e o servidor valida o contrato novamente.
3. Edição busca o detalhe antes de preencher o formulário para reduzir alterações sobre dados desatualizados.
4. Depois de salvar, a lista é carregada novamente. Conflito de ano informa duplicidade. Se a gravação tem resultado incerto, o botão de salvar é bloqueado e a pessoa volta à lista para conferir o estado antes de repetir.

O navegador mostra ações de criação e edição somente com os grants correspondentes da sessão. O Core continua responsável pela autorização real e pelo isolamento de escola.

## Acessibilidade e telas pequenas

Títulos recebem foco ao trocar de tela. Formulário tem rótulos explícitos, campos de data nativos e aviso de erro com `role="alert"`. Em largura pequena, datas e ações ficam em uma coluna.
