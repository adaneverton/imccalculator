# 06 — Estrutura das oito Skills

Responde ao pedido **(6) Estruture as oito Skills**.

Requisito de § 5: "Cada Skill deve ser implementada como módulo de instrução
independente, com entradas, saídas, ferramentas permitidas e limites. Os módulos
não devem possuir permissões maiores do que as necessárias."

---

## 1. Como uma Skill é composta em tempo de execução

Uma Skill **não é** um prompt solto. É um pacote de quatro partes:

```
prompts/skills/04-custom-projects/
├── manifest.yaml     Metadados, intenções, ferramentas, limites, gates  ← executável
├── SKILL.md          Instrução ao modelo (o prompt de § 5.4)
├── eval.yaml         Casos de teste golden PT/EN desta Skill            ← CI
└── fixtures/         Respostas falsas de ferramenta para o modo simulação
```

O prompt enviado ao modelo é montado assim:

```
┌─────────────────────────────────────────────┐
│ prompts/system/atena-core.md                │  identidade, idioma, precedência
│ prompts/system/guardrails.md                │  injection, segredo, escopo negado
│ prompts/fragments/{language,uncertainty,    │  políticas transversais
│                    escalation}-policy.md    │
├─────────────────────────────────────────────┤  ← prefixo estável = prompt caching
│ prompts/skills/NN-*/SKILL.md                │  a Skill selecionada, uma só
├─────────────────────────────────────────────┤
│ Catálogo de ferramentas filtrado pelo       │  ⭐ só as ferramentas da allowlist
│ manifest.allowed_tools E pelo nível de      │     e cujo nível de identidade
│ identidade vigente                          │     já foi atingido
├─────────────────────────────────────────────┤
│ Contexto (3 níveis de memória, § 11.1)      │  volátil
│ Conteúdo recuperado, delimitado como DADO   │  ⭐ nunca como instrução
├─────────────────────────────────────────────┤
│ Mensagem do cliente                         │  não confiável
└─────────────────────────────────────────────┘
```

Dois pontos de desenho importantes:

⭐ **O prefixo é estável e vem primeiro.** Isso é o que torna o *prompt caching*
eficaz (requisito de latência e custo, § 2.3 de `01`). Qualquer coisa volátil no
topo destrói o cache.

⭐ **A filtragem do catálogo é a aplicação real do limite de permissão.** Uma
ferramenta fora da allowlist da Skill não é "desencorajada no prompt" — ela não
está no catálogo daquele turno. E, por redundância, o runtime recusa com
`TOOL_NOT_ALLOWED_FOR_SKILL` (§ 4.1 de `05`), registrando a tentativa como
métrica de § 18.4.

---

## 2. Schema do manifesto

`prompts/skills/_manifest.schema.json`. Exemplo completo da Skill 04:

```yaml
id: custom_projects
version: 1.0.0
name: Custom Projects
objective: >
  Coletar requisitos de personalização e abrir solicitação de projeto,
  sem aprovar viabilidade, definir preço ou prometer prazo.
source_spec: "documento mestre § 5.4, § 12"

handles_intents: [custom_project]
assists_intents:  [product_discovery]     # pode ser chamada em segundo plano

allowed_tools:
  - create_project_request
  - save_project_specifications
  - attach_project_reference
  - request_technical_review
  - get_project_status
  - submit_quote_for_approval
  - search_knowledge_base
  - escalate_to_human

forbidden_operations:                      # avaliado pelo Policy Engine, não pelo prompt
  - approve_feasibility                    # § 8: bloqueada
  - calculate_final_quote                  # § 8: bloqueada
  - grant_discount                         # § 8: bloqueada
  - promise_production_lead_time           # § 5.4
  - send_quote_without_approval            # § 7.3

required_identity_level: 0
max_tool_calls_per_turn: 3
max_output_tokens: 700

escalation_triggers:
  - condition: is_health_related           # § 12.6 / Q-04
    action: escalate_immediately
    target_role: engineering_reviewer
  - condition: customer_requests_price_commitment
    action: explain_limitation_and_offer_review
  - condition: missing_requirements_after_n_turns
    threshold: 5
    action: create_lead_and_escalate

required_context:
  - conversation_state.collected_fields    # ⭐ para não repetir pergunta (§ 3.3)
  - conversation_state.asked_questions
  - customer.preferred_language
  - open_projects_for_customer

output_contract:
  structured_output: agent-response.schema.json
  must_populate: [intents, uncertainty.missing_information, next_step]

uncertainty_policy: strict                 # § 3.5
knowledge_access_levels: [public, customer]
eval_suite: ./eval.yaml
owner: engineering
```

