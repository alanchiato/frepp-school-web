# SPEC-013 — Relatório de implementação do School Web

## Auditoria inicial

A aba Turmas listava e editava registros, sem link de detalhes. Existiam perfis de alunos e professores, cards, abas e animação de links. O repositório já continha alterações locais preexistentes em vários módulos e evidências de refinamento visual; foram preservadas. O Core/BFF existentes não ofereciam dados atuais consolidados por turma.

## Implementação

Adicionados link no nome, rota direta, cliente/validação do workspace e página com quatro seções. O cliente usa apenas o contrato composto do BFF para a página; não recalcula vigência nem agrega listas parciais. UNIT_ADMIN usa apenas rotas locais. Estados de erro e vazios são explícitos. Um microtask evita GET duplicado na montagem de desenvolvimento com StrictMode.

## Validação

TypeScript e build passaram. `vitest run`: 114 testes aprovados. `playwright test --project=browser`: 8 testes aprovados. O teste novo navegou desde a lista, acessou a URL direta, percorreu abas e validou ausência de scroll horizontal em 1440×900, 1280×800, 768×1024, 390×844 e 360×800. O lint passou com avisos antigos em outros componentes; o novo componente não mantém aviso.

## Evidências sintéticas

- [Listagem](evidence/CLASS-WORKSPACE-list.png)
- [Desktop 1440](evidence/CLASS-WORKSPACE-1440.png)
- [Desktop 1280](evidence/CLASS-WORKSPACE-1280.png)
- [Tablet 768](evidence/CLASS-WORKSPACE-768.png)
- [Mobile 390](evidence/CLASS-WORKSPACE-390.png)
- [Mobile 360](evidence/CLASS-WORKSPACE-360.png)
- [Professores](evidence/CLASS-WORKSPACE-Professores.png)
- [Disciplinas](evidence/CLASS-WORKSPACE-Disciplinas.png)
- [Informações](evidence/CLASS-WORKSPACE-Informações.png)
- [Estado vazio](evidence/CLASS-WORKSPACE-empty.png)

## Limites e próximas etapas

A interface mostra apenas disciplinas com docente vigente porque não existe catálogo curricular por turma. O perfil TEACHER e recursos pedagógicos continuam planejados. A integração com PostgreSQL real continua pendente de ambiente de teste.
