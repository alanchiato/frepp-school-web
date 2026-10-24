# SPEC-007 — Experiência do UNIT_ADMIN por unidade

## Fluxo

Após a sessão School, `GET /unit/units` fornece as unidades ativas atribuídas ao usuário. Com uma unidade, ela é selecionada automaticamente; com mais de uma, o primeiro item da lista é o padrão e o card “Unidade” permite escolher outra. A escolha fica na sessão do navegador, vinculada ao ID da escola e do usuário, e é validada contra a lista atual a cada restauração. Revogação ou inativação remove a unidade da lista e exige nova seleção disponível. Sem unidade, mostra estado vazio.

A Visão geral usa `GET /unit-overview/{unitId}` e apresenta nome da unidade, ano vigente e quatro totais locais. Ao trocar a unidade, dados anteriores deixam de aparecer e a consulta é repetida para o novo ID. O servidor revalida o grant e a atribuição; o seletor não é uma fronteira de segurança.

O menu “Unidades” lista apenas as atribuídas e permite mudar o contexto, sem botão de cadastro. “Anos letivos” usa `GET /unit/{unitId}/academic-years` e mostra a lista sem cadastro ou edição. O `SCHOOL_ADMIN` mantém seus fluxos globais. O `UNIT_ADMIN` mantém as permissões locais de gestão de turmas, alunos, responsáveis e matrículas definidas na SPEC-028 do Core; este fluxo não implementa essas telas.

## Totalizadores

As contagens do card seguem a SPEC-030 do Core: ano vigente da escola e vínculos ativos na unidade. O histórico acadêmico continua associado à unidade original.