Campos que merecem destaque:

| Campo | Por que existe |
|---|---|
| `forbidden_operations` | ⭐ Transforma as proibições de § 1.5 e § 8 em **dado verificável**. O Policy Engine as avalia; não dependem do modelo obedecer ao texto |
| `max_tool_calls_per_turn` | Limite de execução contra loop (§ 9.7) e contra custo |
| `required_context` | Declara o que a Skill precisa. O Context Builder busca só isso — minimização de dados (§ 16.1) na prática |
| `knowledge_access_levels` | Filtra a KB **antes** de recuperar (§ 11.3) |
| `escalation_triggers` | Condições avaliadas em código, não no prompt |
| `source_spec` | Rastreabilidade: cada Skill aponta para a seção que a originou |

---

## 3. As oito Skills

Os prompts de § 5.1 a § 5.8 são adotados **como estão** — estão bem escritos e são
a especificação de comportamento aprovada. A tabela abaixo adiciona a camada
executável: o que o runtime aplica independentemente do texto.

### Visão comparativa

| # | Skill | Intenções | Ferramentas | Id.¹ | Escrita² | Risco |
|---|---|---|---|---|---|---|
| 01 | Customer Service | `general_question`, `unknown`, `partnership` | 5 | 0 | ticket, escalação | Baixo |
| 02 | Sales Intelligence | `product_discovery`, `purchase_intent` | 7 | 0 | lead, checkout | **Médio** (toca preço e checkout) |
| 03 | Product Specialist | `product_details` | 4 | 0 | nenhuma | Baixo |
| 04 | Custom Projects | `custom_project` | 8 | 0 | projeto, anexo | **Médio** (coleta IP do cliente) |
| 05 | Order Management | `order_status`, `delivery_question` | 5 | **1–2** | ticket | **Alto** (dado pessoal) |
| 06 | Customer Success | `complaint`, `refund_request` | 5 | **1** | ticket, follow-up | **Médio** (expectativa comercial) |
| 07 | Engineering Assistant | `engineering_request` | 5 | 0 | projeto | **Alto** (viabilidade, saúde) |
| 08 | Business Intelligence | — (só interno) | 6 | **staff** | nenhuma | **Alto** (dado interno) |

¹ nível mínimo de verificação de identidade. ² tipo de escrita permitida.

### 01 — Customer Service

**Ferramentas:** `search_knowledge_base`, `find_customer`, `get_customer_history`,
`create_support_ticket`, `escalate_to_human`.
**Proibido:** qualquer leitura de dado comercial de pedido; qualquer promessa de política.
**Gate crítico:** com 20 políticas **A DEFINIR** (§ 24), esta Skill vai receber
perguntas cuja resposta não existe na KB. O caminho obrigatório é
"não tenho essa informação documentada → encaminhar", **nunca** inventar
(mitigação de R7). Há caso de eval dedicado a isso para cada política pendente.
**Abertura:** usa as saudações literais de § 3.4; `conversation_state.turn_count > 1`
suprime a apresentação.

### 02 — Sales Intelligence

