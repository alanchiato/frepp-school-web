# SPEC-001 — Relatório de implementação

## 1. Resumo

Vertical implementada: Login → seleção quando necessária → session bootstrap
→ shell autenticado → Admin Home. Web → BFF → Core → PostgreSQL.
Sem commit/push e sem alteração de arquivos dos repositórios vizinhos.

## 2. Auditoria Web

Lidas SPEC-001, WIREFRAMES-INDEX e referências visuais AUTH-01/02, ADM-01/02/03
e SYS-01; logo inspecionado. Auditados package/lockfile, Vite, tsconfigs,
Oxlint, template, assets, gitignore, README e Git. Nenhum AGENTS.md/CLAUDE.md
aplicável encontrado. Inicialmente não havia commits: arquivos do template e
docs estavam não rastreados; index permaneceu intacto.

Versões efetivas: Node v24.21.0, pnpm 12.15.0, React/React DOM 19.3.1,
TypeScript 6.0.3, Vite 8.3.5, Oxlint 1.89.0 e plugin-react 6.1.2.
Confirmadas por install/lock/binários, sem confundir ranges com versões reais.
Template sem router/test runner; strict não estava habilitado explicitamente.

Baseline antes da implementação: install frozen, lint, build, diff check e
status executados. Primeira instalação encontrou DNS restrito no sandbox;
repetição com acesso autorizado passou. Lint/build passaram sem falha funcional
preexistente observada. typecheck/test/test:e2e não existiam: ausência inicial,
não falha. Tooling existente preservado, com strict habilitado.

## 3. Auditoria BFF

Autoridade: ../frepp-school-bff, HEAD 600b724. Lidos README, SPECs/reports
001–004 e código real de sessionbootstrap (schemas/routes/service/clients/
experiences), adminoverview (contract/routes/view-model/service), build-app,
errors/cookies e E2Es/fixtures. Core HEAD e0bd24b, infraestrutura/harness
existentes inspecionados; BFF e Core permaneceram sem alterações.

| BFF | Request | Resposta |
| --- | --- | --- |
| POST /auth/login | Exatamente email/password strings | 200 authenticated ou school_selection_required |
| POST /auth/select-school | challengeToken/schoolId strings | 200 authenticated |
| GET /session | Sem selector/body | user, school, roles, permissions, experiences |
| POST /auth/logout | Sem body necessário | 204 sem body, expiração do cookie |
| GET /admin/overview | Sem selector/body | school, academicYear, setup, counts, alerts, quickActions |

Authenticated: user.id/schoolId/email/status ACTIVE. Selection: challengeToken
e schools id/name, ao menos duas opções, sem user/cookie. Session user só tem
id/email/status; school tem id/name/timezone; experiences é objeto de booleanos
admin/teacher. Não é lista de strings nem autorização.

Overview exato: academicYear `{hasCurrent,current:null|{id,year,startDate,endDate}}`;
setup `{progress,steps:[{code,status}]}`; counts units/classes/teachers/students/
guardians; alerts `{code,severity:'warning',count,action?}`; quickActions string[].
Year é int32. DTO antigo conceitual name/status não foi copiado.

Passos: school_units, academic_year, classes, teachers, students, guardians;
statuses complete/attention/not_started. Alerts: no_current_academic_year,
classes_without_teacher, students_without_guardian, teachers_without_assignment.
Actions reais: create_unit, create_academic_year, create_class, add_teacher,
add_student, add_guardian, assign_teachers, link_guardians; BFF já filtra UX.

Envelope `{error:{code,message}}`; invalid_credentials/invalid_login_challenge/
unauthorized são 401, forbidden 403, internal_error 500, bad_gateway 502,
upstream_timeout 504. Mensagens cruas não são refletidas no Web.
Cookie School: HttpOnly, SameSite=Strict, Path=/, sem Domain no Core atual;
Secure depende de ambiente/Core/TLS. BFF transporta atributos intactos.
Session não renova cookie; logout 204 também cobre sessão já inválida no Core.

## 4. Stack

React, TypeScript, Vite, Oxlint e pnpm nas versões auditadas. Strict e
StrictMode ativos; CSS Modules + variables e fonte do sistema.

## 5. Dependencies

Runtime novo: react-router-dom 7.18.4, routing/history/redirects maduros.
Development: Vitest 5.0.5, RTL 16.3.3, user-event 14.6.8, jest-dom 7.0.1,
jsdom 30.1.3 e Playwright 1.64.1. Justificados pela cobertura unit/component/
integration/browser exigida. Lock atualizado pelo pnpm. Sem Axios, Zod,
store, TanStack Query, styling framework ou client de banco.

## 6. Routing

BrowserRouter: /login, /select-school, / e 404. Home canônica /.
Selection sem memória volta ao login. Guards são UX; Admin+Teacher abre Home,
Teacher-only permanece autenticado em estado seguro. Título/foco acompanham UI.

