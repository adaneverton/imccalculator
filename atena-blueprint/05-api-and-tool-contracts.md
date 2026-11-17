# 05 — Contratos de API e de ferramentas

Responde ao pedido **(5) Defina os contratos das APIs e ferramentas**.

Três superfícies distintas, com regimes de autenticação diferentes:

| Superfície | Consumidor | Autenticação | Documento |
|---|---|---|---|
| **A** — `agent-orchestrator` | n8n | HMAC + nonce + janela de tempo | § 2 |
| **B** — `services/api` (REST) | Painel, n8n agendado | JWT do Supabase + RBAC | § 3 |
| **C** — Catálogo de ferramentas | O modelo, via tool calling | Nenhuma — o modelo **não** tem credencial | § 4–§ 9 |

**Invariante que atravessa tudo:** o modelo nunca recebe credencial, nunca escolhe
URL de destino, nunca define destinatário. Ele emite uma **intenção de chamada**;
o runtime decide se executa (§ 7, § 16.3 do documento mestre).

---

## 1. Envelope padrão

§ 7.6 do documento mestre, estendido com os campos que a observabilidade exige.

### Sucesso

```json
{
  "ok": true,
  "data": { },
  "error": null,
  "request_id": "req_01JD...",
  "turn_id": "trn_01JD...",
  "timestamp": "2026-11-17T14:22:01.113Z",
  "source": "shopify",
  "meta": {
    "cached": false,
    "upstream_latency_ms": 412,
    "api_version": "<definido na Fase 3, conforme documentação vigente>",
    "truncated": false
  }
}
```

### Erro

```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "UPSTREAM_UNAVAILABLE",
    "message": "The requested information could not be retrieved.",
    "retryable": true,
    "customer_safe_message": {
      "pt-BR": "Não consegui verificar essa informação agora.",
      "en": "I couldn't verify that information right now."
    }
  },
  "request_id": "req_01JD...",
  "turn_id": "trn_01JD...",
  "timestamp": "2026-11-17T14:22:01.113Z",
  "source": "shopify",
  "meta": { "attempt": 2, "circuit_state": "half_open" }
}
```

⭐ `customer_safe_message` existe para que a mensagem ao cliente em caso de falha
seja **determinística e revisada**, não gerada pelo modelo. É assim que § 17.1
("não inventar resultado") deixa de depender do prompt.

`message` é para log interno; **nunca** chega ao cliente. Nunca contém stack
trace, token, segredo ou detalhe interno (§ 7.6).

### Taxonomia de erro

| Código | HTTP | Retry | Significado |
|---|---|---|---|
| `VALIDATION_FAILED` | 400 | não | Argumentos não satisfazem o schema |
| `IDENTITY_REQUIRED` | 401 | não | Operação exige verificação de identidade |
| `IDENTITY_INSUFFICIENT` | 403 | não | Nível de verificação abaixo do exigido |
| `NOT_AUTHORIZED` | 403 | não | Matriz de § 8 nega esta operação |
| `APPROVAL_REQUIRED` | 409 | não | Requer aprovação humana; solicitação criada |
| `TOOL_NOT_ALLOWED_FOR_SKILL` | 403 | não | Ferramenta fora da allowlist da Skill |
| `RESOURCE_NOT_FOUND` | 404 | não | — |
| `RESOURCE_NOT_OWNED` | 403 | não | ⭐ Recurso existe mas não é do cliente. Resposta ao cliente é idêntica a 404 |
| `IDEMPOTENCY_KEY_REUSE` | 409 | não | Mesma chave, payload diferente |
| `RATE_LIMITED` | 429 | sim | Limite nosso ou do upstream |
| `UPSTREAM_UNAVAILABLE` | 502 | sim | Shopify/Meta/LLM fora |
| `UPSTREAM_TIMEOUT` | 504 | sim | Estourou o timeout de `config/resilience.yaml` |
| `CIRCUIT_OPEN` | 503 | sim, depois | Circuit breaker aberto |
| `FILE_REJECTED` | 422 | não | Extensão, MIME, tamanho ou scan |
| `POLICY_BLOCKED` | 403 | não | Fora de escopo de § 1.5 |
| `INTERNAL_ERROR` | 500 | sim | Não classificado; sempre gera alerta |