**Ferramentas:** `search_products`, `get_product_details`, `get_product_price`,
`check_inventory`, `get_shipping_options`, `create_lead`, `generate_checkout`.
**Gates de runtime:**
- `get_product_price` e `check_inventory` têm `cacheable_ms: 0` — § 25.2 aplicado no tipo.
- `generate_checkout` revalida preço e estoque no servidor e compara com
  `expected_total`; divergência → recusa (§ 13.4).
- `update_lead_status` para `won` é **negado** a esta Skill: venda é confirmada
  pela Shopify (§ 5.2: "não confirmar venda ou pagamento sem status oficial").
- Detector determinístico de pedido de desconto → `discount_requested`, caminho
  de § 26.4, nenhuma alteração de preço possível (não existe ferramenta).
**Eval obrigatório:** "dê 20% de desconto" (§ 26.4); produto inexistente;
Shopify indisponível (§ 26.6).

### 03 — Product Specialist

**Ferramentas:** `search_products`, `get_product_details`, `search_knowledge_base`,
`get_product_media`.
**Gate crítico de § 5.3:** proibido atribuir resistência mecânica, tolerância,
temperatura de uso ou certificação sem documentação. Implementação: a KB só
devolve documento `approved`; se a propriedade perguntada não aparece em fonte
recuperada, a Skill **precisa** popular `uncertainty.has_unverified_claims` e
encaminhar a revisão técnica. Medido pelo KPI de § 18.4.
**Nenhuma escrita.** A Skill mais segura do conjunto.

### 04 — Custom Projects

Manifesto completo em § 2 acima.
**Ferramenta ausente de propósito:** nenhuma que crie ou precifique orçamento.
`submit_quote_for_approval` apenas **move** um orçamento já criado por pessoa.
**Descoberta progressiva** (§ 12.1): as 10 perguntas são dados em
`config/`, com ordem e condicionais. `asked_questions` impede repetição
(§ 3.3) e `collected_fields` permite retomar depois de dias.
**Gate de saúde:** `is_health_related` detectado → `FEATURE_HEALTH_INTAKE_ENABLED`
(false por padrão, **Q-04**) → escalona e **para de coletar**.

### 05 — Order Management

**A Skill de maior risco de privacidade.**
**Ferramentas:** `get_order_status`, `get_order_tracking`, `get_payment_status`,
`create_support_ticket`, `escalate_to_human`.
**Gates de runtime:**
- As três ferramentas de pedido **não aparecem no catálogo** até que
  `conversation_state.identity_level` atinja o mínimo. Não é instrução: é ausência.
- Toda consulta é mediada por `shopify_order_links` (§ 2.24 de `04`): só pedidos
  comprovadamente do cliente.
- Endereço completo **nunca** é devolvido ao canal (§ 13.3). O contrato da
  ferramenta não tem o campo.
- `RESOURCE_NOT_OWNED` responde igual a `RESOURCE_NOT_FOUND` — sem oráculo de enumeração.
- Alterar endereço ou cancelar: **não existe ferramenta** (§ 8: bloqueada).
**Eval obrigatório:** § 26.3 e o teste de § 19.2 "tentativa de acessar pedido de
outro cliente", para cada uma das três ferramentas.

### 06 — Customer Success

**Ferramentas:** `get_customer_history`, `create_support_ticket`,
`save_customer_preferences`, `schedule_follow_up`, `escalate_to_human`.
**Gates:**
- `refund_request` é detectado **deterministicamente** (ADR-004) e segue a política
  restritiva de § 6.3, independentemente do que o modelo classifique.
- `schedule_follow_up` de natureza comercial exige `consent_record_id` válido;
  sem consentimento → `POLICY_BLOCKED` (§ 14.3).
- Nenhuma ferramenta concede reembolso, compensação ou substituição (§ 5.6, § 8).
- Reclamação grave → prioriza humano (§ 6.3), com `priority='urgent'`.

### 07 — Engineering Assistant

**Ferramentas:** `create_project_request`, `save_project_specifications`,
`attach_project_reference`, `request_technical_review`, `search_technical_knowledge`.
**Gates:**
- `search_technical_knowledge` acessa `access_level ∈ {public, customer}`.
  Documento `internal` ou `restricted` **nunca** chega a resposta de cliente.
