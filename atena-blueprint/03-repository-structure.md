# 03 — Estrutura do repositório

Responde ao pedido **(3) Defina a estrutura completa do repositório**.

Base: § 22 do documento mestre, refinada com as decisões de `02-open-decisions.md`.
Princípio de § 22 respeitado: **nenhum diretório vazio para preencher estrutura** —
cada um tem propósito declarado e um `README.md` próprio.

---

## 1. Decisão: monorepo (ADR-001)

| Critério | Monorepo | Multi-repo |
|---|---|---|
| Schemas compartilhados (Zod) entre orquestrador, API e painel | Uma fonte, mudança atômica | Pacote publicado, versionamento, drift |
| Mudança que atravessa fronteira (novo campo em orçamento = migration + API + painel + Skill) | Um PR, revisável como unidade | 4 PRs coordenados |
| CI | Um pipeline, grafo de tarefas, cache | 4 pipelines |
| Risco de acoplamento indevido | Real — mitigado por `eslint-plugin-boundaries` | Naturalmente baixo |
| Clone/CI inicial | Mais lento | Mais rápido |

**Decisão: monorepo.** O argumento decisivo é o segundo: o fluxo de orçamento
atravessa banco, API, Skill e painel. Em multi-repo, uma mudança nesse fluxo é
uma coordenação de quatro repositórios, e é exatamente onde mora o risco
financeiro do projeto (ADR-009).

**Ferramentas:** pnpm workspaces + Turborepo. TypeScript estrito em todo o stack
(ADR-013).

---

## 2. Árvore completa

