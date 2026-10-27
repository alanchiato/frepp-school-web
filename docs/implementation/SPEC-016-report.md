# SPEC-016 — Relatório de implementação: avatares de pessoas no School Web

## Auditoria e decisão

Em 26/10/2026, o perfil do responsável tinha um avatar local com iniciais; alunos e professores não tinham o mesmo espaço nos perfis. As tabelas de alunos, professores e responsáveis não tinham miniaturas; a tabela de professores da turma usava um ícone diferente. Os contratos consultados não expõem fotos autorizadas. A mudança foi restrita ao School Web, preservando os dados e as alterações preexistentes.

## Implementação

Criados `src/shared/components/PersonAvatar.tsx` e `person-avatar.module.css`. O componente mostra iniciais derivadas do nome com dois tamanhos: avatar de perfil (64 px) e miniatura (34 px; 30 px em telas estreitas). A miniatura usa a mesma moldura de cantos arredondados do avatar maior, ajustada ao seu tamanho. As iniciais são decorativas para leitores de tela e não alteram os nomes acessíveis dos links. O mesmo componente aparece nos perfis de aluno, professor e responsável; nos diretórios dessas pessoas; nos vínculos aluno ↔ responsável; nas listas de alunos, professores e docentes do espaço da turma; e nas referências aos administradores associados ou disponíveis em Unidades. Nomes de turmas, disciplinas e unidades continuam sem avatar.

Nenhuma API, migration ou operação de foto foi criada. O espaço visual está preparado para receber uma foto quando houver contrato e autorização para isso. Hoje todos os avatares usam iniciais, inclusive onde a interface antes mostrava um ícone genérico.

## Qualidade e evidências

`pnpm typecheck`, `pnpm test` (126 testes), `pnpm build` e `E2E_MODE=browser pnpm exec playwright test --project=browser` (13 cenários) passaram. O navegador verificou perfis e tabelas em desktop, tablet e mobile, mantendo a ausência de overflow horizontal. Capturas do refinamento: `docs/implementation/evidence/SPEC-016-student-profile-390x844.png`, `SPEC-016-teacher-profile-390x844.png`, `SPEC-016-class-students-390x844.png` e `SPEC-016-class-teachers-390x844.png`. As capturas existentes da SPEC-015 de Responsáveis foram atualizadas com as miniaturas.

## Arquivos e Git

Além do componente compartilhado e da SPEC/relatório, foram modificados `src/admin/{students/StudentsPage.tsx,teachers/TeachersPage.tsx,guardians/GuardiansPage.tsx,guardians/guardians.module.css,academicstructure/ClassWorkspacePage.tsx,academicstructure/class-workspace.module.css,units/UnitsPage.tsx,units/units.module.css}` e os testes de componentes/navegador correspondentes. Alterações anteriores dos módulos acadêmicos e de responsáveis foram preservadas e incluídas na entrega conjunta de 27/10/2026.

## Limitação e próxima etapa

Fotografias reais exigem persistência, mediação de acesso e URLs autorizadas no Core/BFF. Essa decisão de domínio deve anteceder upload e exibição de imagens pessoais. Até lá, a interface mantém um fallback visual consistente sem simular fotos.

## Refinamento do resumo do aluno

Os campos de nascimento e documento foram alinhados à coluna do nome, ao lado do avatar, para evitar que comecem diretamente sob a foto. O espaçamento se adapta a telas estreitas e mantém a edição existente.

A situação do aluno no mesmo resumo passou a usar o selo de status já presente nas tabelas, com verde para cadastro ativo e a apresentação neutra existente para inativo.

O selo foi então colocado imediatamente após o nome completo. Em telas estreitas, o botão de edição ocupa a linha seguinte para reservar largura ao nome e ao selo.