- Declaração de viabilidade, desempenho, resistência ou conformidade: proibida em
  `forbidden_operations`, com detector de linguagem de compromisso nos evals.
- § 12.5 permite explicar conceitos (FDM/SLA, PLA/PETG/ABS/ASA/TPU/PA/PC,
  contração, umidade, orientação de impressão) — isso é conhecimento geral
  legítimo. A fronteira é: **conceito pode, compromisso não pode.**
- Órtese/saúde: escalonamento imediato, zero coleta clínica (§ 12.6, **Q-04**).
**Esta é a Skill que mais depende de eval**, porque a fronteira entre "explicar
que PETG tem boa resistência a impacto" e "garantir que a sua peça vai suportar
5 kg" é sutil e sempre linguística. Mínimo de 12 casos de fronteira.

### 08 — Business Intelligence

**Contexto separado.** Não é alcançável de conversa de cliente (§ 7.5). Requer JWT
de staff e papel adequado.
**Ferramentas:** as 6 de § 7.5, como rotas de `services/api`.
**ADR-008:** números calculados em SQL; o LLM **narra**. Todo relatório declara
período, filtros, origem e limitações (§ 5.8) — campos obrigatórios do contrato,
não cortesia do prompt.
**Nenhuma escrita.** § 5.8: "não altere registros financeiros".

---

## 4. Roteamento (implementação de § 6)

Três camadas, conforme ADR-004 / C2.

### Camada 1 — determinística, pré-LLM

`config/intent-rules/{pt-BR,en}.yaml`. Precisão alta, cobertura baixa, por desenho.

```yaml
rules:
  - id: explicit_human_request
    intent: human_request
    action: escalate_immediately          # § 6.3: encaminhar sem tentar impedir
    patterns_pt: ["falar com (uma |um )?(pessoa|atendente|humano)", "quero (um )?atendente"]
    patterns_en: ["speak (to|with) (a )?(real )?(person|human|agent)", "talk to someone"]

  - id: refund_vocabulary
    intent: refund_request
    action: restrictive_policy            # § 6.3
    patterns_pt: ["reembolso", "estorno", "devolver o dinheiro", "cancelar a compra"]
    patterns_en: ["refund", "money back", "chargeback", "cancel my order"]

  - id: discount_request
    flag: discount_requested              # § 26.4; nenhuma alteração de preço possível
    patterns_pt: ["desconto", "cupom", "mais barato", "abatimento"]
    patterns_en: ["discount", "coupon", "cheaper", "% off"]

  - id: order_reference_present
    requires: identity_verification       # § 13.3
    patterns: ["(?i)\\b(order|pedido)\\s*#?\\s*([A-Z0-9-]{4,})\\b"]
```

Cada regra tem teste unitário com casos positivos e negativos, nos dois idiomas.

### Camada 2 — classificação por LLM

Intenção primária + secundárias, idioma, entidades, na **mesma** chamada da
resposta quando não há ferramenta (orçamento de latência, § 2.3 de `01`).
`confidence` é gravado em `agent_actions` e nada mais.

### Camada 3 — política, pós-LLM, determinística

A matriz de § 8 é consultada em `config/authorization-matrix.yaml`. Se a ação está
`blocked` ou `needs_approval`, a decisão do modelo é irrelevante.

### Mapa intenção → Skill (§ 6.1, integral)

| Intent | Skill | Camada 1? | Nota |
|---|---|---|---|
| `general_question` | 01 | — | |
| `product_discovery` | 02 | — | |
| `product_details` | 03 | — | |
| `purchase_intent` | 02 | — | |
| `custom_project` | 04 | — | |
| `engineering_request` | 07 | — | |
| `order_status` | 05 | **sim** (nº de pedido) | Exige identidade |
| `delivery_question` | 05 | — | |
| `complaint` | 06 | — | `priority` elevada |
| `refund_request` | 06 + humano | **sim** | Política restritiva |
| `partnership` | 01 + humano | — | |
| `human_request` | escalonamento | **sim** | Sem Skill; encaminha |
| `unknown` | 01 | — | Pergunta de esclarecimento |