⭐ `RESOURCE_NOT_OWNED` e `RESOURCE_NOT_FOUND` produzem **a mesma** mensagem ao
cliente. Distinguir as duas confirmaria a existência de um pedido de outra
pessoa — um oráculo de enumeração. A distinção existe só no log.

---

## 2. Superfície A — `agent-orchestrator`

### `POST /v1/turns`

O único endpoint do caminho conversacional. Chamado pelo WF-01.

**Headers obrigatórios:** `X-Atena-Signature` (HMAC-SHA256 do corpo bruto),
`X-Atena-Timestamp` (rejeita desvio > `ORCHESTRATOR_INBOUND_MAX_SKEW_SECONDS`),
`X-Atena-Nonce` (rejeita repetido), `Idempotency-Key`, `X-Request-Id`.

**Corpo** — `InboundMessage`, derivado de § 14.2:

```json
{
  "event_id": "wamid.HBgM...",
  "channel": "whatsapp",
  "external_user_id": "<wa_id>",
  "external_conversation_id": "<thread id>",
  "message_id": "<provider message id>",
  "message_type": "text",
  "text": "Quanto custa o suporte de monitor?",
  "received_at": "2026-11-17T14:21:58.000Z",
  "attachments": [
    {
      "external_id": "<media id>",
      "mime_type_declared": "image/jpeg",
      "file_size": 184203,
      "download_url_token": "<token opaco de curta duração>"
    }
  ],
  "channel_metadata": {
    "profile_name": "<nome do perfil, não confiável>",
    "within_service_window": true
  }
}
```

⭐ `download_url_token` é **token opaco**, não URL. O orquestrador resolve o token
contra um endpoint conhecido. Aceitar URL arbitrária aqui seria SSRF, e
§ 16.3 proíbe explicitamente aceitar destino definido livremente.

**Resposta 200:**

```json
{
  "ok": true,
  "data": {
    "turn_id": "trn_01JD...",
    "conversation_id": "cnv_...",
    "replies": [
      { "type": "text", "language": "pt-BR",
        "body": "O suporte de monitor está a €24,90. Quer que eu confirme a disponibilidade?" }
    ],
    "intent_primary": "product_discovery",
    "intents_all": [{ "intent": "product_discovery", "priority": 1 }],
    "skill": "sales_intelligence",
    "requires_human": false,
    "escalation_id": null,
    "actions_taken": [
      { "tool": "search_products", "status": "ok" },
      { "tool": "get_product_price", "status": "ok" }
    ],
    "next_step": "await_customer_response",
    "delivery_hints": { "typing_indicator": false, "requires_template": false }
  },
  "error": null,
  "request_id": "req_...", "turn_id": "trn_...",
  "timestamp": "...", "source": "orchestrator"
}
```

⭐ `replies` é um **array**: um turno pode legitimamente produzir duas mensagens
(resposta + pergunta de acompanhamento). O n8n envia na ordem.

⭐ `delivery_hints.requires_template` informa ao egresso que a janela de serviço
fechou e que é preciso template aprovado — ou suprimir o envio.

**Outros endpoints da superfície A:**

| Método | Caminho | Finalidade |
|---|---|---|
| `POST` | `/v1/turns/simulate` | ⭐ Fase 1: executa o turno **sem** efeito externo. Ferramentas retornam fixtures. É o "modo de simulação sem ações externas" de § 20 Fase 1 |
| `POST` | `/v1/attachments/resolve` | Troca `download_url_token` por objeto armazenado, após validação |
| `GET` | `/healthz` / `/readyz` | Liveness / readiness |
| `GET` | `/v1/turns/{turn_id}` | Reconstrói um turno para depuração. Requer JWT de staff |

