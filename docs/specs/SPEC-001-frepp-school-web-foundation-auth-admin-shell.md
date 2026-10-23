# SPEC-001 — Frepp School Web Foundation, Authentication & Admin Shell

## 1. Resumo

Esta SPEC cria a primeira versão navegável do `frepp-school-web`.

Objetivo:

entregar uma aplicação React real, conectada ao `frepp-school-bff`, cobrindo o primeiro fluxo vertical completo do Frepp School:

```text
Login
  ↓
[quando necessário]
Seleção de School
  ↓
Restauração/Bootstrap de sessão
  ↓
Authenticated Admin Shell
  ↓
Admin Home
```

Arquitetura:

```text
frepp-school-web
        ↓
frepp-school-bff
        ↓
frepp-platform
        ↓
PostgreSQL
```

Princípio:

```text
Web  = apresentação, interação e estado efêmero de UI
BFF  = composição de experiência
Core = domínio, autenticação, autorização, tenant e persistência
```

O Web nunca chama o Core diretamente.

---

## 2. Escopo

Implementar:

- foundation do app;
- routing;
- API client para o BFF;
- login;
- school selection;
- session restore;
- authenticated shell;
- logout;
- Admin Home;
- loading/error/forbidden states;
- responsive baseline;
- design tokens iniciais;
- integração com os wireframes oficiais.

Não implementar CRUDs administrativos nesta SPEC.

---

## 3. Design references oficiais

Diretório esperado:

```text
docs/design/references/
```

Referências desta SPEC:

```text
AUTH-01 — Login
docs/design/references/AUTH-01-login.png

AUTH-02 — School Selection
docs/design/references/AUTH-02-school-selection.png

ADM-01 — Admin Home / Empty Setup
docs/design/references/ADM-01-admin-home-empty.png

ADM-02 — Admin Home / Partial Setup
docs/design/references/ADM-02-admin-home-partial.png

ADM-03 — Admin Home / Configured
docs/design/references/ADM-03-admin-home-configured.png

SYS-01 — System States
docs/design/references/SYS-01-system-states.png
```

`SYS-01` contém:

```text
SYS-01A — Session Restoring
SYS-01B — Overview Loading
SYS-01C — Forbidden
```

Também considerar:

```text
docs/design/WIREFRAMES-INDEX.md
```

como índice oficial.

---

## 4. Natureza dos wireframes

Os wireframes definem:

- intenção visual;
- hierarquia;
- composição;
- áreas principais;
- linguagem de componentes;
- ritmo/spacing;
- relação entre estados;
- identidade visual;
- posição relativa dos elementos;
- tom acolhedor, leve e educacional.

Os wireframes NÃO são especificação pixel-perfect.

Não copiar cegamente:

- textos fictícios;
- números fictícios;
- datas fictícias;
- nomes fictícios;
- dados inexistentes no BFF;
- ações ainda não disponíveis;
- estados impossíveis pelo contrato atual.

Dados e comportamento reais sempre vencem placeholders do wireframe.

---

## 5. Brand

Usar o logo oficial criado para:

```text
Frepp School
```

Esperado em:

```text
docs/design/brand/
```

O Web deve usar uma cópia apropriada em assets de produção, por exemplo:

```text
src/assets/brand/
```

Não referenciar arquivos de `docs/` diretamente em runtime.

Preservar:

- `frepp` em azul;
- `School` em amarelo;
- mascote/livro;
- linguagem visual azul/verde/amarelo;
- aparência leve e acolhedora.

Não redesenhar o logo.

---

## 6. Auditoria obrigatória — Web

Antes de editar:

- ler esta SPEC integralmente;
- ler `docs/design/WIREFRAMES-INDEX.md`;
- abrir visualmente todos os 6 wireframes;
- auditar package.json;
- Vite config;
- TypeScript config;
- Oxlint/config de lint;
- estrutura inicial do template;
- Git status;
- README.

Confirmar:

- versão Node;
- pnpm;
- React;
- TypeScript;
- Vite;
- linter gerado pelo create-vite;
- scripts existentes.