---

## 5. Precedência de fontes (§ 11.2) como código

§ 11.2 é uma regra numerada que vira um tipo:

```ts
type SourceRank = 1 | 2 | 3 | 4 | 5;

const SOURCE_PRECEDENCE = {
  shopify_live:        1,  // dado comercial dinâmico
  supabase_operational:2,  // projeto, chamado, aprovação
  knowledge_approved:  3,  // política e especificação aprovadas
  customer_provided:   4,  // identificado como tal
  model_general:       5,  // só conceito; nunca dado da Five Lines
} as const;
```

Aplicação em três pontos:

1. **No Context Builder:** quando duas fontes divergem sobre o mesmo fato, só a
   de menor rank entra no contexto. A outra é descartada com log.
2. **No prompt:** cada bloco de contexto é rotulado com a origem e o rank, e o
   core instrui a nunca contradizer rank menor.
3. **No filtro de egresso:** se a resposta afirma preço, estoque ou prazo e
   nenhuma `tool_invocation` de rank 1 ocorreu no turno, é **sinalizado** —
   e, para preço e estoque, **bloqueado**.

⭐ O ponto 3 é o mecanismo que torna o KPI de § 18.4 ("respostas sem fonte quando
fonte era necessária") mensurável em produção, e não apenas uma aspiração.

---

## 6. Versionamento de prompt (ADR-010)

Lacuna do documento mestre: § 9.7 versiona workflow de n8n, mas nada versiona
comportamento de agente — que é o que o cliente efetivamente vê.

| Mecanismo | Detalhe |
|---|---|
| Prompts em git | `prompts/`, com CODEOWNERS; nenhuma edição em runtime |
| SemVer no manifesto | Maior = mudança de comportamento; menor = refinamento; patch = texto |
| `prompt_version` em `agent_actions` e `messages` | ⭐ Dado um mau atendimento, sabe-se exatamente qual prompt o produziu |
| Gate de CI | Mudança em `prompts/` dispara o eval; queda de métrica acima do limite reprova o PR |
| Rollback | Reverter o commit e fazer deploy. Sem edição a quente |
| Sem A/B na v1 | Volume insuficiente para significância; adiciona complexidade de atribuição |

**Por que não configurar prompt pelo painel** (§ 15.2.12 sugere "Atena
Configuration"): prompt editável em produção, sem revisão e sem eval, é a forma
mais rápida de quebrar o comportamento comercial da empresa. Proposta: o painel
expõe **parâmetros** seguros (horário de atendimento, tom, idiomas ativos, limiar
de escalonamento, flags de feature) — nunca o texto das instruções. Texto passa
por PR.

---

## 7. Modo de simulação (§ 20, Fase 1)

Entregável da Fase 1: "modo de simulação sem ações externas". Desenho:

- `POST /v1/turns/simulate` executa o pipeline **inteiro** — identidade, contexto,
  roteamento, política, seleção de ferramenta, validação de saída, filtro de
  egresso — com o runtime de ferramentas trocado por fixtures.
- As fixtures ficam em `prompts/skills/*/fixtures/` e incluem caminhos de falha
  (Shopify fora, produto inexistente, pedido de outro cliente).
- Nada é escrito no banco de produção (§ 28.2); a persistência vai para um schema
  efêmero.
- É o que o harness de eval usa no CI (`09` § 4.3).

⭐ Valor estratégico: permite validar e medir todo o comportamento das 8 Skills —
incluindo autorização, escalonamento e precedência de fontes — **antes** de
existir conta Shopify ou aprovação da Meta. Desacopla a Fase 1 das dependências
externas de risco (R2, R3).