---

## 3. Superfície B — `services/api`

JWT do Supabase; `staff_users.role` resolve o RBAC; toda rota escreve em
`audit_log`.

| Método | Caminho | Papéis | Nota |
|---|---|---|---|
| `GET` | `/v1/conversations` | sales/support/analyst+ | Filtros de § 15.4 |
| `POST` | `/v1/conversations/{id}/takeover` | sales_agent, support_agent+ | Humano assume; Atena silencia |
| `POST` | `/v1/conversations/{id}/release` | idem | Devolve à Atena |
| `POST` | `/v1/conversations/{id}/messages` | idem | Mensagem humana. Verifica janela e consentimento |
| `POST` | `/v1/conversations/{id}/notes` | idem | Nota interna; nunca enviada ao cliente |
| `GET/PATCH` | `/v1/customers/{id}` | sales+, admin para PII | Alteração de PII exige justificativa |
| `POST` | `/v1/customers/merge` | admin+ | ⭐ Fusão de identidade. Exige verificação; irreversível → `merged_into_customer_id` |
| `GET/PATCH` | `/v1/leads/{id}` | sales+ | `lost` exige `lost_reason` |
| `GET/PATCH` | `/v1/projects/{id}` | sales+, engineering_reviewer | Transição validada pela máquina de estado |
| `POST` | `/v1/projects/{id}/technical-review` | engineering_reviewer+ | Parecer técnico |
| `GET` | `/v1/projects/{id}/files/{fid}/signed-url` | sales+, engineering_reviewer | ⭐ Só se `scan_status='clean'`. TTL de `SIGNED_URL_TTL_SECONDS`. Incrementa `access_count` |
| `POST` | `/v1/quotes` | sales_manager, engineering_reviewer+ | Cria orçamento. **Nunca** pela Atena |
| `POST` | `/v1/quotes/{id}/submit` | criador | → `pending_approval` |
| `POST` | `/v1/quotes/{id}/decision` | `can_approve_quotes` | ⭐ Corpo inclui `content_hash` que o aprovador viu. Divergência → 409 |
| `POST` | `/v1/quotes/{id}/send` | sales_manager+ | Revalida hash; grava `sent_at` |
| `GET/POST` | `/v1/tickets`, `/v1/escalations` | support+ | |
| `POST` | `/v1/escalations/{id}/acknowledge` | papel-alvo | Grava `acknowledged_at` |
| `GET` | `/v1/reports/{name}` | analyst+ | ⭐ Números de SQL determinístico (ADR-008) |
| `GET/POST/PATCH` | `/v1/knowledge/documents` | admin+ | Publicar exige `approved_by` ≠ autor |
| `GET/POST` | `/v1/dsr` | admin+ (DPO) | Direitos do titular; calcula `due_at` |
| `GET` | `/v1/audit` | owner, admin | Somente leitura |
| `GET/PATCH` | `/v1/config/atena` | owner, admin | Configuração da Atena (§ 15.2.12). Mudança → `audit_log` |
| `GET` | `/v1/health/integrations` | admin+ | § 15.2.15 |

**Padrões:** paginação por cursor; `If-Match` com ETag em `PATCH` (impede
sobrescrita cega); `Idempotency-Key` obrigatório em todo `POST` que cria ou
notifica; versionamento no caminho (`/v1`); `429` com `Retry-After`.

---

## 4. Superfície C — catálogo de ferramentas

### 4.1 Como uma ferramenta é definida

Cada ferramenta tem um arquivo em `packages/schemas/src/tool-contracts/`, com:

