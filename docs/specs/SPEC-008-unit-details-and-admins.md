# SPEC-008 — Detalhes da unidade e administradores

Na lista do SCHOOL_ADMIN, o nome da unidade abre `/admin/units/:unitId`. O link mantém o texto normal e, no hover/foco, fica azul com leve ampliação e três traços amarelos progressivos. A mesma mudança de cor dos traços vale para os links da configuração da visão geral.

A página consulta `GET /admin/units/:unitId` e `GET /admin/units/:unitId/unit-admins`, apresenta os dados cadastrados e todos os UNIT_ADMINs vinculados, com nome, email e situação. Quando não há administrador, mostra um estado vazio. Os botões de convite e associação reutilizam os fluxos da lista, com retorno à unidade e nova leitura dos vínculos após a ação. A rota exige experiência SCHOOL_ADMIN; erros não são apresentados como ausência de administradores.
