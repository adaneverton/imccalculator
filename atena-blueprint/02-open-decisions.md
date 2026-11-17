# 02 — Decisões pendentes e perguntas bloqueadoras

Responde ao pedido **(2) Identifique decisões técnicas pendentes**.

Organizado em três níveis:
- **§ 1 — Perguntas bloqueadoras.** Impedem iniciar a fase indicada. Precisam da sua resposta.
- **§ 2 — Decisões técnicas com recomendação.** Posso decidir se você delegar; estão registradas como ADR.
- **§ 3 — Pendências de negócio.** São as de § 24 do documento mestre, com o **impacto técnico** anotado — o que muda no código em cada caso.

Nenhum item foi preenchido por suposição (§ 0.2.4).

---

## 1. Perguntas bloqueadoras

### Q-00 — Onde vive o repositório do ATENA? 🔴 bloqueia Fase 0

Esta sessão está apontada para `adaneverton/imccalculator`, um aplicativo Android
de cálculo de IMC. Não commitei nada lá. O ATENA precisa de repositório próprio.

| Opção | Consequência |
|---|---|
| **A (recomendada)** — novo repositório `atena-five-lines`, monorepo | Estrutura limpa, CI próprio, histórico próprio. Requer que você crie o repositório ou autorize a criação. |
| B — subdiretório em `imccalculator` | Não recomendo: CI, dependências, `.gitignore` e histórico incompatíveis (Gradle/Kotlin vs Node/TS). |
| C — manter o blueprint só como documento, fora de git, por ora | Aceitável para a fase de revisão; decide-se antes da Fase 1. |

**Preciso saber:** qual opção, e se devo criar o repositório ou você cria.

---

### Q-01 — Provedor e modelo de IA 🔴 bloqueia Fase 1

§ 21 recomenda OpenAI API; § 24 marca como **A DEFINIR**.

Não vou escolher por você, mas a decisão tem consequências técnicas concretas:

| Requisito do projeto | Por que importa |
|---|---|
| **Tool calling** com múltiplas ferramentas por turno | Núcleo do desenho (§ 7). Qualquer candidato sério atende. |
| **Structured output com JSON Schema estrito** | § 6.2 exige saída validada. Modo estrito (schema garantido) vs. "melhor esforço" muda a quantidade de código de validação e de retry. |
| **Prompt caching** | O prefixo (core + Skill + catálogo de ferramentas) é grande e repetido. Sem cache, custo e p95 sobem muito (§ 2.3 de `01`). |
| **Residência de dados UE** | § 16.2: Irlanda/UE. Transferência internacional precisa de base legal. Isso pode ser o critério decisivo. |
| **DPA assinável** | § 16.2 exige acordo com operadores. |
| **Qualidade em português** | § 3.2: PT-BR e EN com paridade. Precisa ser medido, não presumido. |

**Recomendação de processo, não de fornecedor:** escolher **dois** candidatos e
rodá-los contra o mesmo *golden set* de ~60 conversas PT/EN (§ 4.3 de `09`) antes
de fixar. O custo desse teste é baixo e a decisão fica baseada em medição, não em
reputação.

**Mitigação para não bloquear:** porta `ModelProvider` (ADR-003) permite começar a
Fase 1 com um provedor e trocar sem reescrever as Skills.

**Preciso saber:** (a) quais candidatos estão aceitáveis comercialmente;
(b) se residência UE é requisito rígido; (c) se autoriza o bake-off.

---

### Q-02 — Método de verificação de identidade do cliente 🔴 bloqueia Fase 3

§ 13.3 diz "validar identidade conforme método aprovado" e § 24 marca o método
como **A DEFINIR**. Este é **o maior risco de GDPR do projeto**: é o ponto onde
um erro expõe endereço, histórico de compra e valor gasto de uma pessoa a outra.

Proposta completa em `07-security-and-permissions.md` § 2.3. Resumo das opções:

| Nível | Mecanismo | Libera | Risco residual |
|---|---|---|---|
| **N0** — nenhum | — | Nada de pessoal. Só catálogo, preço, estoque, informação institucional. | Nenhum. |
| **N1** — correspondência fraca | Nº de pedido **+** um de (e-mail, CEP/Eircode) que confira com o pedido | Status do pedido, se há rastreio. **Sem endereço, sem valor, sem itens.** | Quem tem o nº do pedido e o e-mail. Aceitável para dado de baixa sensibilidade. |
| **N2** — código de uso único | Código de 6 dígitos enviado ao e-mail/telefone **do pedido**, validade curta, tentativas limitadas | Itens, valor, rastreio completo, histórico, abertura de chamado com dados | Padrão da indústria. |
| **N3** — sessão autenticada | Login na Shopify / conta do cliente | Alteração de dado pessoal, endereço | Mais alto, mais fricção. |