```ts
export const getProductPriceContract = defineTool({
  name: 'get_product_price',
  version: 1,
  description: 'Obtém o preço atual e a moeda de uma variante na Shopify.',
  args: z.object({
    product_id: z.string().min(1),
    variant_id: z.string().min(1).optional(),
  }),
  result: z.object({
    product_id: z.string(),
    variant_id: z.string(),
    amount: z.string(),          // ⭐ string decimal, nunca float
    currency: z.string().length(3),
    compare_at_amount: z.string().nullable(),
    as_of: z.string().datetime(),
  }),
  permission: 'read',
  side_effects: 'none',
  requires_identity_level: 0,
  idempotent: true,
  cacheable_ms: 0,               // ⭐ preço nunca é cacheado (§ 25.2)
  allowed_skills: ['sales_intelligence', 'product_specialist'],
  upstream: 'shopify',
  on_failure: 'inform_cannot_verify',
});
```

⭐ `allowed_skills` é aplicado **no runtime**, não no prompt. Se a Skill 01 tentar
`generate_checkout`, a chamada é recusada com `TOOL_NOT_ALLOWED_FOR_SKILL` antes
de qualquer I/O — e registrada como tentativa de ação não autorizada (métrica de
§ 18.4, "ações não autorizadas tentadas").

⭐ `amount` é **string decimal**. Valor monetário em `float` é uma classe de bug
que não quero neste sistema.

⭐ `cacheable_ms: 0` para preço e estoque materializa § 25.2 no tipo: não há onde
guardar.

### 4.2 Pipeline de execução de toda ferramenta

```
1. Schema de args          → VALIDATION_FAILED
2. Allowlist da Skill      → TOOL_NOT_ALLOWED_FOR_SKILL
3. Matriz de autorização   → NOT_AUTHORIZED | APPROVAL_REQUIRED
4. Nível de identidade     → IDENTITY_REQUIRED | IDENTITY_INSUFFICIENT
5. Propriedade do recurso  → RESOURCE_NOT_OWNED  (mascarado como 404)
6. Idempotência            → resultado memoizado, ou IDEMPOTENCY_KEY_REUSE
7. Circuit breaker         → CIRCUIT_OPEN
8. Execução + timeout + retry      (config/resilience.yaml)
9. Schema de resultado     → INTERNAL_ERROR (upstream mudou de contrato)
10. Redação de PII no log
11. Registro em tool_invocations
```

Nenhuma etapa é opcional. As etapas 1–7 são **anteriores** a qualquer I/O.

---

## 5. Ferramentas Shopify (§ 7.1)

Nota de § 7.1 respeitada: **nada aqui presume** que a conta/plano da loja suporte
a operação. Verificação é entregável da Fase 0/3 (**Q-17**).

| Ferramenta | Args | Retorno (resumo) | Perm. | Id.¹ | Idemp. | Falha |
|---|---|---|---|---|---|---|
| `search_products` | `query`, `pillar?`, `limit≤20`, `cursor?` | lista: id, título, faixa de preço, disponibilidade, imagem | leitura | 0 | sim | não verificou |
| `get_product_details` | `product_id` | título, descrição, variantes, opções, mídia, metacampos aprovados | leitura | 0 | sim | não verificou |
| `get_product_price` | `product_id`, `variant_id?` | `amount`, `currency`, `as_of` | leitura | 0 | sim | não verificou |
| `check_inventory` | `product_id`, `variant_id?` | `available`, `quantity?`, `policy`, `as_of` | leitura | 0 | sim | não verificou |
| `get_shipping_options` | `country_code`, `postcode?`, `items[]` | opções, custo, prazo estimado | leitura | 0 | sim | não verificou |
| `get_order_status` | `order_number`, `verification_token` | status, data, status de fulfilment | leitura | **1+** | sim | não verificou |
| `get_order_tracking` | `order_number`, `verification_token` | transportadora, código, URL, última situação | leitura | **2** | sim | não verificou |
| `get_payment_status` | `order_number`, `verification_token` | `financial_status`, `paid_at?` | leitura | **2** | sim | não verificou |
| `generate_checkout` | `items[]`, `expected_total`, `currency` | `checkout_url`, `expires_at` | **escrita** | 0 | **chave obrigatória** | não gera |
| `create_draft_order` | `items[]`, `note` | `draft_order_id`, status | **escrita** | **2** | **chave obrigatória** | não gera |

