# SPEC-002 — Admin Home Welcome Illustration

**Projeto:** `frepp-school-web`  
**Tipo:** Evolução visual / UI  
**Dependência:** Web SPEC-001 — Foundation, Authentication & Admin Shell  
**Referência visual:** `ADM-01-admin-home-empty.png`

## 1. Objetivo

Incorporar a ilustração oficial do mascote Frepp School ao card de boas-vindas da Admin Home.

A implementação deve seguir a composição visual estabelecida no wireframe `ADM-01`, respeitando a identidade visual do Frepp School e a estrutura React existente.

**Esta SPEC não altera nenhuma regra de negócio, autenticação, autorização ou contrato HTTP.**

## 2. Asset oficial

O arquivo deve estar disponível em:

`src/assets/illustrations/admin-home-welcome.png`

A imagem contém:

- Mascote original Frepp, com óculos redondos, olhos sorridentes e cabelos brancos nas laterais.
- Livro aberto em azul e verde.
- Três traços amarelos de destaque.
- Traço decorativo azul tracejado.
- Pilha de livros.
- Planta decorativa.

A ilustração deve preservar fielmente a identidade visual aprovada.

Não redesenhar, regenerar, recortar partes do mascote ou substituir o asset por outra ilustração.

## 3. Referência visual

Utilizar:

`docs/design/references/ADM-01-admin-home-empty.png`

O card de boas-vindas desse wireframe é a principal referência de layout.

A imagem deve aparecer na região direita do card, com o conteúdo textual à esquerda.

O wireframe estabelece a intenção visual, mas a implementação deve se adaptar às dimensões reais do componente e às diferentes resoluções.

## 4. Auditoria obrigatória

Antes de modificar qualquer arquivo, analisar:

- A implementação atual da Admin Home.
- O componente responsável pelo card de boas-vindas.
- Os CSS Modules existentes.
- Os design tokens da SPEC-001.
- O asset `admin-home-welcome.png`.
- O wireframe `ADM-01`.
- Os testes e estados atuais da Home.

Reutilizar a estrutura existente sempre que possível.

Não criar um novo componente complexo se a alteração puder ser realizada com uma adaptação pequena.

## 5. Layout desktop

O card de boas-vindas deve possuir duas regiões visuais.

**Região esquerda:**

- Título de boas-vindas.
- Mensagem contextual.
- Informações já disponíveis na implementação atual.

**Região direita:**

- Ilustração do mascote.
- Posicionamento proporcional ao card.
- Alinhamento preferencial à direita e à base.

A ilustração não deve competir visualmente com os textos.

Não utilizar a imagem como background que cause cortes arbitrários em áreas importantes do personagem.

## 6. Fundo do card

Preservar ou adaptar o fundo azul-claro existente.

É permitido utilizar:

- Gradiente suave.
- Formas decorativas discretas em CSS.
- Sombras leves.

Não adicionar uma imagem completa do wireframe como fundo.

O card deve continuar sendo construído com HTML e CSS reais.

## 7. Responsividade

**Desktop:** ilustração à direita, texto à esquerda.

**Tablet:** reduzir proporcionalmente a ilustração, garantindo espaço adequado ao texto.

**Mobile:** permitir empilhamento ou redução da arte, conforme a composição mais equilibrada.

Não permitir:

- Scroll horizontal.
- Sobreposição de texto.
- Corte do rosto, cabelos laterais, óculos ou livro.
- Distorção de proporção.

A imagem deve manter `height: auto` e proporção original, ou comportamento equivalente.

## 8. Estados da Admin Home

A ilustração deve ser reutilizável nos estados:

- Escola sem configuração.
- Escola parcialmente configurada.
- Escola configurada.

O texto do card pode variar conforme o estado retornado pelo BFF.

A imagem não pode determinar qual estado deve ser exibido.

**O estado da Home continua vindo exclusivamente do contrato existente do BFF.**

## 9. Acessibilidade

A ilustração é decorativa e não contém informação funcional necessária.

Utilizar `alt=""` e tratamento apropriado para imagem decorativa.

Não adicionar conteúdo redundante para leitores de tela.

Respeitar preferências de movimento reduzido caso sejam adicionadas transições CSS discretas.

