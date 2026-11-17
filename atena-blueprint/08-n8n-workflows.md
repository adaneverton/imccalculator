# 08 — Workflows n8n

Responde ao pedido **(8) Planeje os workflows do n8n**.

Base: § 9 do documento mestre, com a fronteira de responsabilidade de
**ADR-002 / C1** aplicada.

---

## 1. Fronteira: o que vive no n8n e o que não vive

### Vive no n8n

| Responsabilidade | Por quê |
|---|---|
| Receber webhook, validar assinatura, deduplicar, normalizar | É o que n8n faz bem; adaptador de canal muda sem deploy |
| Enviar pelo canal de origem | Idem |
| Agendados: relatório, follow-up, alerta de estoque, retenção | Caso de uso ideal: visível e editável pela operação |
| Notificação de aprovação pendente e lembrete | Roteamento de notificação muda com frequência |
| Tratamento central de erro e DLQ | Bom suporte nativo |
| Correlação entre workflows | § 9.7 |

### Não vive no n8n

| Responsabilidade | Onde vive | Por quê |
|---|---|---|
| Validação de **autorização** | `packages/policy` | § 4.4 atribui ao backend; precisa de teste unitário por célula (§ 19.3) |
| Chamada de LLM e montagem de prompt | `agent-orchestrator` | Prompt versionado em git, com eval em CI (ADR-010) |
| Seleção e execução de ferramenta | `packages/tools` | Allowlist por Skill aplicada em código |
| Verificação de identidade | `agent-orchestrator` | Maior risco de GDPR; não pode estar em nó visual |
| Cálculo de métrica | SQL (ADR-008) | Determinismo |
| Scoping de dado de cliente | `packages/data-access` | ADR-006 |
| Qualquer regra de negócio condicional sobre permissão | Backend | — |

⭐ Consequência prática: o WF-01 passa dos 17 passos de § 9.1 para **7 nós**, com
uma chamada HTTP. Tudo que foi retirado continua existindo — apenas em código
tipado, testado e revisável em PR.

---

## 2. Os 13 workflows

### 2.1 `WF-01 Incoming Customer Message`

Os 17 passos de § 9.1, redistribuídos:

| Passo de § 9.1 | Onde | Nó/Componente |
|---|---|---|
| 1. Webhook de entrada | n8n | Webhook (um por canal) |
| 2. Validar assinatura/origem | **n8n** | Function: HMAC do payload bruto |
| 3. Verificar duplicidade | **n8n** | HTTP → `POST /internal/events/claim` (`UNIQUE (provider, external_event_id)`) |
| 4. Normalizar | **n8n** | Function → `InboundMessage` (§ 14.2) |
| 5–13. Conversa, contexto, idioma, LLM, validação, autorização, ferramenta, resposta | **orquestrador** | `POST /v1/turns` |
| 14. Validação de conteúdo e política | **orquestrador** | Filtro de egresso |
| 15. Enviar pelo canal de origem | **n8n** | Switch por canal → WF-01b |
| 16. Registrar mensagem e ação | **orquestrador** + n8n | Orquestrador grava; n8n grava status de entrega |
| 17. Tratar falha ou timeout | **n8n** | Error trigger → WF-11 |

```
Webhook(canal)
  → Verify signature            [falha → 401, log, fim]
  → Claim event (dedupe)        [duplicate → 200, fim silencioso]
  → Normalize → InboundMessage
  → HTTP POST /v1/turns         [HMAC, Idempotency-Key, X-Request-Id, timeout 25s]
       ├─ 200 → Switch(channel) → WF-01b (envio)
       ├─ 4xx → log + alerta (erro nosso, não repetir)
       └─ 5xx/timeout → WF-11 (retry com backoff → DLQ)
  → Record delivery status
```

Critérios de § 9.1, com o mecanismo de cada:

| Critério | Mecanismo |
|---|---|
| Evento repetido não cria duas ações comerciais | Passo 3 + `Idempotency-Key` + idempotência de ferramenta (3 camadas, § 4 de `04`) |
| Falha de Shopify não gera preço inventado | `on_failure: inform_cannot_verify` + `customer_safe_message` + filtro de egresso bloqueia afirmação de preço sem fonte rank 1 |
| Mensagem não autorizada não acessa dado de outro cliente | Scoping obrigatório + `shopify_order_links` + nível de identidade |
| Falha no canal é registrada sem declarar sucesso | `outbound_deliveries` com estados próprios; nunca `delivered` sem confirmação do provedor |

