# SPEC-015 — Responsáveis e vínculos familiares no School Web

## Dependências e auditoria

Depende da SPEC-034 do Core e da SPEC-016 do BFF; reutiliza o wizard de vínculo e convite da SPEC-014. O menu Responsáveis existe, mas ainda não oferece uma página funcional. O perfil do aluno já lista vínculos e permite criar/vincular, mas não navega ao perfil do responsável nem edita/encerra relações.

## Navegação e telas

Criar `/admin/guardians` com busca paginada no servidor, indicadores reais, linhas com nome, cadastro, resumo de alunos autorizados e situação cadastral, além de ação de novo cadastro. Criar `/admin/guardians/:guardianId` com cabeçalho e seções Alunos vinculados (principal), Cadastro e Acesso ao aplicativo. Mostrar somente alunos fornecidos pelo Core, com links ao perfil do aluno. Na tela do aluno, o nome do responsável leva ao perfil e cada vínculo permite editar relação/responsabilidades ou encerrar via PATCH. Voltas preservam contexto de origem por parâmetros de navegação seguros.

O cadastro institucional é independente de conta/convite. SCHOOL_ADMIN pode cadastrar a pessoa sem vínculo; UNIT_ADMIN cria pessoa junto com vínculo local, usando o contrato atômico existente. Convite é ação explícita, reutilizando o onboarding global/local. Estado digital distingue identidade e convite; não é situação cadastral. Sem aba de comunicação, foto inventada ou redução global de escala.

## Refinamento dos cadastros (26/10/2026)

O wizard de vínculo no perfil do aluno deve receber **nome social opcional** na primeira etapa, mostrar esse dado na revisão e enviá-lo nos contratos global e local. O cadastro iniciado pelo menu Responsáveis deve usar o mesmo `WizardStepper` e quatro etapas: Responsável (nome, nome social, documento), Contatos, Vínculo com o aluno e Revisão. Para SCHOOL_ADMIN, o vínculo pode ser deixado para depois; para UNIT_ADMIN, o aluno da unidade e a relação são obrigatórios. Na revisão, o convite é opcional e explícito. Se o cadastro institucional for salvo e uma operação posterior falhar, permitir nova tentativa sem criar outra pessoa. A busca na lista mantém campo e botão alinhados, com botão compacto em desktop e mobile.

## Estados e qualidade

Exibir loading, vazio, erro, falta de permissão, 404 e sucesso. Usar componentes e tokens existentes. Garantir foco, labels e layout sem overflow em 1440×900, 1280×800, 768×1024, 390×844 e 360×800 com zoom 100%. Testar navegação nos dois sentidos, mudança/encerramento de vínculo, cadastro sem convite, busca/paginação, convite e proteção de escopo. Capturar screenshots reais sem dados pessoais.