## 7. API client

Fetch explícito em cinco operações BFF: base validada, JSON, credentials include,
no-store, redirect error, AbortSignal, 204 e parsing seguro. DTOs e unions
explícitos; leitores unknown projetam campos sem replicar schemas de domínio.
Sem any ou cast duplo. BFF gera request ID; nenhum header inventado no browser.

## 8. Env

.env.example: VITE_BFF_BASE_URL=/bff e BFF_PROXY_TARGET local de desenvolvimento.
Ausência usa /bff; valor explicitamente inválido mostra erro sanitizado.
Sem produção hardcoded. .env/.env.local ignorados. Proxy local retira /bff;
produção precisa de reverse proxy/HTTPS equivalente. Sem alteração de CORS.

## 9. Auth model

Reducer discriminado: unknown, restoring, restore_error, unauthenticated,
logging_in, selecting_school, selecting, authenticated, logging_out.
Context/provider centraliza restore, session, login, challenge, logout e 401.

## 10. Login

AUTH-01: marca, boas-vindas, email/senha, Enter, loading e mensagem indistinta
de credenciais inválidas. Required/email simples, erros associados e foco no
campo inválido; autocomplete email/current-password. Campos/botão bloqueados e
trava síncrona impedem duplicação. Senha não entra no provider e campo é limpo
após tentativa concluída. Union real conduz a /session ou seleção.

## 11. School selection

AUTH-02: radios nativos, nomes reais e Continuar. Challenge/opções apenas em
memória; sem parsing, logs, URL, storage ou cookie. Voltar descarta seleção.
Sucesso descarta challenge e faz /session. 401/transporte ambíguo requer novo
login; nenhum replay automático de POST potencialmente consumido.

## 12. Session restore

GET /session antes de escolher UI. Unknown/restoring mostram SYS-01A sem flicker.
401 → login; 5xx/rede → erro recuperável com retry de leitura. Ambos os caminhos
de login usam bootstrap real. Microtask e cleanup evitam request duplicada no
replay inicial do StrictMode, comprovado pelo teste de integração.

## 13. Logout

POST sem retry; só sucesso limpa sessão/challenge e navega ao login. Erro mantém
sessão e mensagem explícita, sem afirmar revogação. 401 invalida estado local.
Cookie continua BFF/Core-owned.

## 14. Authenticated shell

Logo, escola atual, email real, Visão geral, logout e main com skip link.
Header/sidebar adaptáveis. Sem perfil, tenant switching ou links fictícios.

## 15. Admin overview

GET /admin/overview após bootstrap Admin. Loading/ready/forbidden/error locais.
Counts/progress/steps/ano/alerts recebidos diretamente. Códigos traduzidos em
PT-BR; desconhecidos têm fallback seguro. Actions sem destino são ocultadas.

## 16. Empty state

Progress 0 BFF, cinco counts reais, passos not_started, ano ausente e alerta
real. Banner acolhedor sem placeholders. Erros nunca produzem setup vazio.

## 17. Partial state

Statuses recebidos, counts variáveis e alertas com count/severity/ícone.
Fixture real comprovou progress 50, três attention e counts 1/2/2/2/2;
esses números existem somente nos testes, sem regra no código de produção.

## 18. Configured state

Progress 100 e alerts vazios produzem apresentação positiva. Mesma sessão viu
relações completadas no fixture real. Sem recalcular progress ou certificar domínio.

## 19. Forbidden

SYS-01C com shell/sessão/logout preservados; retry manual de overview.
Teacher-only não busca dados Admin; teste também comprova 403 real do BFF.
Revogação real de permission mantém /session 200 com overview 403.

## 20. Errors

401 remove shell; 403 não faz logout; rede/500/502/504 mostram falha temporária.
HTML/envelope inválido/sucesso incompatível falham sem DTO fabricado.
Nenhuma message/stack/URL crua exposta. Render inesperado usa ErrorBoundary.

## 21. Loading

SYS-01A no restore; SYS-01B com skeletons dentro do shell. Status acessíveis,
layout estável, POSTs indicam progresso e bloqueiam duplicação. Reduced motion.

## 22. Design tokens

tokens.css centraliza navy/blue/teal/yellow, neutros, semânticas, typography,
spacing, radius, border, surface, shadow e focus. Amarelo é accent/fundo com
texto navy, não body text pequeno sem contraste. CSS Modules por módulo.

## 23. Responsive

Desktop: sidebar/cinco cards/duas colunas; tablet reorganiza; abaixo de 768
nav vira header e conteúdo empilha. Chromium verifica ausência de overflow e
logout visível em 1440/1024/768/390/320. Login inspecionado visualmente em 320
e 1440. Sem redesign mobile completo.

## 24. Accessibility