Não implementar animações do mascote nesta SPEC.

## 10. Performance

Utilizar o asset local do projeto.

Evitar:

- Base64 embutido em JSX.
- Dependências de imagem externas.
- Download por CDN não controlada.
- Importação de imagem completa do wireframe.

Verificar dimensões e peso do PNG.

Se necessário, gerar uma versão otimizada, preservando o original e a qualidade visual.

Não introduzir nova dependência somente para otimização.

Evitar layout shift ao carregar a imagem, definindo dimensões ou espaço de layout apropriado.

## 11. Organização

Preferência:

```text
src/
├── admin/
│   └── overview/
│       ├── AdminHome.tsx
│       └── AdminHome.module.css
└── assets/
    └── illustrations/
        └── admin-home-welcome.png
```

Os nomes reais dos componentes devem ser confirmados durante a auditoria.

Não reorganizar arquivos desnecessariamente.

## 12. Preservação funcional

Não modificar:

- `GET /admin/overview`.
- API client.
- Session Provider.
- Login.
- School Selection.
- Logout.
- Route guards.
- Permission handling.
- Cálculo de progresso.
- Setup steps.
- Alerts.
- Quick actions.
- Counts.

Não adicionar dados fictícios para reproduzir o wireframe.

## 13. Testes

Validar pelo menos:

1. A Home renderiza a ilustração.
2. O card mantém os textos reais.
3. Estado vazio continua correto.
4. Estado parcial continua correto.
5. Estado configurado continua correto.
6. A imagem não interfere na navegação.
7. Não há overflow horizontal em desktop, tablet e mobile.
8. A ilustração não sobrepõe conteúdo.
9. A renderização preserva acessibilidade básica.

Executar os testes já existentes da Web SPEC-001, incluindo integração e E2E, quando disponíveis.

## 14. Validação visual

Testar pelo menos as larguras:

- 1440 px.
- 1024 px.
- 768 px.
- 390 px.
- 320 px.

Capturar screenshots reais do browser e comparar com o wireframe `ADM-01`.

Inspecionar especialmente:

- Fidelidade do mascote.
- Tamanho da ilustração.
- Alinhamento.
- Espaçamento.
- Proporção entre texto e imagem.
- Comportamento responsivo.

## 15. Validação técnica

Executar:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
git diff --check
git status
```

Executar somente comandos existentes e registrar eventuais impedimentos operacionais.

Não modificar BFF ou Core.

## 16. Relatório de implementação

Criar:

`docs/implementation/SPEC-002-report.md`

O relatório deve conter:

1. Resumo.
2. Auditoria inicial.
3. Asset utilizado.
4. Componentes alterados.
5. Posicionamento desktop.
6. Responsividade.
7. Acessibilidade.
8. Performance.
9. Comparação com ADM-01.
10. Testes realizados.
11. Screenshots e evidências visuais.
12. Arquivos criados.
13. Arquivos alterados.
14. Divergências.
15. Riscos.
16. Resultados finais.

## 17. Fora de escopo

Não implementar:

- Animações.
- Novas versões do mascote.
- Nova Home.
- Redesign geral do dashboard.
- Novos cards.
- Novas rotas.
- CRUDs.
- Alterações no BFF.
- Alterações no Core.
- Mudanças no design system global sem necessidade.

## 18. Git

Não fazer commit.

Não fazer push.

## 19. Critérios de aceite

A SPEC será considerada concluída quando:

- A ilustração oficial estiver integrada à Admin Home.
- O personagem mantiver sua identidade original, incluindo cabelos brancos laterais.
- O card estiver visualmente próximo do `ADM-01`.
- Os textos continuarem legíveis.
- Os estados vazio, parcial e configurado funcionarem.
- O layout funcionar em desktop, tablet e mobile.
- Não houver overflow horizontal nem distorção da ilustração.
- Nenhum contrato BFF/Core for alterado.
- Lint, typecheck, build e testes passarem.
- O relatório estiver documentado.
- Nenhum commit ou push tiver sido realizado.

---

**Princípio final:** a ilustração deve enriquecer visualmente a experiência, sem introduzir qualquer mudança no comportamento funcional da Admin Home.