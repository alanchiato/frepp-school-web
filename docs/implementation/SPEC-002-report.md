# SPEC-002 — Ilustração de boas-vindas da Admin Home

## 1. Resumo da implementação

O banner compartilhado da Admin Home agora mostra o PNG oficial do mascote à direita do texto. A alteração é visual: não muda fluxos, rotas, contratos, chamadas HTTP ou regras de setup.

## 2. Auditoria inicial

Antes das edições, foram lidas integralmente a SPEC-002, a Web SPEC-001 e seu relatório. Foram inspecionados `src/admin/overview/`, CSS Modules da Home e do shell, `tokens.css`, breakpoints de 1279/767 px, fixtures, testes de componente, E2E de browser e E2E com BFF real. `OverviewContent`, em `AdminHome.tsx`, já renderizava um único banner nos estados empty, partial e configured; o elemento visual anterior era um ícone SVG. A referência ADM-01 e o PNG oficial existiam e foram abertos visualmente. O Git já listava todo o projeto como não rastreado; esse estado precede a SPEC-002.

## 3. Asset utilizado

`src/assets/illustrations/admin-home-welcome.png` é a fonte visual de runtime, importada pelo Vite. Inspeção visual confirmou cabeça pêssego, cabelos brancos nas duas laterais, óculos redondos azul-escuros, olhos fechados alegres, livro verde/azul, três traços amarelos, caminho azul tracejado, pilha de livros e planta. O arquivo não foi alterado, recortado ou substituído.

## 4. Dimensões e tamanho

PNG RGBA, 1774 × 887 px, 738.641 bytes (aproximadamente 721 KiB). O wireframe ADM-01 tem 1448 × 1086 px. O build emite o PNG com 738,64 kB decimais.

## 5. Componente alterado

Somente `OverviewContent` recebeu o import e o `<img>` no banner existente. `AdminHome`, carregamento, erros e apresentação de dados permanecem iguais.

## 6. Estratégia de layout

O CSS Module do banner passou de flex para grid com coluna de texto flexível e coluna de arte de 44%. `minmax(0, ...)` permite quebra de nomes e mensagens longos; gap e padding usam tokens existentes. O fundo azul-claro e a borda arredondada existentes foram mantidos. O estado configurado conserva seu gradiente verde/azul.

## 7. Desktop

Em 1440 px, texto à esquerda e arte alinhada à direita e à base, com largura máxima de 420 px. Após a primeira captura, a arte e o padding foram reduzidos para aproximar a altura e o equilíbrio do ADM-01. O card final mede cerca de 260 px de altura no fixture de 1440 px; o wireframe mostra um banner mais baixo, perto de 210 px. A diferença decorre da proporção e das margens transparentes do PNG completo, preservado sem corte.

## 8. Tablet

De 768 a 1279 px, padding de 24 px e gap de 16 px deixam mais espaço ao texto. A coluna da arte encolhe proporcionalmente. Em 1024 e 768 px, texto e imagem permanecem em colunas separadas; a imagem inteira fica dentro do card.

## 9. Mobile

Abaixo de 768 px, o banner empilha texto e imagem. A arte mantém `width: min(100%, 340px)` e `height: auto`, alinhada à direita. Capturas em 390 e 320 px mostram rosto, cabelos, óculos, livro, livros e planta sem corte. A página não apresenta overflow horizontal.

## 10. Acessibilidade

O `<img>` usa `alt=""` e `aria-hidden="true"`, sem role interativo nem elemento focável. O texto do banner continua no DOM e na árvore acessível. Os testes conferem os atributos e a navegação por teclado existente continua coberta pelo E2E.

## 11. Performance

Import local do Vite; nenhuma URL externa, base64 ou dependência nova. Os atributos `width="1774"` e `height="887"`, combinados com `height: auto`, reservam a proporção antes do carregamento. A imagem da primeira tela não usa lazy loading. O peso de 721 KiB é uma oportunidade futura de otimização caso métricas reais de carregamento indiquem necessidade; o original deve permanecer disponível.

## 12. Empty state

Fixture controlado: progresso 0%, escola, contagens, passos e alerta preservados. A imagem não participa da escolha do estado. O E2E real confirmou o aggregate vazio vindo do BFF.

## 13. Partial state

Fixture controlado: progresso 50%, contagens, passos e alertas preservados. O E2E real confirmou dados parciais do BFF/Core/PostgreSQL.

