# Frepp School Web

Primeira vertical navegável: Login → seleção de escola quando necessária →
bootstrap de sessão → shell autenticado → visão geral administrativa.

```text
React / Web → frepp-school-bff → frepp-platform → PostgreSQL
apresentação  composição         domínio, auth, tenant e persistência
```

O Web chama exclusivamente o BFF. Progresso, contagens, ano vigente,
permissões, passos e pendências são recebidos prontos.

## Stack e instalação

Node 24 (`.nvmrc`), pnpm 12.15.0, React 19, TypeScript strict, Vite 8,
Oxlint, React Router, fetch nativo, Context/hooks e CSS Modules/variables.
Fonte do sistema; sem framework de UI, store ou biblioteca de server state.

```sh
nvm use
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Inicie o BFF separadamente conforme seu README, conectado ao Core/PostgreSQL
com migrations aplicadas, incluindo `000036` para overview. A aplicação usa
contas reais do ambiente e não contém credenciais de demonstração.

### Ambiente local completo

Os três repositórios irmãos podem ser iniciados em um único fluxo. O Platform
continua sendo a única fonte das credenciais locais de PostgreSQL; o script não
as duplica nem as imprime.

```sh
# Uma vez, caso o arquivo local do Platform ainda não exista:
cp -n ../frepp-platform/.env.example ../frepp-platform/.env

pnpm dev:all
```

O fluxo reutiliza um PostgreSQL que já esteja ouvindo na porta configurada ou
inicia o serviço do Compose; depois sobe Platform em
`127.0.0.1:8080`, BFF em `127.0.0.1:3001` e Web em `127.0.0.1:5173`. O Web usa
`VITE_BFF_BASE_URL=/bff`; o Vite encaminha esse prefixo ao BFF e o remove. O
BFF recebe `CORE_BASE_URL=http://127.0.0.1:8080`. `Ctrl+C` encerra os três
processos; o container PostgreSQL só é parado quando tiver sido iniciado pelo
próprio script.

As portas podem ser substituídas de forma coordenada com
`FREPP_PLATFORM_ADDR`, `FREPP_BFF_HOST`, `FREPP_BFF_PORT`, `FREPP_WEB_HOST` e
`FREPP_WEB_PORT`; as URLs entre serviços são derivadas desses valores. Os hosts
de desenvolvimento permanecem restritos a loopback. A URL de convite do
Platform que contém porta `3000` é uma configuração de link de ativação e não é
a porta de listen do BFF.

## Ambiente e publicação

| Variável | Default | Finalidade |
| --- | --- | --- |
| `VITE_BFF_BASE_URL` | `/bff` quando ausente | Base pública BFF: caminho na mesma origem ou URL HTTP(S) |
| `BFF_PROXY_TARGET` | `http://127.0.0.1:3001` | Destino somente do proxy Vite de desenvolvimento |

O Vite encaminha `/bff/*` ao BFF retirando `/bff`; o browser permanece na mesma
origem, sem exigir CORS. Configuração explicitamente vazia/inválida gera estado
amigável. URLs com credentials/query/fragment são recusadas. `VITE_*` é público
e incorporado no build: nunca coloque secrets. `.env`/`.env.local` ignorados.

Em produção, sirva `dist/` e configure o reverse proxy: `/bff/*` → BFF, removendo
esse prefixo; rotas da SPA → `index.html`. A rota BFF deve preceder o fallback
SPA. Use HTTPS e preserve `Set-Cookie`/HttpOnly/Secure/SameSite. O proxy Vite
não existe no bundle nem no preview. O BFF atual não habilita CORS; outra origem
exige infraestrutura com allowlist/credentials e cookies compatíveis.

## Comandos

| Comando | Finalidade |
| --- | --- |
| `pnpm dev` | Vite em loopback |
| `pnpm dev:all` | PostgreSQL → Platform → BFF → Web, com shutdown coordenado |
| `pnpm lint` | Oxlint |
| `pnpm typecheck` | App, configs e testes strict |
| `pnpm test` | Vitest + RTL/user-event/jsdom e HTTP local |
| `pnpm test:watch` | Testes locais em watch |
| `pnpm build` | TypeScript e bundle Vite |
| `pnpm preview` | Bundle local; autenticar exige reverse proxy externo |
| `pnpm test:e2e` | Chromium: fronteira BFF controlada e cadeia real |
| `pnpm test:e2e:browser` | Somente navegador com BFF boundary controlado |
| `pnpm test:e2e:real` | Somente Web → BFF → Core → PostgreSQL reais |
| `pnpm test:simulation` | App real contra Postman local, sem publicação |

## Rotas, sessão e autenticação

| Rota | Comportamento |
| --- | --- |
| `/login` | POST `/auth/login` com email/password |
| `/select-school` | Exige challenge em memória; POST `/auth/select-school` |
| `/` | Shell autenticado e Admin Home |
| Outras | 404 com retorno apropriado |