Labels, fieldset/radios, erros associados, aria-invalid/describedby, status/alert,
focus visível, skip link e status com texto/ícone. Teclado/Enter testados no
Chromium. Gestão de foco usa layout effect para evitar foco tardio durante
digitação. Baseline comprovado; não se afirma certificação WCAG completa.

## 25. Security

Sem token em storage, Cookie manual, bearer, challenge persistido, tenant
selector, dangerouslySetInnerHTML ou logs de secrets. Paths fixos BFF.
Logo runtime copiado sem redesenho. Fixtures sintéticos em memória; sem
storageState/traces/vídeos. Nenhum secret/PII real incluído neste relatório.

## 26. State management

React reducer/context e hooks locais; sem store externo/cache de sessão ou
permission. Roles/permissions/experiences transportados sem derivação no Web.

## 27. Cancellation/retry

Signals em todas as operações e cleanup de provider/form/página. Bootstrap
pós-login pertence ao provider e sobrevive ao desmontar esperado do form.
Overview cancelado não atualiza estado. POSTs não repetidos; retry manual em
leituras. Testes cobrem abort antes do envio e durante leitura do body.

## 28. Tests

Vitest/RTL: reducer/transições, unions, mappings, ações sem destino, env,
client/204/HTML/rede/abort, login/seleção/restore, três Homes, skeleton, 401/403/
5xx, logout com falha, 404 e boundary. Integração executa fetch/client/provider/
router reais com servidor HTTP descartável apenas no BFF boundary.
Sete E2Es Chromium controlados validam UI, segurança efêmera e responsive.

Skills postman:api-engineer, api-testing e api-simulation orientaram a integração.
Simulação pública mínima foi derivada da fonte local BFF exigida, sem busca
remota de mocks, binding ou publicação cloud. App real executou restore e
overview 403; eventos de request verificaram o tráfego. Esse stand-in não
substitui a prova com Core/PostgreSQL reais.

## 29. Real BFF E2E

Dez testes contra Web/BFF/Core/PostgreSQL reais. Reuso do harness Go BFF sem
edição: schema aleatório, migrations reais, dados sintéticos e cmd/api original.
BFF buildApp com logger false e porta aleatória; Vite same-origin. Controle
fixo de fixtures em outro servidor loopback, fora da aplicação/BFF. Metadados
em memória; cleanup remove schema/temporários e fecha servidores/filhos.

Cobrem login direto/cookie HttpOnly/SameSite, restore, logout/401 posterior,
seleção sem sessão intermediária, empty/partial/configured, Teacher 403,
multi-role, isolamento de duas Schools/selector rejeitado, 500 com recuperação
e permission revogada sem logout. Browser e requests do Web só acessam BFF.
Ausência de Go/PostgreSQL/dependências falha explicitamente, sem skip condicional.

## 30. Design references

| Referência | Implemented | Divergences / reason |
| --- | --- | --- |
| AUTH-01 | Sim | Duas colunas/marca/form/CTA; recursos sem backend omitidos |
| AUTH-02 | Sim | Seleção com nomes reais, sem metadados fictícios |
| ADM-01 | Sim | Onboarding/passos; sem CTA CRUD/guia inexistente |
| ADM-02 | Sim | Counts/progress/alerts; layout unificado |
| ADM-03 | Sim | Estado positivo 100/sem alerts; ano/passos reais |
| SYS-01 | Sim | Restore/skeleton/forbidden com ações disponíveis |

Imagens oficiais e capturas locais da aplicação inspecionadas visualmente.
Sem visual regression infrastructure ou imagem inteira de wireframe em runtime.

## 31. Divergences from AUTH-01

Google/forgot password/links legais sem destino/ano fictício omitidos.
Ilustração CSS simplificada, sem redesenhar logo. Fonte do sistema e spacing
adaptável preservam intenção sem pixel-perfect ou novas imagens/fontes.

## 32. Divergences from AUTH-02

School não é Unit. Campus/cidade/endereço/segmento e promessa de troca posterior
omitidos por ausência de contrato/escopo. Voltar descarta fluxo sem afirmar logout.

## 33. Divergences from ADM-01

Sem nome pessoal fictício, seletor, menus futuros ou guia sem destino. Counts
sempre disponíveis; passos compartilham layout com os outros estados. CTA CRUD omitido.

## 34. Divergences from ADM-02

Sem notificações/data mock/“ver todos”/ajuda inexistente. Nome/email/números
reais. Passos em lista favorecem consistência/mobile, sem inferir progresso.

## 35. Divergences from ADM-03

Sem calendário/comunicação/relatórios/perfil/CRUD. Ano é contexto separado;
academic_year segue BFF em vez de “dados da escola”. Banner usa 100/alerts reais.

## 36. Divergences from SYS-01