## 14. Configured state

Fixture controlado: progresso 100%, mensagem positiva e ausência de alertas preservados. O E2E real confirmou a mudança de fixture na mesma sessão.

## 15. Comparação com ADM-01

Comparação visual direta entre o PNG ADM-01 e a captura de 1440 px: composição texto à esquerda/mascote à direita, fundo azul suave, cantos arredondados, livros e planta à direita, e hierarquia do texto correspondem à intenção do wireframe. O nome de escola, a mensagem e as demais informações usam dados reais ou fixtures de teste, sem copiar “Ana Carolina” nem ações fictícias. O banner ficou um pouco mais alto que no wireframe para acomodar o PNG inteiro sem cortar elementos de identidade.

## 16. Screenshots e evidência visual

Capturas reais do Chromium, após o ajuste final:

| Estado e largura | Evidência | Inspeção visual |
| --- | --- | --- |
| Empty 1440 px | [captura](evidence/SPEC-002-empty-1440.png) | Composição desktop e comparação com ADM-01 |
| Empty 1024 px | [captura](evidence/SPEC-002-empty-1024.png) | Imagem reduzida à direita, texto legível |
| Empty 768 px | [captura](evidence/SPEC-002-empty-768.png) | Duas colunas sem sobreposição |
| Empty 390 px | [captura](evidence/SPEC-002-empty-390.png) | Empilhamento e arte inteira |
| Empty 320 px | [captura](evidence/SPEC-002-empty-320.png) | Menor viewport, sem corte ou overflow |
| Partial 1440 px | [captura](evidence/SPEC-002-partial-1440.png) | Mensagem parcial e mascote |
| Configured 1440 px | [captura](evidence/SPEC-002-configured-1440.png) | Mensagem positiva, fundo verde/azul e mascote |

Todas as sete capturas foram abertas e inspecionadas. As verificações automatizadas de geometria e ausência de overflow cobrem os três estados em todas as cinco larguras; as capturas adicionais de partial/configured foram feitas em desktop. Capturas menores mostram o viewport de 1000 px de altura, que inclui todo o banner.

## 17. Testes executados

`pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `CAPTURE_SPEC002=1 pnpm test:e2e:browser`, `pnpm test:e2e`, `git diff --check` e `git status`.

Os testes de componente conferem o asset importado, imagem decorativa, dimensões, texto da escola, progresso/contagens/passos dos três estados e ausência de links/botões fictícios. O E2E de browser confere carregamento da imagem oficial, proporção, limites do card, separação entre texto e imagem, ausência de overflow, sequência exata de chamadas (`/session`, `/admin/overview`) e logout visível em 1440/1024/768/390/320 px. Os E2Es reais existentes verificam autenticação, sessão, navegação e dados BFF/Core/PostgreSQL.

## 18. Resultados

Install frozen, lint, typecheck e build: aprovados. Vitest: 76/76. E2E browser com capturas: 7/7. E2E completo: 17/17, sendo 10 testes na cadeia real. `git diff --check`: exit 0. O primeiro `pnpm test` no sandbox falhou com `listen EPERM: 127.0.0.1`; repetido com permissão de loopback, passou. Sem falha funcional restante.

## 19. Arquivos criados

Este relatório e sete PNGs em `docs/implementation/evidence/`.

## 20. Arquivos alterados

`src/admin/overview/AdminHome.tsx`, `src/admin/overview/overview.module.css`, `tests/app.test.tsx` e `tests/e2e/browser.e2e.ts`. O asset oficial já existia e não foi alterado.

## 21. Divergências justificadas

O banner não usa o texto pessoal nem as ações do wireframe, pois esses dados não existem no contrato atual. Sua altura final é maior para manter o PNG completo e proporcional. Nenhuma outra área da Home foi redesenhada. Como o repositório continua sem arquivos rastreados, `git diff --check` não consegue avaliar os arquivos não rastreados; lint, typecheck, testes, build e inspeção visual fornecem a validação principal.

## 22. Riscos e próximos passos

O PNG acrescenta 721 KiB ao carregamento da Home. Medir LCP em ambiente de implantação pode orientar uma variante otimizada futura, preservando o original e conferindo a fidelidade visual. A validação visual foi feita no Chromium em cinco larguras; não representa certificação de acessibilidade nem teste visual em todos os browsers. Não houve commit, push ou alterações em BFF/Core.