Não substituir tooling sem necessidade.

---

## 7. Auditoria obrigatória — BFF

Auditar `../frepp-school-bff`.

Ler:

- SPEC-001/report;
- SPEC-002/report;
- SPEC-003/report;
- SPEC-004/report;
- README;
- contratos reais;
- schemas;
- handlers/routes;
- error envelopes;
- cookie semantics.

Confirmar endpoints reais:

```text
POST /auth/login
POST /auth/select-school
GET  /session
POST /auth/logout
GET  /admin/overview
```

Não assumir shape.

Extrair contratos exatos do código real.

---

## 8. Contrato de login

Fluxo público:

```http
POST /auth/login
```

Request:

```json
{
  "email": "string",
  "password": "string"
}
```

Não enviar:

```text
schoolId
```

O response é discriminado.

### 8.1. Direct authentication

```text
status = authenticated
```

Resultado:

- School session via cookie HttpOnly;
- Web avança para session bootstrap.

### 8.2. School selection required

```text
status = school_selection_required
```

Resultado:

- challengeToken;
- lista mínima de Schools;
- sem sessão intermediária;
- Web exibe AUTH-02.

---

## 9. School selection

Quando login retornar:

```text
school_selection_required
```

exibir tela:

```text
AUTH-02
```

Request:

```http
POST /auth/select-school
```

com:

```json
{
  "challengeToken": "...",
  "schoolId": "..."
}
```

Regras:

- challengeToken permanece opaco;
- não decodificar;
- não persistir em localStorage/sessionStorage;
- manter apenas em memória durante o fluxo;
- não inferir membership;
- não alterar lista recebida;
- não tentar trocar tenant por URL/header;
- não fazer retry automático em falha ambígua de transporte.

---

## 10. Session bootstrap

Após autenticação bem-sucedida:

```http
GET /session
```

Também executar ao carregar a aplicação para restaurar sessão existente.

Possíveis resultados:

### 10.1. 200

Usuário autenticado.

Usar resposta real para:

- user;
- school;
- roles;
- permissions;
- experiences.

### 10.2. 401

Sem sessão válida.

Redirecionar para login.

Não exibir erro técnico.

---

## 11. Session restore

Ao iniciar o app, antes de decidir rota:

```text
unknown
→ restoring
→ authenticated | unauthenticated
```

Durante `restoring`:

usar referência:

```text
SYS-01A
```

Não renderizar brevemente login antes de descobrir sessão.

Evitar auth flicker.

---

## 12. Auth state model

Estado mínimo conceitual:

```text
unknown
unauthenticated
selecting_school
authenticated
```

Pode haver estados transitórios:

```text
logging_in
selecting
logging_out
```

Não criar state machine framework se não for necessário.

---

## 13. Persistência de autenticação

A autenticação real pertence ao cookie HttpOnly do BFF.

Não armazenar:

- session token;
- cookie;
- password;
- challenge;
- auth token inventado;
- schoolId como fonte de tenant.

Não usar localStorage como fonte de autenticação.

---

## 14. BFF base URL

A URL do BFF deve vir de configuração de ambiente compatível com Vite.

Exemplo conceitual:

```text
VITE_BFF_BASE_URL
```

Validar configuração na inicialização.

Não hardcode URL de produção.

---

## 15. Credentials

Todas as chamadas autenticadas ao BFF devem funcionar com cookie de sessão.

Usar:

```text
credentials: include
```

se necessário conforme origem/configuração auditada.

Não manipular header `Cookie` manualmente no browser.

---

## 16. API client

Criar um client pequeno e explícito.

Responsabilidades:

- base URL;
- JSON;
- credentials;
- AbortSignal;
- parsing;
- error envelope;
- request correlation se aplicável ao browser;
- timeout somente se explicitamente necessário.

Não criar SDK genérico excessivo.

Não usar Axios sem necessidade.

Preferir `fetch` nativo.

---

## 17. Runtime validation