**Recomendação:** N1 para status simples, **N2 obrigatório** para qualquer dado
além de status, N3 para qualquer alteração. Nunca divulgar endereço completo em
canal de mensagem (§ 13.3 já pede isso).

**Preciso saber:** aprovação dos níveis e, principalmente, se **N2 pode enviar
código por e-mail/SMS** — isso exige um canal de envio configurado e consentimento.

---

### Q-03 — Hospedagem e topologia de rede 🔴 bloqueia Fase 1

Não há menção em § 21 além de "API server-side/serviços".

| Precisa ser decidido | Por quê |
|---|---|
| Onde roda o `agent-orchestrator` | Determina gestão de segredos, rede, logs, custo |
| Região | § 16.2 (UE/Irlanda). Recomendo região da UE para tudo. |
| Onde roda o painel Next.js | Pode ser o mesmo provedor |
| Como o n8n Cloud alcança o orquestrador | Se o orquestrador for privado, precisa de endpoint autenticado exposto; proposta: HMAC + allowlist de IP de saída do n8n |
| Segredos | n8n Credential Store + secret manager do provedor (§ 16.4) |

**Recomendação:** região UE; orquestrador e API como serviços gerenciados de
contêiner; painel no provedor com melhor integração Next.js; HMAC assinado entre
n8n e orquestrador, com janela de tempo e nonce.

**Preciso saber:** provedores já contratados pela Five Lines (evita somar fornecedor).

---

### Q-04 — Escopo de órteses e saúde na v1 🔴 bloqueia Fase 6

§ 2.5 e § 12.6 tratam órteses como parte do Pilar 5; § 12.6 proíbe qualquer ato
clínico e exige "análise específica de GDPR, dados de categoria especial,
MDR/legislação aplicável, gestão de risco, validação clínica".

O conflito técnico: **qualquer** coleta de informação sobre a condição física de
uma pessoa é dado de categoria especial (GDPR art. 9) e muda o regime de proteção
de todo o sistema — cifragem, retenção, DPIA, acordos, logs.

| Opção | Impacto técnico |
|---|---|
| **A (recomendada)** — v1 capta interesse e encaminha a humano. Zero dado clínico, zero imagem médica, zero medida corporal. | Nenhum requisito adicional. Uma regra de roteamento e um bloqueio de upload por categoria. |
| B — v1 coleta dado administrativo não clínico (nome, contato, "tenho interesse em órtese") | Baixo impacto, mas exige vigilância: o cliente *vai* enviar informação clínica espontaneamente. Precisa de detecção e descarte, o que é frágil. |
| C — v1 coleta dado clínico | Requer DPIA, cifragem em nível de campo, retenção própria, trilha de acesso reforçada, avaliação MDR. **Adiciona uma fase inteira.** |

**Recomendação forte: opção A.** E, mesmo em A, o sistema precisa de um caminho de
descarte para quando o cliente enviar informação clínica sem ser solicitada —
porque vai acontecer.

**Preciso saber:** opção escolhida, e se há profissional habilitado designado para
receber esses encaminhamentos (§ 12.6 exige).

---

### Q-05 — SLA técnico de resposta 🟡 bloqueia Fase 4

O documento define SLA de atendimento (§ 24) mas não SLA técnico. Proposta em
`01-architecture-validation.md` § 2.3: p50 ≈ 3 s, p95 ≈ 8 s até mensagem visível,
com reconhecimento automático acima de 8 s.

**Preciso saber:** aprovação dos alvos, ou alvos diferentes. Afeta decisão de
uma vs. duas chamadas de LLM e necessidade de streaming.

---

### Q-06 — Política de retry, timeout e circuit breaker 🟡 bloqueia Fase 3

§ 17.1 diz "tentar novamente apenas conforme política de retry" — a política não
existe. Proposta em `08-n8n-workflows.md` § 4. Resumo:

| Integração | Timeout | Retries | Backoff | Circuit breaker |
|---|---|---|---|---|
| Shopify (leitura) | 5 s | 2 | exponencial + jitter | abre em 5 falhas/30 s, meio-aberto em 60 s |
| Shopify (escrita) | 10 s | 1, só com chave de idempotência | — | igual |
| LLM | 30 s | 2 | exponencial | abre em 3 falhas/60 s → escalona a humano |
| Supabase | 3 s | 2 | linear | abre → recusa turno |
| Meta (envio) | 10 s | 3 | exponencial | → DLQ |

