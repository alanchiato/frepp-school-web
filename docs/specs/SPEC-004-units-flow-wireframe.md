# SPEC-004 — Wireframe inicial do fluxo de unidades

Status: fluxo implementado no School Web. Este wireframe permanece como referência de produto para a navegação, os estados e os limites da primeira entrega.

## Objetivo e entrada

`SCHOOL_ADMIN` começa pela etapa **Unidades** da Visão geral. Essa etapa e a ação rápida `create_unit`, quando presente, devem levar à página `/admin/units`. A navegação principal pode mostrar **Unidades** para tornar a página acessível depois que a etapa estiver concluída. O item **Composição de equipes** continua oculto.

O cadastro da escola sem unidade continua válido. `UNIT_ADMIN` não cadastra nem altera unidades; sua página **Minhas unidades** continua mostrando apenas as atribuições ativas. O administrador Frepp continua usando o Platform Web para seus próprios convites.

## Sequência proposta

```text
Visão geral → Unidades (lista ou estado vazio)
                      ↓ Cadastrar unidade
                Nome · Cidade · UF
                      ↓ Salvar unidade
                 Unidade cadastrada
                 ↙              ↘
     Concluir sem convite      Convidar administrador
                                  ↓
                     Nome · Email · Unidade(s)
                                  ↓
                     Convite enviado ou pendente
```

O convite é uma segunda ação, opcional, dentro do mesmo fluxo. Assim, uma falha no convite nunca sugere que o cadastro da unidade falhou nem dispara outro cadastro. Na lista, **Convidar administrador** reabre a ação depois; a unidade escolhida vem pré-selecionada, e outras unidades ativas podem ser selecionadas.

## Telas e conteúdo

### Lista e estado vazio — `/admin/units`

- Título **Unidades**, descrição curta e botão **Cadastrar unidade**.
- Sem unidades: mensagem **Nenhuma unidade cadastrada** e botão **Cadastrar primeira unidade**.
- Com unidades: mostrar os nomes devolvidos pelo BFF; ação **Convidar administrador** em cada item. Não exibir cidade, UF, status detalhado ou nomes de administradores nesta primeira entrega, pois o contrato atual não fornece esses dados na listagem.
- A ação da Visão geral deve chegar a este mesmo destino. Ao voltar após criar, atualizar a lista e a contagem da Visão geral.

### Cadastro

- Campos obrigatórios: **Nome da unidade**, **Cidade**, **Estado (UF)**; `countryCode` enviado como `BR`.
- A confirmação de `POST /admin/units` abre um estado de sucesso com o nome da unidade e duas ações: **Convidar administrador** e **Concluir sem convite**.
- Em erro de cadastro, manter os campos e permitir tentar novamente; não mostrar sucesso.

### Convite opcional

- Campos obrigatórios: **Nome completo**, **Email** e ao menos uma **Unidade atribuída**. No convite após cadastro, a unidade recém-criada vem pré-selecionada.
- Usar `POST /admin/unit-admins`. Diferenciar **Convite enviado** de **Convite pendente de envio**, conforme a resposta.
- Se o convite retornar erro, informar explicitamente que **a unidade foi cadastrada**, mas o resultado do convite pode ser incerto. Não repetir automaticamente o `POST`: uma falha de rede pode ocorrer após o Core ter criado o usuário. Oferecer **Convidar depois** sem sugerir que um segundo envio com o mesmo email seja garantido.
- O fluxo de convite posterior funciona a partir da lista sem recriar a unidade.

## Estados e limites

Mostrar carregamento, lista vazia, erro ao carregar, envio em andamento, sucesso de cadastro, sucesso ou pendência do convite e erro parcial. Bloquear envio duplicado enquanto cada requisição está em andamento. Em `401`, seguir o comportamento atual da sessão; em `403`, explicar falta de permissão.

Nesta SPEC, não incluir edição, inativação ou exclusão de unidade, nem lista/gestão de administradores existentes. O BFF atual expõe lista e criação de unidades ativas e criação de convite; essas outras ações exigem contrato próprio.

O convite atual cria um **novo** `UNIT_ADMIN`. Não há endpoint para atribuir uma nova unidade a um administrador já cadastrado, consultar o estado de um convite ou reenviá-lo. Se qualquer uma dessas ações entrar no desenho final, abrir uma etapa de Core/BFF antes de implementá-la no School Web. A lista atual do BFF devolve apenas `id` e `name` de unidades ativas; cidade/UF exibidas na confirmação podem vir dos campos recém-preenchidos, mas não podem ser reconstruídas pela listagem após recarregar.

## Referências atuais

- `src/admin/overview/AdminHome.tsx` e `src/admin/overview/presentation.ts`: etapa Unidades em primeiro lugar.
- `src/admin/units/UnitsPage.tsx`: lista, cadastro, confirmação e convite opcional implementados. A antiga rota de equipes redireciona para `/admin/units` e não aparece na navegação.
- `src/shared/api/client.ts`: chamadas atuais de lista, cadastro de unidade e convite.
- `frepp-school-bff/src/unitadmins/routes.ts`: contrato atual de `/admin/units` e `/admin/unit-admins`.

## Critérios de aceite

1. `SCHOOL_ADMIN` chega à gestão de unidades pela Visão geral e pode voltar a ela depois.
2. Uma escola sem unidades pode cadastrar a primeira sem informar `UNIT_ADMIN`.
3. Após salvar, pode convidar um administrador imediatamente ou concluir; depois pode iniciar convite pela lista.
4. Falha no convite preserva a unidade criada e nunca envia novamente o cadastro da unidade.
5. O menu **Composição de equipes** não reaparece, e `UNIT_ADMIN` não recebe os controles de cadastro.
