# SPEC-005 — Wizard de unidade e escolha do administrador

Status: implementada no School Web.

## Cadastro

O wizard segue três etapas: **Identificação**, **Endereço** e **Revisão**. Nome, cidade e UF são obrigatórios; país é `BR`. Código interno, documento da unidade, fuso horário, CEP, rua, número, complemento e bairro são opcionais. O usuário pode voltar sem perder os campos. A unidade só é enviada ao BFF após confirmar a revisão; o formulário preserva o alerta de resultado incerto para impedir repetição imediata.

O indicador de etapas segue o padrão visual do provisionamento no Platform Web: três círculos conectados por uma linha de progresso que cresce ao avançar e recua ao voltar, marca de confirmação nas etapas concluídas e destaque da etapa atual. O rótulo compacto aparece em telas estreitas; a etapa atual é exposta ao leitor de tela e seu título recebe foco ao mudar. As transições respeitam a preferência por movimento reduzido.

Após sucesso, o `SCHOOL_ADMIN` escolhe **Convidar novo**, **Associar existente** ou **Concluir sem administrador**. A associação lista somente `UNIT_ADMIN`s elegíveis da escola e pede seleção explícita. Confirmação da associação não envia convite. Ambas as ações estão disponíveis depois na lista de unidades. Falhas no convite ou na associação não desfazem o cadastro da unidade.

Na lista, cidade e UF são mostradas quando fornecidas pelo contrato. O `UNIT_ADMIN` continua limitado à página de suas unidades atribuídas.

## Visão geral

O link Unidades e as ações rápidas mantêm a cor do texto e não têm sublinhado. Ao passar o mouse ou usar o teclado, a cor muda para azul, o texto cresce discretamente e três traços aparecem em sequência. A animação é desativada para quem prefere movimento reduzido.