**Preciso saber:** aprovação, ou restrições de custo que mudem os números.

---

### Q-07 — Conteúdo de mensagem em repouso 🟡 bloqueia Fase 2

§ 10.3 diz `content` "ou referência segura", sem decidir. § 16.2 exige retenção
definida.

| Opção | Prós | Contras |
|---|---|---|
| **A (recomendada)** — texto em claro no Postgres, cifrado em disco pelo Supabase, acesso por RLS, retenção por política | Simples; busca e painel funcionam; auditoria legível | Quem tem acesso ao banco lê conversas |
| B — cifragem em nível de coluna, chave em KMS | Protege contra acesso ao banco | Painel precisa descifrar; busca textual quebra; complexidade alta |
| C — pseudonimização (conteúdo separado dos identificadores) | Bom meio-termo para análise | Dois lugares para manter consistentes |

**Recomendação: A**, com retenção agressiva (**Q-13**) e acesso restrito por papel.
B só se a DPIA exigir.

**Preciso saber:** aprovação, e prazo de retenção de conversa (também em § 24).

---

## 2. Decisões técnicas com recomendação

Posso executar estas sem nova consulta, se você aprovar o blueprint como um todo.
Cada uma tem ADR em `decisions/adr-log.md`.

| ID | Decisão | Recomendação | ADR |
|---|---|---|---|
| D-01 | Monorepo vs. multi-repo | **Monorepo** (pnpm workspaces + Turborepo). Schemas compartilhados entre orquestrador, API e painel são o argumento decisivo. | ADR-001 |
| D-02 | Fronteira n8n / orquestrador | n8n = ingestão, agendamento, notificação. Orquestrador = turno conversacional. | ADR-002 |
| D-03 | Abstração de provedor de LLM | Porta `ModelProvider` com adaptadores. Não bloqueia Q-01. | ADR-003 |
| D-04 | Roteamento de intenção | Determinístico para risco + LLM para o resto. `confidence` só como telemetria. | ADR-004 |
| D-05 | Modelo de identidade | `channel_identities` com `verification_status`. | ADR-005 |
| D-06 | Perímetros de segurança | RLS para staff; scoping no orquestrador para cliente. | ADR-006 |
| D-07 | Acesso a dados pelo painel | Leitura via Supabase Auth+RLS; escrita privilegiada via `services/api`. Nunca `service_role` no painel. | ADR-007 |
| D-08 | Cálculo de métricas | SQL determinístico (views/functions); LLM apenas narra números já calculados. | ADR-008 |
| D-09 | Imutabilidade de orçamento | `quotes` append-only + `content_hash` + FK composta na aprovação. | ADR-009 |
| D-10 | Versionamento de prompt | Prompts em git, com `prompt_version` registrado em cada `agent_actions`. Rollback = deploy. | ADR-010 |
| D-11 | Busca na KB | Postgres FTS na v1; `pgvector` só com volume comprovado. | ADR-011 |
| D-12 | Tratamento de arquivo de cliente | Armazenar, hashear, nunca parsear na v1. Sem render de PDF, sem leitura de malha. | ADR-012 |
| D-13 | Linguagem e runtime | TypeScript estrito em todo o stack (orquestrador, API, painel). Um só ecossistema de tipos e schemas. | ADR-013 |
| D-14 | Validação de schema | Zod como fonte única; JSON Schema derivado para o LLM e para contratos de ferramenta. | ADR-014 |

---

## 3. Pendências de negócio e seu impacto técnico

As 20 pendências de § 24, com a coluna que faltava: **o que muda no código**.
Não preenchi nenhuma.