Logo completo no restore em vez de extrair mascote. Skeleton em vez de gráfico
fictício. Forbidden mantém shell/logout; Teacher-only não recebe retry de Home
não suportada. Mensagens funcionais sem erro interno.

## 37. Files created

- .env.example, .nvmrc, vitest.config.ts, playwright.config.ts, tsconfig.test.json.
- src/app/: App, Bootstrap, AppShell, ErrorBoundary, SystemStates, CSS Module.
- src/auth/: AuthLayout, Login, SchoolSelection, CSS Module.
- src/session/: model, context, SessionProvider.
- src/admin/overview/: AdminHome, presentation, CSS Module.
- src/shared/api/: contracts, config, client, errors, validation.
- src/shared/components/: ui, Icon, CSS Module; shared/styles/: tokens/global.
- src/assets/brand/frepp-school-logo.png, cópia runtime.
- tests/: setup, model/client/app, fixtures, dois E2E suites e launch/real-server.
- postman/mocks/bff e simulations/bff.sim.yaml; tests/simulation/run.mjs.
- docs/implementation/SPEC-001-report.md.

## 38. Files changed

package/lock (router/tests/scripts), README, main/index, Vite, tsconfigs e
gitignore. App.tsx/App.css/index.css do template substituídos pelos módulos.
Assets antigos preservados sem import. Oxlint config, SPEC/designs/brand
originais preservados. Sem HEAD no Web, Git lista arquivos não rastreados;
“changed” aqui compara com o conteúdo auditado inicial.

## 39. Commands

Audit: node/pnpm/version/list, rg/cat/view_image e git status/diff/rev-parse.
Baseline antes de editar; pnpm add dos pacotes listados; Chromium instalado;
pnpm dev e screenshots locais controlados; testes direcionados durante ajustes.

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
pnpm test:simulation
git diff --check
git status
```

Também test:e2e:browser/real separados. Operações de rede/loopback/Go/PG/browser
executadas com acesso local autorizado. Sem publish/deploy/commit/push.

## 40. Results

| Validação | Resultado final |
| --- | --- |
| pnpm install --frozen-lockfile | Exit 0, lock coerente |
| pnpm lint | Exit 0, Oxlint sem warnings |
| pnpm typecheck | Exit 0, strict em app/config/testes |
| pnpm test | 76 passando, zero falhas/skips |
| pnpm build | Exit 0, bundle Vite válido |
| pnpm test:e2e | 17 passando: 7 browser controlados + 10 cadeia real; zero skips |
| Teste de teclado repetido | 10 execuções consecutivas aprovadas |
| pnpm test:simulation | Browser real contra Postman local aprovado; eventos /session 200 e /admin/overview 403 comprovados |
| git diff --check | Exit 0 |
| Whitespace de arquivos novos | Sem trailing whitespace, inclusive untracked |
| Logo runtime/original | Cópias idênticas byte a byte |
| Git BFF/Core | Sem alterações |

Total da suíte principal: 93 testes aprovados, além do cenário Postman e da
repetição direcionada. Nenhum operacional relevante omitido na rodada final.
JS de produção 287,24 kB (91,07 kB gzip), CSS 17,83 kB (4,37 kB gzip),
logo oficial 474,05 kB. Sem warning crítico de build. Avisos de NO_COLOR versus
FORCE_COLOR no launcher Playwright são do ambiente, sem falha funcional.
Vite iniciado e inspecionado em navegador; processos de inspeção encerrados.
Web continua sem commits e com arquivos não rastreados, como no baseline.

Histórico explícito: primeira rodada falhou em um teste de foco e no nome
esperado de um fixture; oito testes reais posteriores não rodaram por dependência
serial. Gestão de foco e nome confirmado no código corrigidos. Rodadas seguintes
passaram 7/7 browser e 10/10 reais; nenhuma assertion removida para passar.
A intermitência de teclado reapareceu numa rodada combinada: os servidores
Vite compartilhavam cache de otimização. Caches foram isolados e o teste passou
a aguardar foco pronto explicitamente, mantendo Tab/digitação/Enter e adicionando
assertions de foco/valor. Duas rodadas completas seguintes passaram e o teste
direcionado passou dez vezes. A mudança não habilitou retry automático do runner.

## 41. Risks

Produção exige reverse proxy/origem/HTTPS coerentes; loopback não prova TLS de
produção. Cookie continua Core-owned. E2Es reais dependem de repos irmãos e
harness/Go/PG; mudanças de contrato exigem revisão. Readiness BFF continua local;
fatos/contexto não compartilham snapshot HTTP. Baseline acessível não equivale
a certificação completa. Sem cache/retry para mascarar indisponibilidade.

## 42. Next steps

Revisar entrega/configuração de publicação. Próxima jornada pode implementar
capability administrativa real BFF+Web e liberar sua action. Sem CRUD, Teacher
Home ou tenant switching antecipado. Sem commit/push.