Avaliar uso de Zod somente se necessário.

Não instalar uma nova dependência automaticamente se o projeto ainda não possui e TypeScript + validações explícitas forem suficientes.

Se runtime validation for adotada:

- justificar;
- usar nos contratos BFF;
- não duplicar schemas sem benefício.

---

## 18. Routing

Usar solução de routing adequada para SPA React.

A auditoria deve decidir se:

- React Router;
- outra solução já presente;
- router mínimo próprio.

Preferência:

usar biblioteca madura e pequena caso o template não forneça routing.

Documentar decisão.

---

## 19. Rotas públicas

No mínimo:

```text
/login
/select-school
```

`/select-school` não deve funcionar sem challenge em memória.

Acesso direto deve:

- voltar para login;
- ou restaurar fluxo somente se houver estado válido em memória.

Não persistir challenge para permitir deep link.

---

## 20. Rotas autenticadas

No mínimo:

```text
/
```

ou:

```text
/admin
```

para Admin Home.

Definir uma canonical route.

Preferência:

```text
/
```

como entrada autenticada para visão geral.

---

## 21. Route guards

Guard é UX/routing, não autorização de domínio.

Pode impedir render de páginas incompatíveis com session bootstrap.

Não substituir 403 real do BFF.

Se BFF devolver 403:

mostrar estado correspondente.

---

## 22. Experience routing

Usar `session.experiences` apenas para direcionamento de UX.

Para esta SPEC:

- Admin experience conduz à Admin Home;
- Teacher-only não deve ganhar Admin Home artificialmente.

Se usuário autenticado não tiver experiência suportada nesta primeira versão:

mostrar estado seguro de indisponibilidade/forbidden.

Não inventar Teacher Home.

---

## 23. Login UI — AUTH-01

Implementar tela inspirada em:

```text
AUTH-01
```

Elementos obrigatórios:

- Frepp School logo;
- título/boas-vindas;
- email;
- password;
- submit;
- loading state;
- invalid credentials state;
- composição visual acolhedora.

Não implementar nesta SPEC se não houver suporte real:

- Google login;
- forgot password;
- social auth.

Se estiverem no wireframe, tratar como referência visual ou elemento desabilitado somente se isso for explicitamente desejável.

Preferência:

não renderizar ação sem backend real.

---

## 24. Login form

Requisitos:

- email required;
- password required;
- submit via Enter;
- botão disabled durante request;
- não fazer duplicate submit;
- mensagens acessíveis;
- foco coerente;
- password autocomplete apropriado;
- email autocomplete apropriado.

Validação de email deve ser simples.

Não replicar validação de domínio do Core.

---

## 25. Invalid credentials

Preservar mensagem funcional do BFF de forma amigável.

Não distinguir:

- email inexistente;
- password errada;
- usuário inativo;
- School inválida.

Não criar enumeração de usuário.

---

## 26. School Selection UI — AUTH-02

Implementar referência:

```text
AUTH-02
```

Exibir apenas dados reais retornados:

- School id internamente;
- School name visualmente.

Não inventar:

- cidade;
- unidade;
- segmento;
- endereço;
- tipo de ensino;

se não estiverem no contrato BFF.

O wireframe pode conter esses placeholders, mas o contrato real vence.

---

## 27. School selection interaction

Requisitos:

- uma opção por School;
- seleção clara;
- botão continuar;
- loading durante select;
- challenge invalid/reused retorna estado seguro;
- botão voltar pode retornar ao login e descartar challenge;
- challenge nunca aparece visualmente.

---

## 28. Logout

Usar:

```http
POST /auth/logout
```

Ao concluir:

- limpar estado em memória;
- ir para login;
- não manter session bootstrap antigo.

Em erro:

- comportamento seguro;
- não afirmar logout se BFF falhar silenciosamente.

---

## 29. Authenticated Admin Shell

Usar padrão visual derivado de:

```text
ADM-01
ADM-02
ADM-03
```

Elementos:

- Frepp School logo;
- navigation area;
- School atual;
- usuário;
- conteúdo principal;
- logout acessível;
- área preparada para futuras seções.

Não criar funcionalidades inexistentes.

---

## 30. Navegação inicial

A navegação pode mostrar placeholders/entries somente quando houver destino real nesta SPEC.

Preferência nesta primeira entrega:

```text
Visão geral
```

e eventualmente itens futuros visualmente desabilitados somente se houver intenção de produto clara.

Não criar rotas fake de:

- Units;
- Academic Years;
- Classes;
- Teachers;
- Students;
- Guardians.

Melhor omitir do que levar a telas vazias inexistentes.

---

## 31. School identity

Exibir:

- School name.

Usar dados de:

```text
GET /session
```

e/ou overview conforme contrato real.

Não usar schoolId como elemento principal de UI.

---

## 32. User identity

Usar somente dados realmente presentes na session.

Não inventar nome completo se session só tiver email.

Se não houver display name:

preferir email ou tratamento neutro.

Wireframes com “Ana Carolina”, “João Silva” etc. são placeholders.

---

## 33. Admin Home

Consumir:

```http
GET /admin/overview
```

Somente após sessão autenticada/Admin experience adequada.

Não chamar Core diretamente.

---

## 34. Admin Overview contract

Auditar e consumir shape real da BFF SPEC-004.

Conceitualmente:

```text
school
academicYear
setup
counts
alerts
quickActions
```

Não recalcular:

- Core counts;
- relationship gaps;
- Academic Year current;
- permissions;
- tenant.

---

## 35. Admin Home state — empty

Referência:

```text
ADM-01
```

Esperado conceitualmente:

- progress 0;
- setup steps não iniciados;
- alerta de Academic Year quando aplicável;
- quick actions iniciais;
- visual de onboarding/setup.

Não hardcode progress.

---

## 36. Admin Home state — partial

Referência:

```text
ADM-02
```

Esperado:

- counts reais;
- progress parcial;
- steps complete/attention/not_started;
- alerts reais;
- quick actions reais.

O layout deve comportar números e labels variáveis.

---

## 37. Admin Home state — configured

Referência:

```text
ADM-03
```

Esperado:

- progress 100 quando BFF retornar;
- steps completos;
- ausência de alerts de setup;
- quick actions conforme BFF;
- sensação visual positiva de conclusão.

Não recalcular 100 no Web.

---

## 38. Overview loading

Durante:

```text
GET /admin/overview
```

usar referência:

```text
SYS-01B
```

Preferir:

- skeleton;
- layout estável;
- evitar spinner full-screen se shell já está autenticado.

---

## 39. Forbidden

Se overview retornar:

```text
403
```

usar referência:

```text
SYS-01C
```

Não transformar 403 em logout.

Usuário continua autenticado.

Oferecer ação segura:

- voltar;
- logout;
- retry somente quando fizer sentido.

Não sugerir que autorização pode ser contornada.

---

## 40. Overview errors

Separar:

### 401

Sessão inválida:

```text
→ login
```

### 403

Forbidden state.

### 5xx / transport

Erro temporário com retry manual.

Não converter erro em empty state.

Não exibir stack/URL interna.

---

## 41. Setup steps rendering

Consumir diretamente:

```text
code
status
```

do BFF.

Estados esperados:

```text
complete
attention
not_started
```

O Web mapeia para:

- label;
- ícone;
- badge;
- visual.

Não altera status.

---

## 42. Setup step labels

Mapear IDs de UX conhecidos para PT-BR.

Exemplo:

```text
school_units → Unidades
academic_year → Ano letivo
classes → Turmas
teachers → Professores
students → Alunos
guardians → Responsáveis
```

Mapping pertence à apresentação.

Não enviar esses labels de volta ao backend.

---

## 43. Alerts rendering

Consumir:

- code;
- severity;
- count;
- action opcional.

Web mapeia:

- título;
- descrição;
- ícone;
- CTA/navigation futura.

Nesta SPEC, actions cujo destino ainda não existe podem:

- não ser clicáveis;
- ou ser omitidas visualmente.

Preferência:

não criar navegação morta.

---

## 44. Quick actions rendering

Consumir IDs retornados pelo BFF.

Nesta SPEC, como CRUDs ainda não existem, evitar botões que navegam para rotas inexistentes.

Pode:

- exibir como disabled com indicação futura, se explicitamente desejado;
- preferencialmente ocultar CTA não acionável nesta primeira vertical slice.

Documentar decisão.

---

## 45. Counts cards

Renderizar:

- units;
- classes;
- teachers;
- students;
- guardians;
- current Academic Year quando existir.

Não inventar dados adicionais.

---

## 46. Current Academic Year

Se:

```text
hasCurrent = true
```

mostrar `year` e/ou período conforme UX.

Se:

```text
false
```

não inventar ano com base na data atual.

---

## 47. Design tokens

Criar tokens iniciais para:

- colors;
- typography;
- spacing;
- radius;
- shadow;
- border;
- focus;
- surface/background.

Não espalhar hex codes aleatórios pelos componentes.

---

## 48. Cores

Basear-se nos wireframes e logo:

- navy/azul escuro;
- blue;
- teal/green;
- yellow;
- neutral backgrounds;
- semantic warning/error/success.

Garantir contraste acessível.

Não usar amarelo claro como texto pequeno sobre branco sem contraste suficiente.

---

## 49. Typography

Escolher uma fonte web adequada e licenciada.

Preferência:

- system stack;
- ou Google/font package apenas se houver justificativa.

Não depender de fonte embutida proprietária.

A escolha deve aproximar a linguagem amigável dos wireframes.

---

## 50. Componentes base

Criar somente o necessário:

- Button;
- Input;
- Card;
- Badge;
- Spinner/Skeleton;
- Alert/ErrorState;
- AppShell;
- Sidebar/Nav;
- Progress;
- Logo/Brand.

Evitar design system gigante antecipado.

---

## 51. Accessibility

Obrigatório:

- semantic HTML;
- labels;
- keyboard navigation;
- visible focus;
- aria-live em erros relevantes;
- button vs link corretos;
- contrast;
- form errors associados;
- não depender só de cor para status.

---

## 52. Responsive baseline

Desktop é referência primária dos wireframes.

Também garantir funcionamento mínimo em:

```text
>= 1280px
768–1279px
< 768px
```

Não exigir redesign mobile completo nesta SPEC.

Em telas pequenas:

- sidebar pode colapsar;
- cards podem empilhar;
- forms continuam utilizáveis;
- nenhuma informação essencial deve ficar inacessível.

---

## 53. CSS strategy

Escolher uma estratégia simples e documentada.

Pode ser:

- CSS Modules;
- plain CSS organizado;
- outra solução já presente.

Não adicionar Tailwind, styled-components ou framework de UI sem necessidade comprovada.

Preferência inicial:

```text
CSS Modules + CSS variables/tokens
```

se compatível com o setup.

---

## 54. State management

Preferir React state/context quando suficiente.

Não adicionar:

- Redux;
- Zustand;
- MobX;

sem necessidade real.

Auth/session state pode viver em provider explícito.

---

## 55. Server state

Avaliar se `fetch` + hooks locais é suficiente.

Não instalar TanStack Query automaticamente.

Para esta SPEC há poucas requests:

- login;
- select;
- session;
- logout;
- overview.

Simplicidade é preferível.

---

## 56. Loading concurrency

Evitar duplicate requests causadas por StrictMode/dev behavior.

Side effects devem ser idempotentes/controladas.

Não remover StrictMode só para esconder bug.

---

## 57. Abort/cancellation

Requests de página devem aceitar AbortSignal.

Ao desmontar/trocar rota:

- cancelar request quando apropriado;
- evitar state update após unmount.

---

## 58. Retry

Não fazer retry automático para:

- login;
- select-school;
- logout.

Overview pode ter retry manual.

Não fazer retry automático cego em `select-school`.