### 2.2 `WF-01b Outgoing Message` ⭐ novo

Não existe em § 9, mas o egresso tem lógica própria o bastante para ser workflow:

```
Trigger(interno) → Verificar opt-out            [opt-out → suppressed]
  → Verificar janela de serviço (WhatsApp 24h)
       ├─ dentro  → envio de texto livre
       └─ fora    → template aprovado existe?
                      ├─ sim → envio por template
                      └─ não → suppressed(outside_window_no_template) + alerta
  → Enviar pela API do canal
  → Gravar provider_message_id + status
  → Falha → retry (resilience.yaml) → DLQ
```

⭐ Separar o egresso é o que torna a janela de 24 h do WhatsApp (§ 14.1) e o
opt-out (§ 14.3) impossíveis de esquecer: **todo** envio passa por aqui.

### 2.3 `WF-02 Product & Sales`

§ 9.2 descreve 10 passos que, no desenho de ADR-002, são o fluxo interno da
Skill 02 dentro do orquestrador — não um workflow separado.

**O que sobra no n8n:** o passo 10 ("acompanhar status somente quando
autorizado"), como agendado de progressão de lead:

```
Cron → GET /v1/reports/stale-leads
  → Para cada lead: consentimento válido? janela ok?
       ├─ sim → WF-08 (follow-up)
       └─ não → marca suppressed, notifica dono do lead
```

Os quatro critérios de § 9.2 são garantidos no orquestrador:
cache vencido como preço atual → impossível (`cacheable_ms: 0`);
estoque sem retorno da fonte → bloqueado pelo filtro de egresso;
checkout para item indisponível → `generate_checkout` revalida no servidor;
pedido concluído sem confirmação → `confirm_payment` é somente leitura (§ 8).

### 2.4 `WF-03 Custom Project Request`

§ 9.3 tem 15 passos. Divisão:

| Passos | Onde |
|---|---|
| 1–4 (identificar, coletar, perguntar, receber arquivo) | Orquestrador, Skill 04 |
| 5–7 (validar arquivo, salvar em storage privado, metadado) | Orquestrador (pipeline de § 6 de `07`) |
| 8–10 (resumo técnico, criar projeto, encaminhar revisão) | Orquestrador |
| **11–15 (comentários, orçamento versionado, aprovação, envio, resposta)** | **n8n + painel** |

O que fica no WF-03:

```
Trigger: projeto → awaiting_technical_review
  → Notifica engineering_reviewer (canal interno)
  → Aguarda parecer (webhook do painel)
  → Parecer registrado → notifica sales_manager para criar orçamento
  → Orçamento → pending_approval → dispara WF-06
  → Aprovado → dispara send_approved_quote (revalida hash)
  → Envia ao cliente via WF-01b
  → Registra resposta do cliente
```

⭐ O resumo técnico preliminar de § 12.4 é gerado com o **template literal** de
§ 12.4, preenchido com campos de `projects.requirements`. Campo ausente aparece
como `Missing information:` — não é preenchido pelo modelo. É assim que o resumo
técnico não ganha dados inventados.

### 2.5 `WF-04 Order & After Sales`

§ 9.4 tem 9 passos; os 1–7 são a Skill 05 no orquestrador. No n8n fica a
reação a **webhook da Shopify** (que § 9.4 não cobre explicitamente mas § 13.2 exige):

```
Webhook(Shopify: orders/fulfilled, orders/updated, refunds/create)
  → Verificar HMAC da Shopify
  → Claim event (dedupe)
  → POST /internal/orders/sync
  → Houve mudança relevante para o cliente?
       └─ sim + consentimento + janela → notificação proativa via WF-01b
  → Divergência detectada → abre chamado (§ 9.4 passo 8)
```

### 2.6 `WF-05 Management & Reports`

§ 9.5, integral:

```
Cron ou solicitação interna
  → Valida identidade e papel     [JWT de staff; sem papel → 403 + audit_log]
  → GET /v1/reports/{name}        [números de SQL determinístico — ADR-008]
  → LLM narra o resultado         [não calcula; declara período, filtros, limitações]
  → Registra execução
  → Entrega apenas a destinatários autorizados
```

⭐ A ordem importa: validar papel **antes** de consultar. O relatório não é
calculado para depois ser filtrado.

### 2.7 `WF-06 Human Approval`

```
Trigger: quotes.status → pending_approval
  → Monta resumo: cliente, projeto, requisitos, arquivos, parecer, escopo,
    preço, moeda, prazo, condições, versão, content_hash
  → Notifica aprovadores elegíveis (can_approve_quotes, alçada, ≠ criador)
  → Lembrete após N horas              [N aguarda SLA — § 24]
  → Decisão registrada (webhook do painel)
       ├─ approved      → WF-03 continua
       ├─ rejected      → notifica criador
       └─ info_requested→ volta a draft, notifica criador
  → Expirou sem decisão → escala ao papel acima
```

⭐ O resumo inclui o `content_hash`. O painel envia de volta o hash que o
aprovador viu; divergência → 409 (§ 4 de `07`). Elimina a condição de corrida de
aprovar um orçamento que mudou depois do carregamento da tela.

### 2.8 `WF-07 Quote Status Update`

```
Cron diário → orçamentos com valid_until vencido → status='expired'
  → Notifica dono do lead
  → Orçamento enviado sem resposta há N dias → tarefa de follow-up (com consentimento)
```

### 2.9 `WF-08 Customer Follow-up`

```
Cron → follow_ups com status='scheduled' e scheduled_for ≤ agora
  → consent_record_id válido e não retirado?   [não → suppressed(no_consent)]
  → channel_identities.opt_out_at nulo?        [não → suppressed(opt_out)]
  → Dentro da janela de serviço?               [não → requires_template]
  → Envia via WF-01b
  → Grava resultado
```

⭐ Três gates antes de qualquer envio proativo. § 14.3 proíbe mensagem
promocional sem configuração legal e operacional apropriada; esta é a aplicação.

### 2.10 `WF-09 Inventory Alert`

```
Cron → GET /v1/reports/low-stock [limiar de config — § 24 "limite de estoque baixo"]
  → Notifica sales_manager
```
⚠️ Fica **desabilitado** até o limiar ser definido (§ 24). Não vou escolher um número.

### 2.11 `WF-10 Daily Report`

```
Cron diário → WF-05 com o conjunto de relatórios do dia
  → Entrega aos papéis autorizados
  → Registra execução e destinatários
```

### 2.12 `WF-11 Error Handling & Dead Letter`

Tratamento central de erro de § 9.7:

```
Error Trigger (global)
  → Classifica: transitório | permanente | de segurança
       ├─ transitório → retry com backoff (resilience.yaml), máx. N
       ├─ permanente  → DLQ (integration_events.processing_status='dead_lettered')
       └─ segurança   → alerta imediato, NÃO retry
  → Correlaciona por request_id / turn_id
  → Alerta conforme severidade
  → Oferece reprocessamento manual a partir de raw_payload_storage_path
```

⭐ A terceira classe importa: assinatura inválida ou tentativa de acesso cruzado
**não deve ser repetida**. Retry de evento de segurança amplifica ataque.

### 2.13 `WF-12 Data Retention & Privacy Requests`

```
Cron diário → lê config/retention-policy.yaml
  → Para cada entidade vencida: anonimiza | apaga | arquiva
  → Apaga objeto de storage correspondente
  → Registra em audit_log (quantidade, não conteúdo)

Trigger: nova data_subject_request
  → Notifica DPO/admin
  → Lembrete conforme due_at
  → Apagamento aprovado → executa cascata e registra
```

⚠️ Fica **desabilitado** até **Q-13** (prazos de retenção). O workflow é
construído; os números são decisão de negócio e jurídico.

---

## 3. Idempotência no n8n (§ 17.2)

| Camada | Implementação |
|---|---|
| Ingresso | Nó `Claim event` → `UNIQUE (provider, external_event_id)`. Resposta `duplicate` encerra o fluxo com 200 |
| Chamada ao orquestrador | `Idempotency-Key` = `sha256(provider + external_event_id)`. Retry do n8n é seguro por construção |
| Envio ao canal | Chave de envio por `message_id` interno; `provider_message_id` detecta reenvio |
| Agendados | Marca de execução por janela (`period_key`); reexecução do mesmo período não duplica |

⭐ O ponto delicado: o retry nativo do n8n é **cego**. Sem `Idempotency-Key`, um
timeout de 25 s no orquestrador que de fato processou o turno geraria segunda
resposta ao cliente. Por isso a chave é derivada do evento, não gerada por
execução.

---

## 4. Resiliência (Q-06) — `config/resilience.yaml`

```yaml
profiles:
  shopify_read:
    timeout_ms: 5000
    retries: 2
    backoff: exponential_jitter
    circuit: { failure_threshold: 5, window_s: 30, half_open_after_s: 60 }
    on_open: inform_cannot_verify          # § 17.1

  shopify_write:
    timeout_ms: 10000
    retries: 1                             # só com chave de idempotência
    circuit: { failure_threshold: 3, window_s: 60, half_open_after_s: 120 }
    on_open: block_and_escalate

  llm:
    timeout_ms: 30000
    retries: 2
    circuit: { failure_threshold: 3, window_s: 60, half_open_after_s: 60 }
    on_open: escalate_to_human             # ⭐ sem LLM, encaminha a pessoa

  supabase:
    timeout_ms: 3000
    retries: 2
    backoff: linear
    on_open: reject_turn                   # ⭐ nunca responder sem persistir

  meta_send:
    timeout_ms: 10000
    retries: 3
    backoff: exponential_jitter
    on_open: dead_letter
```

Valores propostos, aguardando **Q-06**. Nenhum é derivado de medição ainda — serão
revisados com dados reais na Fase 8.

---

## 5. Padrões de engenharia (§ 9.7)

| Requisito de § 9.7 | Implementação |
|---|---|
| Credenciais no Credential Store | Nenhum segredo em nó, em expressão ou no JSON exportado |
| Ambientes separados | Três projetos de n8n (dev/homolog/prod), com URLs e segredos distintos; proibido referência cruzada (teste de § 19.2.13) |
| IDs de correlação | `X-Request-Id` + `turn_id` propagados em todo nó e log |
| Tratamento central de erro | WF-11 como Error Workflow de todos os demais |
| Timeout e retry com backoff | `config/resilience.yaml`, espelhado nas configurações de nó |
| Idempotência | § 3 acima |
| Limites de execução e proteção contra loop | Teto de execução por workflow; `max_tool_calls_per_turn` no orquestrador; alerta de taxa anômala |
| Logs sem dado pessoal desnecessário | Nós logam `turn_id` e metadado; nunca conteúdo de mensagem |
| Exportação e versionamento | `n8n/scripts/export.sh` remove credencial; JSON em git; diff revisado em PR |
| Revisão antes de produção | Publicação em produção exige PR aprovado com o JSON exportado |

### Convenções

| Item | Convenção |
|---|---|
| Nome do workflow | `WF-NN <Nome em inglês> [env]` |
| Nome do nó | Verbo no imperativo: `Verify signature`, `Claim event` |
| Credencial | `atena-<serviço>-<env>` |
| Webhook path | `/atena/<env>/<canal>/<versão>` |
| Tag | `atena`, `critical` ou `scheduled`, `fase-N` |

---

## 6. O que explicitamente **não** é um workflow

| Tentação | Por que não |
|---|---|
| "WF de classificação de intenção" | Latência (salto extra) e a classificação é parte do turno |
| "WF de verificação de identidade" | Maior risco de GDPR; precisa de teste unitário e tipos |
| "WF de cálculo de orçamento" | § 8: bloqueado para automação. É pessoa, no painel |
| "WF de aprovação automática abaixo de X" | § 8.1 exige funcionário autenticado. Nenhuma alçada automática na v1 |
| "WF que edita o prompt da Atena" | ADR-010: prompt em git, com eval em CI |
| "WF com nó de SQL arbitrário" | § 16.3 proíbe execução arbitrária de SQL. Só rotas de API |

O último merece ênfase: um nó de Postgres com query montada por expressão no n8n
é, na prática, um bypass de toda a camada de autorização de `packages/policy` e
de `packages/data-access`. Deve ser proibido por convenção **e** detectado na
revisão do JSON exportado.
