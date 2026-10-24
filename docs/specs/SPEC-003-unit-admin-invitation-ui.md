# SPEC-003 — Unidade e convite de UNIT_ADMIN no School Web

Nota de evolução: a SPEC-004 substituiu a página de composição de equipes por um fluxo próprio em `/admin/units`. O menu de equipes continua oculto. O convite agora é oferecido depois de confirmar o cadastro da unidade; consulte `SPEC-004-units-flow-wireframe.md` para os estados e os limites atuais.

A página de composição de equipes está implementada, mas seu item de navegação permanece oculto por enquanto. Nela, o `SCHOOL_ADMIN` pode cadastrar uma unidade informando nome, cidade e UF; o país é BR. No mesmo formulário pode informar nome e email de um `UNIT_ADMIN` para aquela unidade. Essa associação é opcional: também pode selecionar uma ou mais unidades ativas e convidar um novo administrador depois. A tela distingue convite enviado de entrega pendente e impede envio sem unidade selecionada.

O cadastro da unidade e o convite são operações sequenciais. Se o convite falhar, a unidade permanece cadastrada e o formulário de convite posterior é preenchido com o administrador e a unidade recém-criada para permitir nova tentativa. A mensagem informa explicitamente o resultado parcial.

O School Web usa somente o BFF, não aceita seletor de escola e não expõe dados do convite. O `UNIT_ADMIN` autenticado entra em uma página própria que lista somente as unidades atribuídas e ativas. A gestão local de turmas, alunos, responsáveis, matrículas e atribuições docentes virá após as rotas de autorização por unidade no Core.