| Item (§ 24) | Impacto técnico se ficar indefinido | Bloqueia |
|---|---|---|
| Razão social, endereço, contatos oficiais | Core responde "não tenho essa informação" a uma pergunta trivial e frequente. Péssima primeira impressão. | Fase 8 |
| Política de devolução | KB vazia → encaminhamento humano em caso comum. Volume de escalonamento alto. | Fase 8 |
| Política de reembolso | § 1.5 já bloqueia a ação; sem a política, não há nem o que explicar. | Fase 8 |
| Política de frete (países, custos) | `get_shipping_options` não tem o que retornar; cliente não conclui compra. | **Fase 3** |
| Prazo padrão de produção por categoria | Atena não pode responder "quando chega" em produto personalizado — a pergunta nº 1 do pilar Customization. | Fase 6 |
| Prazo de envio por região | Idem, para catálogo. | Fase 3 |
| Horário de atendimento humano | `escalate_to_human` não sabe o que prometer; risco de prometer resposta fora de expediente. | **Fase 1** |
| Idiomas finais | PT/EN confirmados é suficiente para v1. | — |
| Limite de estoque baixo | WF-09 (alerta) não tem gatilho. | Fase 4 |
| Descontos permitidos | § 1.5 bloqueia a concessão; sem a regra, não há caminho de exceção nem para humano. | Fase 6 |
| Aprovadores de orçamento (quem) | **`staff_users` não pode ser semeado.** O fluxo de aprovação não roda. | **Fase 6** |
| CRM definitivo | Recomendação Supabase aceita → desbloqueado. | — |
| Painel administrativo | Recomendação Next.js aceita → desbloqueado. | — |
| Provedor/modelo de IA | **Q-01**. | **Fase 1** |
| Método de autenticação do cliente | **Q-02**. | **Fase 3** |
| Retenção de conversas | Migration não pode definir política de expurgo; WF-12 não existe. **Q-13.** | **Fase 2** |
| Retenção de arquivos CAD | Idem, com agravante de propriedade intelectual do cliente (§ 25.5). | **Fase 6** |
| Consentimento de marketing | `consent_records` sem semântica; follow-up proativo não pode ser enviado. | Fase 5 |
| SLA de atendimento | KPIs de § 18.1 sem alvo; dashboard mostra número sem referência. | Fase 7 |
| Moeda e países de operação | Afeta formatação, `get_shipping_options`, imposto. Não está em § 24, mas falta. **Q-14.** | **Fase 3** |

### Pendências adicionais que faltam em § 24

| ID | Pendência | Por que importa |
|---|---|---|
| **Q-13** | Prazo concreto de retenção: conversa, mensagem, arquivo, log de auditoria, dado de lead | Sem número, não há migration de retenção nem WF-12. GDPR exige prazo definido, não "o necessário". |
| **Q-14** | Moeda(s) e países de operação | Afeta `get_product_price`, `get_shipping_options`, formatação em PT/EN, imposto. |
| **Q-15** | Nome e domínio oficiais para e-mail transacional (código de verificação, orçamento) | Q-02 nível N2 depende de um remetente autenticado (SPF/DKIM/DMARC). |
| **Q-16** | Quem é o controlador de dados e há DPO designado? | § 16.2 pede identificar controlador; afeta aviso de privacidade e DSR. |
| **Q-17** | Existe loja de desenvolvimento Shopify e app privado/custom criado? | Pré-requisito da Fase 3. Não presumir (§ 7.1). |
| **Q-18** | A conta WhatsApp Business já existe e está verificada? Tipo de conta Instagram? | Pré-requisito da Fase 5; prazo fora do nosso controle. |
| **Q-19** | Tamanho do time de desenvolvimento e de operação | Sem isso, a estimativa em pontos (§ `00`) não vira cronograma. |
| **Q-20** | Orçamento mensal máximo para LLM + n8n + hospedagem | § 25.6 pede monitorar custo; monitorar contra qual teto? |
| **Q-21** | Existe **alçada por valor** na aprovação de orçamento? (ex.: `sales_manager` até X; acima de X exige `owner`) | A estrutura existe (`staff_users.approval_limit_amount`), mas o valor é decisão de negócio. Sem ela, qualquer aprovador aprova qualquer valor. Ver `07` § 3.3 |

---

## 4. Resumo: o que preciso de você para começar

**Para iniciar a Fase 0** (descoberta, sem código):
- Q-00 (repositório)
- Q-17, Q-18 (existem as contas Shopify/Meta?)
- Q-19 (tamanho do time)

**Para iniciar a Fase 1** (Core + Skills, modo simulação):
- Q-01 (provedor de IA — ou autorização para o bake-off)
- Q-03 (hospedagem)
- Horário de atendimento humano (§ 24)
- Aprovação dos ADR-001 a 014

**Para iniciar a Fase 2** (dados):
- Q-07 (conteúdo em repouso), Q-13 (retenção)

**Para iniciar a Fase 3** (Shopify):
- Q-02 (identidade), Q-06 (retry), Q-14 (moeda/países), política de frete

**Para iniciar a Fase 6** (projetos e aprovações):
- Q-04 (saúde/órteses), Q-21 (alçada), aprovadores de orçamento, retenção de arquivo CAD