---

## 59. Error boundary

Criar boundary de render para falhas inesperadas de React.

Não confundir error boundary com erro HTTP.

Estado deve ser amigável e sem detalhes internos.

---

## 60. Unknown route

Criar fallback simples:

```text
404 / página não encontrada
```

Com ação para voltar para Home/Login conforme sessão.

---

## 61. Security

Não:

- usar `dangerouslySetInnerHTML`;
- logar password/challenge/cookie;
- persistir segredo;
- expor BFF errors crus;
- construir URLs a partir de input arbitrário;
- aceitar tenant selector.

---

## 62. Console/logging

Produção não deve gerar logs sensíveis.

Evitar `console.log` de:

- responses auth;
- session;
- challenge;
- headers.

---

## 63. Lint

Preservar Oxlint escolhido no bootstrap.

Auditar config gerada.

Adicionar regras/config somente quando necessário.

Não trocar para ESLint nesta SPEC sem blocker concreto.

---

## 64. TypeScript

Manter strict.

Não usar `any` para contornar contratos.

Preferir:

- discriminated unions;
- explicit DTOs;
- exhaustive checks.

---

## 65. Build

Produção deve gerar bundle Vite válido.

Nenhum warning crítico ignorado.

---

## 66. Tests

Adicionar estratégia de testes apropriada.

Auditar se o template possui runner.

Se não possuir:

preferir solução leve e padrão para React/Vite.

Testar comportamento, não implementação interna.

---

## 67. Unit tests

Cobrir no mínimo:

- auth state transitions;
- login response union;
- selection state;
- session restore decisions;
- mapping de setup labels;
- mapping de alerts;
- quick action handling;
- error mapping.

---

## 68. Component tests

Cobrir:

- Login form;
- School Selection;
- Session Restoring;
- Admin Home empty;
- partial;
- configured;
- Forbidden;
- generic error.

Preferir queries acessíveis.

---

## 69. Integration tests

Mockar somente BFF HTTP boundary.

Fluxos:

### 69.1. Single-school

```text
login
→ authenticated
→ session
→ admin overview
```

### 69.2. Multi-school

```text
login
→ school_selection_required
→ select school
→ session
→ admin overview
```

### 69.3. Session restore

```text
reload
→ GET /session 200
→ Home
```

### 69.4. No session

```text
reload
→ GET /session 401
→ Login
```

### 69.5. Forbidden overview

```text
session valid
→ overview 403
→ SYS-01C
```

---

## 70. Real BFF E2E

Criar E2Es contra `frepp-school-bff` real, que por sua vez usa Core/PostgreSQL real quando infraestrutura estiver disponível.

Cobrir:

- direct login;
- multi-school selection;
- session restore;
- logout;
- empty overview;
- partial overview;
- configured overview;
- forbidden Teacher;
- multi-role Admin;
- tenant isolation.

Não acessar Core diretamente nos testes do Web.

---

## 71. Browser E2E

Se adicionar ferramenta browser E2E, justificar.

Preferência:

usar Playwright se for necessária automação real do browser.

Não adicionar Cypress + Playwright simultaneamente.

---

## 72. Visual regression

Fora do escopo obrigatório desta SPEC.

Pode registrar screenshots de E2E para documentação, mas não introduzir infraestrutura pesada de visual regression sem necessidade.

---

## 73. Wireframe comparison

No relatório, registrar por referência:

```text
AUTH-01
AUTH-02
ADM-01
ADM-02
ADM-03
SYS-01
```

Para cada uma:

- implementada;
- divergência;
- justificativa.

---

## 74. README

Documentar:

- stack;
- prerequisites;
- install;
- dev;
- build;
- lint;
- test;
- env;
- BFF dependency;
- auth flow;
- session flow;
- routes;
- design references;
- architecture;
- out of scope.

---

## 75. Environment example

Criar:

```text
.env.example
```

sem segredo.

Documentar BFF base URL.

Não versionar `.env.local`.

---

## 76. Out of scope

