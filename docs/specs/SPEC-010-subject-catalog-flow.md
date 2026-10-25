# SPEC-010 — Disciplinas no School Web

## Fluxo

O menu “Disciplinas” aparece após “Séries e turmas”. A página lista nome e código do catálogo da escola em ordem alfabética. SCHOOL_ADMIN pode cadastrar e editar os dois campos. UNIT_ADMIN consulta o mesmo catálogo pela unidade selecionada e não recebe ações de escrita.

O formulário indica conflito de código ou nome, conserva os valores para correção e evita repetir automaticamente uma gravação de resultado incerto. A tela respeita 401/403 e o carregamento existente. O catálogo é compartilhado entre unidades e não vincula automaticamente disciplinas a turmas ou professores.