¹ `Id.` = `requires_identity_level` (§ 2.3 de `07`).

**Regras específicas, derivadas do documento mestre:**

1. `get_order_*` e `get_payment_status` exigem `verification_token` emitido por
   `identity_verifications`. **Sem token, a ferramenta não aparece** no catálogo
   oferecido ao modelo naquele turno — não é "o modelo decide não usar": ela não
   existe para ele.
2. `generate_checkout` **revalida** preço e disponibilidade no servidor antes de
   gerar o link (§ 13.4) e compara com `expected_total`. Divergência → recusa +
   alerta. Isto impede que o modelo gere checkout com preço que ele "lembra".
3. `create_draft_order` fica atrás de `FEATURE_CHECKOUT_ENABLED` e **não entra na
   v1** sem decisão explícita — § 7.1 a marca como "se necessário".
4. Nenhuma ferramenta de escrita em produto, preço, estoque ou pedido existe no
   catálogo. § 8 marca essas operações como bloqueadas; a forma mais robusta de
   bloquear é **não implementar a ferramenta**.
5. Rate limit da Shopify é tratado no cliente (`packages/integrations`), com fila
   e respeito ao custo de query; o modelo nunca vê um 429.

---

## 6. Ferramentas de CRM (§ 7.2)

| Ferramenta | Args | Perm. | Id. | Nota |
|---|---|---|---|---|
| `find_customer` | `channel`, `external_id` | leitura | 0 | ⭐ Busca **só** pela identidade do canal em uso. Não aceita e-mail ou telefone arbitrário — isso seria uma ferramenta de enumeração de clientes |
| `create_customer` | `display_name?`, `preferred_language` | escrita | 0 | Minimização: só o necessário (§ 7.2) |
| `update_customer` | `fields` | escrita | **2** | Alteração de PII exige verificação |
| `get_customer_history` | `scope`, `limit` | leitura | **1** | Escopo limitado: nunca devolve conversa de outra identidade não verificada |
| `save_customer_preferences` | `preferences` | escrita | 0 | Só preferência (idioma, canal), não PII |
| `create_customer_note` | `note` | escrita | 0 | Nota da Atena; marcada como origem IA |
| `create_lead` | `intent`, `product_interest?`, `notes?` | escrita | 0 | Idempotente por turno |
| `update_lead_status` | `lead_id`, `stage`, `reason?` | escrita | 0 | ⭐ `won` **bloqueado** para a Atena: venda é confirmada pela Shopify, não pelo modelo |

---

## 7. Ferramentas de projeto (§ 7.3)

| Ferramenta | Args | Perm. | Nota |
|---|---|---|---|
| `create_project_request` | `title`, `purpose`, `pillar`, `description` | escrita | Status inicial `new`. Idempotente por conversa |
| `save_project_specifications` | `project_id`, `requirements` | escrita | Valida contra `project-request.schema.json`; faz merge, não sobrescreve; recalcula `missing_requirements` |
| `attach_project_reference` | `project_id`, `attachment_id` | escrita | Vincula anexo **já** validado e escaneado. Não faz download |
| `request_technical_review` | `project_id`, `summary` | escrita | ⭐ § 8: "solicitar avaliação técnica: permitida — **não equivale a aprovação**". A ferramenta não altera viabilidade |
| `get_project_status` | `project_id` ou `reference_code` | leitura | Devolve status **traduzido para linguagem de cliente**, não o enum interno |
| `submit_quote_for_approval` | `project_id`, `quote_id` | escrita | ⭐ Só move para `pending_approval`. Não cria orçamento, não define preço |
| `get_quote_status` | `quote_id` | leitura | Devolve `pending`/`approved`/`sent` — **nunca** o valor antes de aprovado e enviado |
| `send_approved_quote` | `quote_id` | **escrita condicional** | ⭐ Ver § 7.1 abaixo |

