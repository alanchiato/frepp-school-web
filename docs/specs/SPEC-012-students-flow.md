# SPEC-012 — Cadastro de alunos no School Web

## Fluxo

Lista de alunos com busca, filtros de situação, unidade e série/turma, e navegação para o perfil. Os filtros de unidade e turma consideram a matrícula vigente exibida na tabela; ao trocar de unidade, a seleção de turma é limpa e suas opções ficam restritas à unidade escolhida. `UNIT_ADMIN` já está limitado à unidade selecionada e filtra apenas suas turmas. O wizard reutiliza `WizardStepper` e o padrão visual das tabelas: Dados do aluno → Informações acadêmicas → Responsáveis → Revisão. A etapa de responsáveis aceita vários vínculos, cada um com responsável existente ou novo, e pode ser deixada para depois.

Dados persistidos do aluno: nome completo, nome social, nascimento e documento genérico. Matrícula: turma e data de início; ano, série e unidade vêm da turma, preservando histórico quando há mudança. Responsável novo: nome, documento, email e telefone, além da relação e das flags legal, contato principal e financeiro no vínculo. O perfil mostra dados do aluno, histórico de matrículas por turma/unidade e responsáveis em tabelas.

O wireframe inclui gênero, CPF/RG separados, número de matrícula, turno, endereço, contato de emergência e observações. O Core ainda não persiste esses campos; o formulário não os apresenta como salvos. A data de início é uma data de domínio, sem conversão de fuso.

`SCHOOL_ADMIN` usa as operações globais; `UNIT_ADMIN` só vê a unidade selecionada e usa a criação local atômica de aluno + matrícula e de responsável + vínculo. Uma falha parcial das operações globais mantém o ID do aluno e o estágio concluído para retomada. Resultado incerto exige consultar a lista antes de repetir a ação.

## Edição do aluno

O perfil permite editar nome completo, nome social, nascimento, documento e situação. O formulário segue as dimensões do cadastro e oferece salvar ou cancelar. `SCHOOL_ADMIN` usa `PATCH /admin/students/:id`; `UNIT_ADMIN` usa `PATCH /unit/:unitId/students/:id` na unidade selecionada. O Core valida o escopo e só permite a edição local do aluno que atualmente pertence à unidade. Alterar a situação do aluno não altera matrículas nem apaga o histórico acadêmico.
