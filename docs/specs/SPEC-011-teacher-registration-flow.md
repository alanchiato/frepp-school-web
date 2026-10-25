# SPEC-011 — Professores: cadastro, vínculos e convite

## Fluxo

O menu “Professores” mostra a lista da escola. SCHOOL_ADMIN abre um wizard com quatro passos: Dados do professor, Vínculos acadêmicos, Acesso ao Frepp e Revisão. O passo de vínculos fica no meio e oferece a ação explícita **Deixar para depois**, que avança sem atribuições. O acesso também é opcional. A revisão identifica as escolhas antes de gravar.

O wizard usa o mesmo componente evolutivo do cadastro de Unidades: trilho preenchido, indicação da etapa atual e marca nas etapas concluídas. Seus campos mantêm largura, altura, borda e espaçamento consistentes; em telas estreitas passam para uma coluna.

Os campos persistidos pelo Core hoje são nome e email de contato do professor. O modelo do wireframe inclui CPF, nascimento, código interno, contratação e formação, ainda ausentes no contrato; esses campos não aparecem como dados falsamente persistidos. Uma atribuição relaciona professor, turma, tipo, data de início e, para professor de disciplina, uma disciplina previamente cadastrada. O convite utiliza um email de login explícito, que pode diferir do contato.

A gravação usa operações Core separadas: criar professor, criar vínculos escolhidos, realizar onboarding se solicitado. Em falha parcial, o perfil criado permanece e o usuário pode acessar seu detalhe para completar vínculo ou convite. Resultado incerto não é repetido automaticamente. A página de detalhe permite editar nome/email, adicionar vínculo e convidar depois.

UNIT_ADMIN consulta o catálogo de professores da escola, vê somente vínculos e turmas da unidade selecionada e pode criar vínculos locais para essa unidade. O cadastro e a edição do perfil global e o convite ficam disponíveis apenas ao SCHOOL_ADMIN.

No perfil, os vínculos são apresentados em tabela com série, turma, disciplina/função, unidade, vigência e situação. Cada vínculo pode ter início e fim editados por SCHOOL_ADMIN; UNIT_ADMIN usa a rota local da unidade selecionada. A data final é exclusiva (primeiro dia sem vínculo); deixá-la vazia mantém o vínculo aberto. Editar as datas preserva a situação gravada e não altera a conta de acesso do professor.
