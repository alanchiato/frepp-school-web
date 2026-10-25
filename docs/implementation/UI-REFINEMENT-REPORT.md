# Frepp School Web — Auditoria e refinamento de UI/UX

Data: 25/10/2026. Escopo: somente `frepp-school-web`; sem commit ou push.

## 1. Resumo executivo

A interface atual foi auditada em Chromium com o zoom do navegador em 100%, cinco viewports e os mesmos dados simulados antes e depois. Foram capturadas 12 telas/estados por viewport, totalizando 60 imagens iniciais e 60 finais. O refinamento reduziu a altura excessiva da navegação mobile, removeu a borda visual indevida nos títulos focados automaticamente e corrigiu o título da aba nas páginas de alunos. A identidade visual e a escala compacta de desktop permaneceram iguais.

## 2. Estado inicial e fontes consultadas

Foram inspecionados o código atual, `package.json`, `src/shared/styles/{tokens,global}.css`, CSS Modules, componentes compartilhados, rotas, SPECs 001–012, relatórios de implementação 001/002, `docs/design/` e os wireframes aprovados. O asset `src/assets/illustrations/admin-home-welcome.png` permaneceu inalterado (SHA-256 `4b6f8de1a15d4aebea0c21694ec83ae19f530c0698838ff3d9e928290c83c7a3`). Não foi encontrado `AGENTS.md` ou `CLAUDE.md` aplicável.

O `git status --short` inicial registrou alterações preexistentes rastreadas em `src/admin/overview/*`, `src/admin/units/*`, `src/app/{App,AppShell}.tsx`, `src/shared/api/*`, `src/shared/components/Icon.tsx` e testes de app/modelo/unidades; havia também SPECs 008–012 e módulos/testes acadêmicos, de disciplinas, professores e alunos ainda não rastreados. O arquivo `src/admin/units/unit-stepper.module.css` já estava marcado como removido. Todo esse trabalho foi preservado.

## 3. Escala e densidade aprovadas

O código inicial já aplicava `body { zoom: 75%; }` a partir de 1024 px, com compensação de `min-height: 133.3333svh` no shell e na autenticação. Esta auditoria **não introduziu nem alterou** essa regra. O `:root` usa 16 px/1,5, fonte de sistema arredondada, espaçamentos de 4 a 48 px, sidebar de 238 px no desktop e 200 px no tablet. Os botões compartilhados têm `min-height: 48px` antes da regra de escala; campos de vários cadastros usam 50 px. Os breakpoints centrais são 1024 px e 767 px, com ajustes locais em 700, 600 e 480 px.

Medição no Chromium, com browser em 100% e `deviceScaleFactor: 1`:

| Viewport | `body` antes/depois | Fonte raiz antes/depois | Scroll horizontal do documento |
| --- | --- | --- | --- |
| 1440 × 900 | 0,75 / 0,75 | 16 px / 16 px | Não / Não |
| 1280 × 800 | 0,75 / 0,75 | 16 px / 16 px | Não / Não |
| 768 × 1024 | 1 / 1 | 16 px / 16 px | Não / Não |
| 390 × 844 | 1 / 1 | 16 px / 16 px | Não / Não |
| 360 × 800 | 1 / 1 | 16 px / 16 px | Não / Não |

A regra preexistente de `zoom` não é ideal como estratégia geral futura, mas alterá-la agora mudaria a aparência já aprovada. Qualquer substituição exigiria uma comparação visual própria e decisão de produto.

## 4. Telas e interações auditadas

As capturas pareadas cobrem login, seleção de escola, visão geral, unidades, anos letivos, séries/turmas, disciplinas, professores, alunos e o primeiro passo dos wizards de unidade, professor e aluno. Uma segunda inspeção final acrescentou 35 capturas de detalhes de unidade, professor e aluno, telas de convite e associação de UNIT_ADMIN, visão geral e lista de unidades do UNIT_ADMIN. O navegador abriu os wizards e formulários, preencheu o login de teste para chegar à seleção e navegou pelas rotas disponíveis. As respostas HTTP foram fixtures locais; nenhuma operação persistente foi enviada a BFF/Core. Os E2Es existentes cobrem login por teclado, seleção, restauração de sessão, logout e estados de erro.

As evidências estão em [`evidence/UI-REFINEMENT-2026-10-25/`](evidence/UI-REFINEMENT-2026-10-25/), com arquivos `before/` e `after/` de mesmo nome e métricas JSON. Exemplos comparáveis: [`overview-360x800` antes](evidence/UI-REFINEMENT-2026-10-25/before/overview-360x800.png) / [depois](evidence/UI-REFINEMENT-2026-10-25/after/overview-360x800.png), [`units-390x844` antes](evidence/UI-REFINEMENT-2026-10-25/before/units-390x844.png) / [depois](evidence/UI-REFINEMENT-2026-10-25/after/units-390x844.png), [`students-768x1024` antes](evidence/UI-REFINEMENT-2026-10-25/before/students-768x1024.png) / [depois](evidence/UI-REFINEMENT-2026-10-25/after/students-768x1024.png), e [`overview-1440x900` antes](evidence/UI-REFINEMENT-2026-10-25/before/overview-1440x900.png) / [depois](evidence/UI-REFINEMENT-2026-10-25/after/overview-1440x900.png). `extended/` contém a segunda inspeção; essas 35 imagens são finais e não têm par inicial.

## 5. Problemas, prioridade e solução