```text
atena-five-lines/
├── README.md                        Visão, setup local, mapa do repositório
├── LICENSE
├── CONTRIBUTING.md                  Fluxo de PR, convenção de commit, gates obrigatórios
├── SECURITY.md                      Reporte de vulnerabilidade, contato, escopo
├── .gitignore                       Inclui .env*, !.env.example, exports de n8n com credencial
├── .env.example                     § 23, só nomes de variável, nenhum valor
├── .nvmrc
├── package.json                     Raiz do workspace; scripts agregados
├── pnpm-workspace.yaml
├── turbo.json                       Grafo de build/test/lint com cache
├── tsconfig.base.json               Estrito: strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes
├── .editorconfig
├── commitlint.config.cjs
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                   lint · typecheck · unit · contract · build
│   │   ├── security.yml             varredura de segredo · SAST · audit de dependência
│   │   ├── eval.yml                 harness conversacional (golden set PT/EN)
│   │   ├── db-migrate-check.yml     migration aplica e reverte em banco efêmero
│   │   └── deploy-staging.yml       após aprovação
│   ├── CODEOWNERS                   database/, prompts/, policy/ exigem revisor específico
│   └── pull_request_template.md     Checklist da Definition of Done (§ 27)
│
├── docs/
│   ├── README.md                    Índice da documentação
│   ├── product-requirements.md      Derivado do documento mestre; rastreia requisito → implementação
│   ├── architecture.md              Diagramas vivos (Mermaid), fronteira de confiança
│   ├── security-and-privacy.md      Modelo de ameaça, GDPR, ROPA, retenção, DSR
│   ├── data-model.md                ER, dicionário de dados, máquinas de estado
│   ├── integrations.md              Shopify, Meta, n8n: escopos, versões, limites, modos de falha
│   ├── operations-runbook.md        Plantão: sintoma → diagnóstico → ação; rollback; restauração
│   ├── observability.md             Logs, métricas, traces, alertas, painéis
│   ├── cost-model.md                § 25.6: tokens, execuções, storage, mensagens
│   ├── glossary.md                  Apêndice A
│   └── decisions/
│       ├── README.md                Processo de ADR e template
│       └── NNNN-titulo.md           Um arquivo por ADR
│
├── prompts/                         ⚠️ CODEOWNERS: revisão obrigatória
│   ├── README.md                    Convenção, versionamento, como testar localmente
│   ├── system/
│   │   ├── atena-core.md            Prompt central: identidade, idioma, precedência, limites
│   │   └── guardrails.md            Fragmento compartilhado: injection, segredo, escopo negado
│   ├── skills/
│   │   ├── _manifest.schema.json    Schema do manifesto de Skill (ver 06 § 2)
│   │   ├── registry.yaml            Registro: Skill → intenções → ferramentas permitidas
│   │   ├── 01-customer-service/     SKILL.md + manifest.yaml + eval.yaml
│   │   ├── 02-sales-intelligence/
│   │   ├── 03-product-specialist/
│   │   ├── 04-custom-projects/
│   │   ├── 05-order-management/
│   │   ├── 06-customer-success/
│   │   ├── 07-engineering-assistant/
│   │   └── 08-business-intelligence/
│   └── fragments/
│       ├── language-policy.md       § 3.2
│       ├── uncertainty-policy.md    § 3.5
│       └── escalation-policy.md     § 6.3
│
├── config/                          Configuração como dado, versionada e testada
│   ├── README.md
│   ├── authorization-matrix.yaml    § 8 como dado → avaliada pelo Policy Engine
│   ├── intent-rules/
│   │   ├── pt-BR.yaml               Pré-classificadores determinísticos (ADR-004)
│   │   └── en.yaml
│   ├── retention-policy.yaml        Prazo por entidade (aguarda Q-13)
│   ├── file-policy.yaml             Extensões, MIME, tamanho máximo (§ 12.2, § 12.3)
│   ├── egress-filters.yaml          Padrões proibidos na saída ao cliente
│   └── resilience.yaml              Timeout, retry, circuit breaker por integração (Q-06)
│
├── packages/                        Bibliotecas internas, sem efeito colateral
│   ├── schemas/                     ⭐ Fonte única de contrato (ADR-014)
│   │   ├── src/inbound-message.ts   Zod → JSON Schema
│   │   ├── src/agent-response.ts
│   │   ├── src/tool-envelope.ts     § 7.6
│   │   ├── src/tool-contracts/      Um arquivo por ferramenta: args + result
│   │   ├── src/domain/              Entidades, enums, máquinas de estado
│   │   └── src/generated/           JSON Schemas derivados (gerados, commitados)
│   ├── data-access/                 ⭐ Única porta para o banco (ADR-006)
│   │   ├── src/repositories/        Exigem CustomerScope ou StaffScope no construtor
│   │   ├── src/scope.ts             Tipos que tornam query sem escopo inexpressável
│   │   └── src/audit.ts             Escrita em agent_actions, não opcional
│   ├── policy/                      ⭐ Policy Engine
│   │   ├── src/evaluate.ts          (papel, operação, contexto) → allow | deny | needs_approval
│   │   └── src/__tests__/           Teste por célula da matriz de § 8
│   ├── llm/                         Porta ModelProvider + adaptadores (ADR-003)
│   ├── tools/                       Implementação das ferramentas de § 7
│   │   ├── src/registry.ts          Catálogo; allowlist por Skill aplicada aqui
│   │   ├── src/shopify/
│   │   ├── src/crm/
│   │   ├── src/projects/
│   │   ├── src/support/
│   │   └── src/admin/
│   ├── integrations/                Clientes HTTP: Shopify, Meta. Retry, rate limit, circuit breaker
│   ├── observability/               Logger estruturado, tracing, métricas, redação de PII
│   ├── knowledge/                   Indexação e busca na KB (FTS; pgvector futuro)
│   └── testing/                     Fixtures, factories, matchers, servidores de contrato falsos
│
├── services/
│   ├── agent-orchestrator/          ⭐ Núcleo: POST /v1/turns
│   │   ├── src/turn/                Pipeline: identidade → contexto → rota → Skill → ferramenta → egresso
│   │   ├── src/http/                Rotas, autenticação HMAC do n8n, idempotência
│   │   └── README.md
│   ├── api/                         REST do painel: aprovações, CRM, relatórios, DSR
│   │   ├── src/routes/
│   │   ├── src/auth/                Verificação de JWT do Supabase + RBAC
│   │   └── README.md
│   └── worker/                      Tarefas assíncronas: indexação da KB, expurgo de retenção, reprocessamento de DLQ
│
├── apps/
│   └── admin-dashboard/             Next.js (§ 15)
│       ├── app/(auth)/
│       ├── app/(dashboard)/         15 módulos de § 15.2
│       ├── components/
│       ├── lib/supabase/            Cliente com Auth do usuário — nunca service_role
│       └── README.md
│
├── database/
│   ├── README.md                    Como criar banco local, aplicar e reverter migration
│   ├── migrations/                  Sequenciais, com reversão; nunca editadas após merge
│   ├── policies/                    Políticas de RLS, por tabela, com teste associado
│   ├── functions/                   Funções/views server-side; métricas determinísticas (ADR-008)
│   ├── triggers/                    Imutabilidade de orçamento, auditoria, content_hash
│   ├── seed/
│   │   ├── dev/                     Dados sintéticos. ⚠️ Nunca em produção (§ 28.2)
│   │   └── reference/               Enums, categorias, papéis
│   └── tests/                       pgTAP: RLS, triggers, constraints
│
├── n8n/
│   ├── README.md                    Convenção de nome, ambientes, publicação
│   ├── credentials-guide.md         Quais credenciais, onde ficam. ⚠️ Sem valores
│   ├── workflows/
│   │   ├── WF-01-incoming-message.json
│   │   ├── WF-01b-outgoing-message.json
│   │   ├── WF-02-product-sales.json
│   │   ├── WF-03-custom-project.json
│   │   ├── WF-04-order-after-sales.json
│   │   ├── WF-05-management-reports.json
│   │   ├── WF-06-human-approval.json
│   │   ├── WF-07-quote-status-update.json
│   │   ├── WF-08-customer-follow-up.json
│   │   ├── WF-09-inventory-alert.json
│   │   ├── WF-10-daily-report.json
│   │   ├── WF-11-error-dlq.json
│   │   └── WF-12-retention-privacy.json
│   └── scripts/
│       ├── export.sh                Exporta e remove credencial antes de commitar
│       └── import.sh
│
├── schemas/                         JSON Schemas públicos (gerados de packages/schemas)
│   ├── README.md                    ⚠️ Gerado. Não editar à mão
│   ├── incoming-message.schema.json
│   ├── agent-response.schema.json
│   ├── tool-result.schema.json
│   └── project-request.schema.json
│
├── tests/
│   ├── README.md                    Pirâmide, o que vai em cada nível, como rodar
│   ├── contract/                    Saída do LLM vs. schema; envelope de ferramenta
│   ├── integration/                 Contra loja de dev Shopify e Supabase efêmero
│   ├── security/                    ⭐ § 19.2 — 13 cenários, cada um um teste
│   │   ├── cross-customer-access.spec.ts
│   │   ├── prompt-injection.spec.ts
│   │   ├── self-approval.spec.ts
│   │   ├── file-upload.spec.ts
│   │   ├── secret-exfiltration.spec.ts
│   │   └── webhook-replay.spec.ts
│   ├── acceptance/                  § 19.1 — 18 cenários
│   ├── eval/                        ⭐ Harness conversacional
│   │   ├── golden-set/pt-BR/
│   │   ├── golden-set/en/
│   │   ├── assertions/              "não inventou preço", "consultou Shopify", "escalou"
│   │   └── report/
│   └── load/                        Latência vs. orçamento de § 2.3 (Q-05)
│
└── scripts/
    ├── bootstrap.sh                 Setup local completo
    ├── check-secrets.sh             Pré-commit
    ├── gen-schemas.ts               Zod → JSON Schema
    └── verify-env.ts                Valida .env contra o esquema esperado
```

