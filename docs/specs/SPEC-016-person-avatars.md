# SPEC-016 — Identificação visual de pessoas no School Web

## Contexto e escopo

Os perfis e tabelas do School Web apresentam alunos, professores, responsáveis e administradores de unidade com tratamentos visuais diferentes. O perfil do responsável já reserva uma área de avatar, usando iniciais. Os contratos atuais dessas pessoas não oferecem URL de foto autorizada; esta SPEC não cria upload, armazenamento nem uma imagem fictícia.

## Experiência

Criar um componente compartilhado de identificação de pessoa. Em perfis individuais de aluno, professor e responsável, exibir avatar maior ao lado do nome e do resumo. Em tabelas e listas que mostram nomes de pessoas, exibir uma miniatura com a mesma moldura arredondada do avatar maior antes do nome: diretórios de alunos, professores e responsáveis; responsáveis no perfil do aluno; alunos no perfil do responsável; alunos e professores no espaço da turma; docentes citados por disciplina; administradores associados ou disponíveis nas unidades. O fallback usa iniciais derivadas do nome exibido. Preservar os links e a animação existente, assim como os rótulos acessíveis das pessoas.

## Contratos e autorização

Nenhum contrato HTTP ou persistência muda. O componente não pressupõe a existência de foto e não acessa URLs externas. Se o domínio futuramente passar a expor foto autorizada, a mesma área pode receber a imagem após definição dos contratos e das permissões. Não confundir avatar com identidade verificada.

## Critérios de aceite

- Perfil de aluno, professor e responsável com avatar consistente.
- Toda lista/tabela de nomes de pessoas nos fluxos citados com miniatura de cantos arredondados, no mesmo padrão do avatar maior, antes do nome.
- Nenhum avatar em nomes de unidades, turmas, séries ou disciplinas.
- Iniciais decorativas ocultas de leitores de tela; links mantêm nomes acessíveis.
- Responsividade em desktop, tablet e mobile, sem sobreposição ou overflow horizontal.
- Testes de componentes, build e conferência no navegador.

No resumo individual do aluno, os dados de nascimento e documento se alinham à coluna do nome, ao lado do avatar, inclusive quando os campos se distribuem em mais de uma linha no mobile.