GET `/session` termina antes da escolha da tela; a espera mostra restauração,
evitando flicker. Login direto e seleção também executam `/session` antes da
Home. `experiences` é hint de UX: Admin+Teacher abre Admin Home; Teacher-only
fica autenticado em estado seguro de acesso não permitido. Core autoriza as
operações. Usuário e escola são exibidos com os dados reais da sessão.

A autenticação pertence ao cookie HttpOnly do BFF. Todas as requests usam
`credentials: 'include'`; o Web não lê cookies nem armazena tokens. Challenge e
opções vivem somente em memória. Refresh da seleção volta ao login; falhas
descartam o challenge para iniciar novo fluxo sem repetir um POST ambíguo.
Login/seleção/logout não têm retry automático. Logout só limpa o estado após
sucesso; falha mantém sessão e mensagem explícita. Um 401 autenticado remove
shell/sessão; 403 preserva sessão; rede/5xx permitem retry manual de leitura,
sem fabricar setup vazio. Requests usam AbortSignal e cleanup apropriado.

## Home, design e acessibilidade

GET `/admin/overview` fornece school, academicYear, setup, counts, alerts e
quickActions. O Web traduz códigos para PT-BR sem recalcular dados. Ano
ausente permanece “Não definido”. Progresso 100 com alerts vazios recebe
apresentação positiva. Actions de CRUD sem destino são ocultadas.

Referências: [WIREFRAMES-INDEX](docs/design/WIREFRAMES-INDEX.md), AUTH-01/02,
ADM-01/02/03 e SYS-01. O logo oficial é copiado para `src/assets/brand/`, sem
redesenho ou import de docs em runtime. Ilustrações decorativas simples usam
CSS. Layout adaptável, foco visível, labels, mensagens acessíveis, skip link,
status com texto/ícone e redução de movimento compõem o baseline acessível.

## Testes e infraestrutura

```sh
pnpm exec playwright install chromium
pnpm test
pnpm test:e2e
```

Os testes locais exercitam reducer/mappings/client e fluxos completos da UI,
substituindo somente a fronteira HTTP BFF. Os E2Es controlados verificam Enter,
refresh na seleção, erros e ausência de overflow em 320/390/768/1024/1440 px.

E2Es reais exigem `../frepp-school-bff` com dependências instaladas,
`../frepp-platform`, Go compatível com seu go.mod e PostgreSQL de testes do
compose do Core **já iniciado**. Opcionalmente configure `CORE_TEST_DATABASE_URL`
apenas no processo de teste, com permissão de criar schemas; nunca no Web/BFF.

O orquestrador em `tests/support/real-server.mjs` reutiliza o harness Go do BFF:
schema aleatório, migrations reais, contas sintéticas e `cmd/api` inalterado.
BFF de produção inicia sem logger e é acessado pelo proxy Vite `/bff`.
Controle fixo dos fixtures fica em outro servidor exclusivamente loopback,
fora da aplicação/BFF; metadados e credenciais ficam em memória. Cleanup fecha
processos, remove schema/temporários e não edita os repositórios irmãos.
O browser e as requests dos testes do Web chamam somente o BFF.

A suíte serial real cobre login direto/multi-school/restore/logout, três
estados de overview, Teacher 403, multi-role, isolamento, 500 real e revogação.
Ausência de infraestrutura falha explicitamente, sem skip condicional.
Portas locais: 4173 (browser), 4175 (real Web), 4176 (controle de fixture);
Core/BFF usam portas aleatórias. Não se gravam storageState, traces ou vídeos.
Os servidores de teste usam caches Vite separados para evitar interferência
na otimização de dependências quando iniciam juntos.

`test:simulation` exige Postman CLI >=1.70 e Chromium, portas 4901/4185. Snapshot
público mínimo do BFF deriva do código auditado. O app real restaura sessão e
apresenta 403 mantendo shell; eventos NDJSON comprovam as chamadas. Sem cloud,
workspace binding, histórico ou logs de payload. Não substitui a cadeia real.

## Estrutura

```text
src/app/                  bootstrap, rotas, shell, estados, error boundary
src/auth/                 login e seleção
src/session/              reducer, contexto e provider
src/admin/overview/       Home, HTTP state e apresentação
src/shared/api/           DTOs, env, fetch, validação e erros
src/shared/components/    componentes e ícones mínimos
src/shared/styles/        tokens e estilos globais
src/assets/brand/         cópia runtime do logo
tests/                    unit/component/integration/E2Es e infraestrutura
postman/                  simulação exclusivamente local
docs/implementation/      evidências e decisões
```

CRUDs, Teacher Home, Journey, relatórios, calendário, notificações, perfil,
troca de tenant após login, social login, recuperação de senha, i18n, dark mode,
PWA e SSR permanecem fora de escopo. Veja o [relatório](docs/implementation/SPEC-001-report.md).