### 7.1 `send_approved_quote` — a ferramenta mais sensível do sistema

§ 7.3 exige: "deve verificar no backend se existe aprovação válida, vigente e
vinculada à versão exata da proposta". Implementação:

```
1. Carrega quote por id
2. Recalcula content_hash a partir do estado atual (+ quote_items)
3. Busca quote_approvals por (quote_id, approved_content_hash = hash atual)
   ├─ ausente              → APPROVAL_REQUIRED, não envia
   └─ decision ≠ approved  → NOT_AUTHORIZED, não envia
4. Verifica valid_until ≥ hoje         → EXPIRED, não envia
5. Verifica status ∈ {approved}        → NOT_AUTHORIZED
6. Verifica aprovador ≠ criador e ativo (defesa em profundidade; o trigger já garante)
7. Verifica consentimento/janela do canal
8. Envia, grava sent_at, status='sent', agent_action com policy_rule_id
9. Divergência de hash em qualquer ponto → INCIDENTE: alerta + bloqueio do orçamento
```

O passo 9 é deliberadamente severo: divergência de hash significa que alguém
alterou um orçamento aprovado. É um evento de segurança, não um erro de validação.

**Nenhuma ferramenta permite à Atena criar ou precificar orçamento.** `quotes`
tem `created_by_staff_user_id NOT NULL` com FK para `staff_users`, e a Atena não
tem registro lá (§ 5.2 de `04`). O bloqueio de § 8 ("calcular orçamento
definitivo: bloqueada") é estrutural.

---

## 8. Ferramentas de atendimento (§ 7.4)

| Ferramenta | Args | Perm. | Nota |
|---|---|---|---|
| `save_conversation` | — | escrita | Chamada pelo runtime, não pelo modelo |
| `summarize_conversation` | `conversation_id` | escrita | Atualiza `rolling_summary` |
| `create_support_ticket` | `category`, `priority`, `description` | escrita | Idempotente por conversa+categoria |
| `escalate_to_human` | `reason`, `urgency`, `context_summary` | escrita | ⭐ Ver § 8.1 |
| `send_customer_message` | `body`, `language` | escrita | ⭐ Ver § 8.2 |
| `schedule_follow_up` | `type`, `when`, `purpose` | **escrita condicional** | ⭐ Exige `consent_record_id` válido para finalidade comercial. Sem consentimento → `POLICY_BLOCKED` |

### 8.1 `escalate_to_human`

§ 26.7 e § 8.1 exigem confirmar ao cliente **somente** após o registro.
Implementação: a ferramenta cria `escalations`, devolve `escalation_id` **e** o
texto de confirmação pré-aprovado. Se a ferramenta falha, o modelo não recebe
`escalation_id` — e o guardrail do core proíbe afirmar encaminhamento sem ele.
A frase de confirmação é texto revisado, não geração livre.

Pedido explícito de humano nunca é negociado nem desencorajado (§ 6.3).

### 8.2 `send_customer_message`

Única ferramenta cuja saída vai direto ao cliente, e por isso tem o controle mais
rígido:

- **Destinatário não é argumento.** É derivado do `conversation_id` do turno.
  Se o modelo pudesse escolher destinatário, uma injection exfiltraria dados por
  mensagem.
- Passa pelo **filtro de egresso** (`config/egress-filters.yaml`): padrões de
  segredo, dado de outro cliente, URL fora da allowlist, menção a instrução
  interna.
- Verifica janela de serviço e consentimento; fora da janela, exige template
  aprovado ou suprime e registra `suppression_reason`.
- Links permitidos **só** do domínio da loja ou de URL assinada nossa.

---

## 9. Ferramentas administrativas (§ 7.5)

§ 7.5 é explícito: "Nunca devem ser disponibilizadas no contexto de atendimento
público."

**Implementação:** estas seis ferramentas **não existem** no catálogo do
orquestrador conversacional. Elas são rotas de `services/api` (`/v1/reports/*`),
acessadas pela Skill 08 apenas em um contexto distinto, com JWT de staff:

| Ferramenta | Rota | Papel mínimo |
|---|---|---|
| `get_daily_sales_summary` | `GET /v1/reports/daily-sales` | analyst |
| `get_open_leads` | `GET /v1/reports/open-leads` | sales_agent |
| `get_pending_quotes` | `GET /v1/reports/pending-quotes` | sales_manager |
| `get_low_stock_products` | `GET /v1/reports/low-stock` | analyst |
| `get_customer_satisfaction` | `GET /v1/reports/satisfaction` | analyst |
| `generate_daily_report` | `POST /v1/reports/daily/generate` | analyst |

⭐ **ADR-008:** todos os números vêm de views/funções SQL. O LLM recebe um
resultado já calculado e apenas o **narra**, com período, filtros e limitações
(§ 5.8). O modelo nunca soma, divide ou projeta. Elimina a classe de erro
"relatório com número inventado" — que num relatório de vendas é inaceitável.

Separação dura: um cliente em conversa pública **não tem caminho de código** até
estas rotas. Não é uma verificação de permissão que pode falhar; é uma superfície
diferente, com autenticação diferente.

---

## 10. Saída estruturada do modelo

§ 6.2 do documento mestre, revisado conforme ADR-004 (multi-intenção, confiança
como telemetria).

```json
{
  "schema_version": 1,
  "language": "en",
  "intents": [
    { "intent": "custom_project", "priority": 1 },
    { "intent": "delivery_question", "priority": 2 }
  ],
  "skill": "custom_projects",
  "confidence": 0.94,
  "action": "collect_requirements",
  "customer_response": "Of course. What would you like to create?",
  "requires_human": false,
  "uncertainty": {
    "has_unverified_claims": false,
    "missing_information": ["dimensions", "quantity"]
  },
  "next_step": "await_customer_response",
  "deferred_intents": ["delivery_question"]
}
```

Diferenças em relação a § 6.2, e por quê:

| Campo | Mudança | Razão |
|---|---|---|
| `intents[]` | Substitui `intent` único | § 6.3 exige não perder intenção secundária |
| `confidence` | Mantido, mas **telemetria** | ADR-004 / C2: não é gate de nada |
| `required_approval` | **Removido** | ⭐ Não é o modelo que decide se algo requer aprovação. Isso vem da matriz de § 8, avaliada no servidor. Deixar o campo convida a confiar nele |
| `uncertainty` | Novo | Operacionaliza § 3.5 (distinguir confirmado/estimativa/desconhecido) e torna mensurável o KPI "respostas sem fonte quando fonte era necessária" (§ 18.4) |
| `deferred_intents` | Novo | Alimenta `conversation_state.pending_asks` |
| `schema_version` | Novo | Permite evoluir o contrato sem quebrar turnos em voo |

**Validação:** JSON Schema estrito. Falha de validação → um retry com o erro
anexado; segunda falha → escalonamento a humano. **Nunca** improvisar sobre
saída inválida.

---

## 11. Versionamento e compatibilidade

| Artefato | Versionamento | Quebra permitida |
|---|---|---|
| Superfícies A e B | Caminho (`/v1`) | Só em nova versão de caminho |
| Contrato de ferramenta | `version` no contrato | Campo novo opcional = menor; remoção/renomeação = nova ferramenta |
| Saída estruturada | `schema_version` | Compatível por 2 versões |
| Prompt de Skill | SemVer no manifesto; `prompt_version` em `agent_actions` | Rollback = deploy (ADR-010) |
| Schema de banco | Migration sequencial | `expand → migrate → contract`, nunca destrutiva em um passo |
| API da Shopify | `SHOPIFY_API_VERSION` explícito; documentada em `docs/integrations.md` | § 13.2 exige documentar a versão; verificar suporte antes de fixar |