Não implementar:

- Unit CRUD;
- Academic Year CRUD;
- Class CRUD;
- Teacher CRUD;
- Student CRUD;
- Guardian CRUD;
- Teacher Home;
- Journey;
- Calendar;
- Communication;
- Reports;
- Notifications reais;
- Google login;
- forgot password;
- profile management;
- tenant switching pós-login;
- remember last School;
- analytics;
- feature flags;
- i18n framework;
- dark mode;
- animations avançadas do mascot;
- PWA;
- SSR.

---

## 77. No fake features

Elementos presentes nos wireframes mas sem backend/rota real não devem virar feature fake.

Exemplos:

```text
Google login
Forgot password
Notifications
Calendar
Reports
```

Podem ser omitidos nesta SPEC.

---

## 78. Compatibility

Não alterar:

- BFF;
- Core;
- contratos existentes;
- cookies;
- auth semantics;
- tenant semantics.

Web é consumidor.

---

## 79. File organization

Estrutura alvo conceitual:

```text
src/
├── app/
├── auth/
├── session/
├── admin/
│   └── overview/
├── shared/
│   ├── api/
│   ├── components/
│   └── styles/
└── assets/
    └── brand/
```

Não é obrigatório copiar literalmente se houver organização melhor e documentada.

---

## 80. Implementation report

Criar:

```text
docs/implementation/SPEC-001-report.md
```

Com seções:

1. resumo
2. auditoria Web
3. auditoria BFF
4. stack
5. dependencies
6. routing
7. API client
8. env
9. auth model
10. login
11. school selection
12. session restore
13. logout
14. authenticated shell
15. admin overview
16. empty state
17. partial state
18. configured state
19. forbidden
20. errors
21. loading
22. design tokens
23. responsive
24. accessibility
25. security
26. state management
27. cancellation/retry
28. tests
29. real BFF E2E
30. design references
31. divergences from AUTH-01
32. divergences from AUTH-02
33. divergences from ADM-01
34. divergences from ADM-02
35. divergences from ADM-03
36. divergences from SYS-01
37. files created
38. files changed
39. commands
40. results
41. risks
42. next steps

---

## 81. Validation final

Executar conforme scripts finais do projeto, no mínimo:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
git diff --check
git status
```

Se existir E2E:

```bash
pnpm test:e2e
```

Executar também integração real com BFF quando definida.

Nenhum teste operacional relevante skipped silenciosamente.

---

## 82. Git

Não fazer commit.

Não fazer push.

---

## 83. Critérios de aceite

Concluído somente quando:

- app inicia localmente;
- Oxlint passa;
- TypeScript strict passa;
- build passa;
- login funciona contra BFF;
- direct authentication funciona;
- school selection funciona;
- challenge não é persistido;
- session restore funciona;
- auth flicker é evitado;
- logout funciona;
- cookie continua HttpOnly/BFF-owned;
- Web não chama Core;
- Admin Shell existe;
- Admin Home consome `/admin/overview`;
- empty state existe;
- partial state existe;
- configured state existe;
- loading state existe;
- forbidden state existe;
- 401 volta para login;
- 403 não força logout;
- 5xx não vira empty setup;
- tenant nunca vem do browser;
- no localStorage auth;
- wireframes AUTH-01/AUTH-02/ADM-01/ADM-02/ADM-03/SYS-01 foram considerados;
- logo Frepp School é utilizado;
- responsive baseline funciona;
- acessibilidade básica passa;
- sem fake CRUDs;
- sem fake Google login;
- sem fake forgot password;
- sem dependências desnecessárias;
- tests passam;
- relatório existe;
- nenhum commit/push.

---

## 84. Próximo passo

Após aprovação desta SPEC:

iniciar uma capability administrativa real em par BFF + Web.

Provável próximo fluxo:

```text
Academic Setup / School Units / Academic Years
```

A partir daí:

```text
Core capability, se necessária
        ↓
BFF experience contract
        ↓
Web screen
```

mantendo desenvolvimento vertical.