| Prioridade | Tela/componente | Evidência e impacto | Solução executada |
| --- | --- | --- | --- |
| P1 | Todas as telas autenticadas, navegação ≤767 px | Nas capturas mobile iniciais, a sidebar em linha deixava o logo à esquerda e os sete links empilhados à direita; o conteúdo começava muito abaixo. | Organizar logo e links em coluna, com links em grade de três colunas, preservando ordem, rótulos, ícones e áreas de clique de pelo menos 44 px de altura. |
| P2 | Títulos de login e páginas internas | Uma borda azul extensa aparecia nos `h1` focados programaticamente pelo roteador, confundindo foco de leitura com controle interativo. | Remover o contorno somente de `h1[tabindex='-1']:focus`; indicadores de foco dos links, botões e campos seguem ativos. |
| P2 | Lista/perfil de alunos, título da aba | Inspeção do código mostrou que a rota `/admin/students` e seu detalhe caíam no título de página não encontrada. | Mapear os títulos “Alunos” e “Perfil do aluno”, sem mudar rotas ou comportamento. |

Não foi encontrado P0 nas telas e estados cobertos. As tabelas permaneceram legíveis nos cenários capturados; no tablet, os nomes longos se quebram dentro das células, sem extrapolar o viewport. O refinamento não alterou cards, formulários, componentes compartilhados, dados, permissões, convites ou regras de domínio.

## 6. Responsividade, acessibilidade e estados

**Observação visual em navegador:** a navegação mobile passou a ocupar menos espaço vertical, mantendo os sete destinos visíveis e o item ativo destacado. A distribuição da visão geral, ilustração, filtros, tabelas e wizards permaneceu equivalente antes/depois. O mascote e o logo não foram alterados.

**Verificação automatizada:** as 120 capturas pareadas usaram os mesmos cinco viewports, fixtures e configuração de navegador; as 35 capturas adicionais usaram essa configuração no estado final. Nenhuma apresentou scroll horizontal do documento. As métricas de `body.zoom` e fonte raiz ficaram idênticas nas comparações pareadas. Os E2Es validaram foco e uso do login por teclado, além dos estados 401/403, restauração e logout. Foco visível em controles continua definido por `:focus-visible`.

**Avaliação de UX:** a grade mobile reduz o esforço de rolagem antes do conteúdo e preserva a arquitetura de navegação atual. A nova distribuição foi escolhida como correção de responsividade, sem acrescentar menus ou etapas.

## 7. Testes e resultados

| Comando / checagem | Resultado |
| --- | --- |
| `pnpm lint` | Exit 0, com avisos preexistentes de hooks/Fast Refresh em módulos fora deste refinamento. |
| `pnpm typecheck` | Aprovado. |
| `pnpm test` | 112/112 aprovados. |
| `pnpm build` | Aprovado. |
| `pnpm test:e2e:browser` | 7/7 aprovados com fixtures locais. |
| Capturas Chromium | 60 antes + 60 depois, mais 35 capturas finais de telas secundárias; cinco viewports; sem scroll horizontal do documento. |
| `git diff --check` | Aprovado (exit 0); o comando cobre diferenças rastreadas, não inspeciona conteúdo de arquivos ainda não rastreados. |

Os testes E2E com BFF/Core reais não foram executados neste refinamento de apresentação. As evidências visuais validam Chromium local com fixtures, não um navegador conectado a dados reais de produção.

## 8. Arquivos, pendências e recomendações

**Modificados nesta tarefa:** `src/app/app.module.css`, `src/shared/styles/global.css`, `src/app/App.tsx`.

**Criados:** este relatório e `docs/implementation/evidence/UI-REFINEMENT-2026-10-25/` com 155 PNGs e três JSONs de métricas. Evidências anteriores não foram sobrescritas.

**Pendências:** os avisos de lint preexistentes não foram refatorados por não corresponderem a defeitos visuais observados. Não houve medição automatizada de contraste, leitor de tela ou teste multibrowser. Estados de convite/associação e detalhes de unidades/professores/alunos foram inspecionados no navegador após as correções, mas não têm capturas pareadas nesta rodada.

**Proposta que exige decisão de produto:** se a navegação ganhar mais destinos, considerar um mecanismo mobile de expansão. A estrutura atual foi mantida porque os sete destinos cabem sem corte na grade auditada.

**Risco residual:** futuras mudanças no número ou comprimento dos rótulos da navegação podem exigir novo teste em 360 px. A regra desktop de `zoom` já existente requer cuidado em qualquer evolução de escala.

## 9. Evolução mobile posterior à auditoria

Após as capturas `before/after/extended/` desta auditoria, a navegação em telas de até 1023 px foi convertida em um painel lateral acionado pelo botão do cabeçalho. Em celulares de até 767 px, o conteúdo da página usa escala de 80%, enquanto o cabeçalho conserva o tamanho original; o painel lateral e seus itens também ficaram mais compactos. Na visão geral, os indicadores de SCHOOL_ADMIN e UNIT_ADMIN passaram a deslizar horizontalmente em cards estreitos.

O painel entra e sai pela esquerda em 320 ms, acompanhado pela transição de opacidade da camada que escurece o conteúdo. A preferência por movimento reduzido desativa essas transições pela regra global. As capturas atuais estão em [`SCHOOL-MOBILE-overview.png`](evidence/SCHOOL-MOBILE-overview.png) e [`SCHOOL-MOBILE-menu.png`](evidence/SCHOOL-MOBILE-menu.png). As conclusões sobre a antiga grade de links nas seções 5, 6 e 8 descrevem apenas o estado da auditoria inicial.

Na validação final, `pnpm typecheck`, `pnpm test`, `pnpm build` e os E2Es de navegador passaram: 118 testes de interface e 9 testes de navegador. `pnpm lint` terminou sem erros, com avisos de hooks e Fast Refresh.
