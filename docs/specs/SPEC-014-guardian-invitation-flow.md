# SPEC-014 — Convite de responsável no perfil do aluno

## Fluxo

O wizard “Adicionar responsável” mantém quatro etapas: Responsável, Contatos, Vínculo com o aluno e Revisão. Na Revisão, o SCHOOL_ADMIN com `guardian_onboarding.create` e o UNIT_ADMIN no contexto de uma unidade selecionada podem marcar “Enviar convite de acesso ao Frepp” e informar explicitamente o email de login. O email de contato cadastrado não é assumido como login. A opção é facultativa; vincular o responsável sem convite continua permitido.

Ao concluir, o frontend primeiro cria ou seleciona o responsável e confirma o vínculo com o aluno. Depois chama `POST /admin/guardian-onboarding` para SCHOOL_ADMIN ou `POST /unit/:unitId/guardian-onboarding` para UNIT_ADMIN com `guardianId` e o email informado. Mensagens distintas refletem `invitation_sent`, `invitation_pending` e `not_required`.

## Falha parcial

Se o vínculo for confirmado e o convite falhar de modo funcional, a revisão permanece aberta para corrigir o email e repetir apenas o convite. O cadastro e o vínculo não são duplicados. Se o resultado do convite for incerto, a interface impede repetição automática e orienta consultar o perfil. O Core valida a atribuição local do UNIT_ADMIN e o vínculo ativo do responsável com um aluno matriculado na unidade selecionada.

## Verificação

Testes cobrem permissão, email de acesso independente do contato, falha e nova tentativa sem duplicar cadastro/vínculo, além da apresentação responsiva do wizard.