---

## 3. Fronteiras de dependência (aplicadas por lint)

Acoplamento indevido é o risco real do monorepo. Regra, verificada no CI por
`eslint-plugin-boundaries`:

```
apps/*            → packages/schemas, packages/observability
                    (❌ nunca packages/data-access, nunca packages/policy)
services/api      → packages/{schemas,data-access,policy,integrations,observability}
services/agent-*  → packages/* (todos)
packages/tools    → packages/{schemas,data-access,policy,integrations,observability}
packages/policy   → packages/schemas            (puro, sem I/O)
packages/schemas  → (nenhuma dependência interna)
packages/data-access → packages/{schemas,observability}
```

Três regras não negociáveis:

1. **O painel nunca importa `data-access`.** Se o painel puder montar query,
   o perímetro de RLS de ADR-006 vira decoração.
2. **`packages/policy` é puro.** Sem I/O, sem banco, sem rede. Isso permite
   testar cada célula da matriz de § 8 como teste unitário rápido — requisito
   de § 19.3 ("todas as operações críticas terem testes de autorização").
3. **`packages/schemas` não depende de nada interno.** É a raiz do grafo.

---

## 4. Diretórios que exigem revisor designado (CODEOWNERS)

| Caminho | Por quê |
|---|---|
| `database/migrations/`, `database/policies/`, `database/triggers/` | Mudança irreversível em produção; RLS e imutabilidade de orçamento moram aqui |
| `config/authorization-matrix.yaml` | É a matriz de § 8. Mudança aqui é mudança de permissão |
| `prompts/` | Comportamento visível ao cliente e superfície de injection |
| `packages/policy/`, `packages/data-access/` | Fronteira de autorização e de isolamento de cliente |
| `.github/workflows/` | Quem controla o CI controla os gates |

