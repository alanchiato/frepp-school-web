# SPEC-013 — Espaço da Turma no School Web

## Fluxo

O nome da turma na aba Turmas abre `/admin/classes/:classId`. A página aceita acesso direto, volta à listagem, apresenta cabeçalho, contagens e seções Alunos, Professores, Disciplinas e Informações. Os perfis de alunos e professores usam rotas já existentes. UNIT_ADMIN usa rota local do BFF com unidade autorizada; a URL de origem pode trazer `?unit=` para preservar a seleção. Sem parâmetro, as unidades atribuídas são tentadas de forma controlada até encontrar a turma, sem consulta global.

## Estados

Carregamento, 401, 403, 404, erro temporário, retry e listas vazias possuem tratamento explícito. O texto não presume status ou código inexistente. As disciplinas exibidas derivam somente de atribuições docentes vigentes que o Core devolveu.

## Identidade e evolução

A página reutiliza cards, links, escala e animação Frepp, com adaptação até 360 px e respeito a movimento reduzido. A perspectiva TEACHER, registros pedagógicos, áudios e IA ficam para jornadas e contratos posteriores.
