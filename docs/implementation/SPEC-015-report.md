# SPEC-015 — Relatório de implementação: responsáveis e vínculos no School Web

## Resumo e auditoria inicial

Em 26/10/2026, o menu Responsáveis existia sem página funcional. O perfil do aluno já listava vínculos e possuía wizard de cadastro/vínculo e convite da SPEC-014 não commitada. Havia ajustes preexistentes em páginas de alunos/professores e testes; foram preservados. A escala compacta aprovada e os tokens visuais existentes foram mantidos.

## Entrega e contratos

Criada a listagem `/admin/guardians` com busca/paginação no servidor, três indicadores reais, situação cadastral e ação de cadastro. Criado `/admin/guardians/:guardianId` com alunos vinculados como seção principal, Cadastro e Acesso ao aplicativo. O perfil do aluno agora liga ao responsável, edita relação/responsabilidades e encerra/reativa vínculos pelo PATCH existente. A navegação de retorno usa parâmetros de URL sem afetar autorização. SCHOOL_ADMIN cadastra sem vínculo, conta ou convite; UNIT_ADMIN cria com vínculo local atômico. Convite/reenvio são ações explícitas que usam os contratos existentes. Acesso digital e cadastro possuem apresentações separadas.

No refinamento de 26/10/2026, o nome social foi incluído na primeira etapa do wizard de vínculo do perfil do aluno e na criação de responsáveis durante o cadastro do aluno. O menu Responsáveis passou do formulário único ao mesmo modelo de wizard em quatro etapas. SCHOOL_ADMIN pode deixar o vínculo para depois; UNIT_ADMIN precisa selecionar aluno da unidade. A revisão oferece convite opcional. Após sucesso parcial, o fluxo preserva o ID criado para evitar novo cadastro na tentativa seguinte. O botão de busca recebeu largura e altura compactas, alinhadas ao campo.

## Permissões, privacidade e decisões

O School Web mostra somente os dados agregados autorizados pelo Core; nunca compõe filhos de outras unidades a partir de listas globais. A unidade ativa vem do contexto selecionado. Conta inativa é apresentada sem botão de reativação, pois não existe contrato. Sem fotos reais, usa avatar de iniciais; sem comunicação fictícia. Nenhum token ou senha é armazenado no navegador.

## Arquivos

Criados `src/admin/guardians/GuardiansPage.tsx`, `src/admin/guardians/guardians.module.css`, `src/admin/students/GuardianLinkActions.tsx`, `tests/guardians.test.tsx`, esta SPEC e este relatório. Modificados `src/app/App.tsx`, `src/app/AppShell.tsx`, `src/admin/students/StudentsPage.tsx`, `src/shared/api/{client,contracts,validation}.ts` e os testes E2E de browser e integração. Quinze screenshots reais foram criados em `docs/implementation/evidence/SPEC-015-guardians-{list,profile,wizard}-*.png`.

## Testes e evidência visual

`pnpm typecheck`, `pnpm test` e `pnpm build` passaram na entrega inicial: 124 testes Web. No refinamento, 125 testes Web passaram e a conferência em navegador real cobriu novamente 1440×900, 1280×800, 768×1024, 390×844 e 360×800, zoom 100%, sem overflow horizontal. Há screenshots de lista, perfil e revisão do wizard em `docs/implementation/evidence/SPEC-015-guardians-{list,profile,wizard}-*.png`. O teste visual também verificou as dimensões do botão Buscar. A suíte E2E Web → BFF → Core → PostgreSQL havia passado com 11 cenários; o cenário novo cobriu lista, perfil, navegação responsável → aluno → responsável, estado sem conta e cadastro sem convite. A interface utiliza componentes, cores, espaçamentos e animação de links já existentes.

## Divergências, limitações, riscos e próximas etapas

As contagens refletem o filtro aplicado; uma pessoa sem vínculo não aparece no diretório local até ser associada a aluno da unidade. O `UNIT_ADMIN` também não consegue selecionar um responsável existente conhecido apenas por outra unidade; o `SCHOOL_ADMIN` pode fazer essa associação, e uma futura busca entre unidades exigirá verificação de identidade para não expor dados. Busca de alunos para criar vínculo usa a lista autorizada existente; em escolas muito grandes será necessário um seletor paginado dedicado. Fotos dependem de infraestrutura de mídia; retirada de alunos e permissões pedagógicas por relacionamento exigem definição de domínio. A entrega do email não é inferida da existência do convite. Revisar comportamento com usuários reais após disponibilização no ambiente de homologação.

## Publicação

Alterações preexistentes da SPEC-014 e dos ajustes de alunos/professores foram preservadas e incluídas na entrega conjunta de 27/10/2026, juntamente com screenshots, SPEC e relatório. Dependências: SPEC-034 do Core e SPEC-016 do BFF.