---

## 5. Variáveis de ambiente

§ 23 do documento mestre é a base. Adições necessárias pelas decisões deste blueprint:

```dotenv
# ── Já em § 23 do documento mestre ──
NODE_ENV=
APP_BASE_URL=
OPENAI_API_KEY=                      # nome dependente de Q-01
OPENAI_MODEL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=           # ⚠️ só no agent-orchestrator e services/api
SHOPIFY_STORE_DOMAIN=
SHOPIFY_CLIENT_ID=
SHOPIFY_CLIENT_SECRET=
SHOPIFY_API_VERSION=
META_APP_ID=
META_APP_SECRET=
META_VERIFY_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
INSTAGRAM_ACCOUNT_ID=
N8N_BASE_URL=
N8N_WEBHOOK_SECRET=
SIGNED_URL_TTL_SECONDS=
LOG_LEVEL=

# ── Adições deste blueprint ──
# Autenticação n8n → orquestrador (ADR-002)
ORCHESTRATOR_INBOUND_HMAC_SECRET=
ORCHESTRATOR_INBOUND_MAX_SKEW_SECONDS=

# Resiliência (Q-06) — valores vêm de config/resilience.yaml; env só sobrepõe
RESILIENCE_PROFILE=

# Verificação de identidade (Q-02)
IDENTITY_OTP_TTL_SECONDS=
IDENTITY_OTP_MAX_ATTEMPTS=
IDENTITY_OTP_SENDER_DOMAIN=          # aguarda Q-15

# Observabilidade (Q-03)
OTEL_EXPORTER_OTLP_ENDPOINT=
OTEL_SERVICE_NAME=

# Controle de custo (Q-20)
LLM_MAX_TOKENS_PER_TURN=
LLM_MONTHLY_BUDGET_ALERT_EUR=

# Storage
STORAGE_BUCKET_PROJECT_FILES=
STORAGE_MAX_FILE_BYTES=

# Flags de escopo
FEATURE_HEALTH_INTAKE_ENABLED=false  # Q-04: permanece false até DPIA
FEATURE_CHECKOUT_ENABLED=false       # Fase 3
FEATURE_INSTAGRAM_ENABLED=false      # Fase 5
```

Regras (§ 23, § 16.4): `service_role` só em ambiente server-side; `.env` real
nunca compartilhado em contexto não confiável; nenhum token em `.md`; segredos no
secret manager do provedor e no Credential Store do n8n. `scripts/verify-env.ts`
falha o boot se uma variável obrigatória estiver ausente — nenhum valor padrão
silencioso para segredo.

---

## 6. Convenção de nomes

| Elemento | Convenção | Exemplo |
|---|---|---|
| Arquivo TS | kebab-case | `quote-approval.repository.ts` |
| Tipo/Classe | PascalCase | `QuoteApproval` |
| Tabela | snake_case plural | `quote_approvals` |
| Coluna | snake_case | `approved_content_hash` |
| Enum em banco | snake_case singular | `project_status` |
| Ferramenta | snake_case verbo-objeto (§ 7) | `submit_quote_for_approval` |
| Workflow n8n | `WF-NN-kebab-case` | `WF-06-human-approval` |
| Migration | `NNNN_descricao.sql` | `0007_quote_immutability.sql` |
| ADR | `NNNN-titulo-kebab.md` | `0009-quote-content-hash.md` |
| Branch | `tipo/escopo-curto` | `feat/quote-approval-flow` |
| Commit | Conventional Commits | `feat(quotes): bind approval to content hash` |
