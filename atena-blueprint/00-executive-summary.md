# 00 — Resumo executivo

## Veredito

**A arquitetura proposta no documento mestre é sólida e aprovada na sua essência.**
As quatro decisões estruturais mais importantes estão corretas e devem ser mantidas:

1. **Um agente central + oito Skills como módulos de instrução**, não oito agentes
   autônomos (§ 4.3). Correto. Reduz custo, latência, superfície de erro e
   dificuldade de teste em cerca de uma ordem de magnitude.
2. **O backend é a autoridade de autorização; o modelo nunca recebe credenciais**
   (§ 4.4, § 8). Correto e não negociável.
3. **Shopify é fonte da verdade comercial; nenhuma cópia é tratada como verdade**
   (§ 13.1, § 25.2). Correto.
4. **Human-in-the-loop obrigatório para orçamento personalizado, com aprovação
   vinculada à versão exata** (§ 8.1, § 25.3). Correto — e este blueprint propõe
   reforçá-lo (vínculo por *hash de conteúdo*, não por número de versão).

## As cinco correções que precisam da sua decisão

Não são ajustes cosméticos. Cada uma altera a forma do sistema.

| # | Correção | Por quê | ADR |
|---|---|---|---|
| **C1** | **Inverter o papel do n8n.** O documento coloca o n8n no caminho crítico de toda mensagem, inclusive validando autorização (§ 9.1, passo 11). Proposta: n8n faz *ingestão, agendamento e notificação*; o turno conversacional (contexto → LLM → ferramenta → autorização) vive em um serviço tipado (`agent-orchestrator`) chamado pelo n8n por **uma** chamada HTTP. | Autorização em nós de n8n não é testável em CI, não é versionável de forma revisável e contradiz § 4.4 ("Backend: validar autorização"). Latência e depuração também pioram. | ADR-002 |
| **C2** | **Não rotear por `confidence`.** O documento define roteamento por confiança do modelo (§ 6.2, § 6.3) e já admite que o número não é prova. Proposta: pré-classificadores determinísticos para intenções de risco (`human_request`, `refund_request`, pedido de desconto, número de pedido) + fallback de esclarecimento. `confidence` fica como telemetria. | Um número auto-reportado pelo LLM não pode ser o gate de uma decisão financeira ou de privacidade. | ADR-004 |
| **C3** | **RLS não protege o caminho conversacional.** Clientes de WhatsApp/Instagram não são usuários do Supabase Auth; não existe `auth.uid()` para eles. A § 10.6 é ambígua nisso. Proposta: RLS protege o caminho **staff/dashboard**; o isolamento entre clientes é garantido no orquestrador por *scoping* obrigatório de `customer_id` em toda query, com teste de segurança dedicado. | Se a equipe acreditar que o RLS protege o atendimento, o isolamento entre clientes fica sem dono. Este é o risco de vazamento nº 1. | ADR-006 |
| **C4** | **Aprovação vinculada a hash, não a número de versão.** § 10.3 vincula `quote_approvals` a `quote_version`. Proposta: `quotes` é *append-only* e a aprovação referencia `content_hash` (SHA-256 do escopo+preço+moeda+prazo+condições). Qualquer alteração produz hash novo e invalida a aprovação por construção, não por disciplina. | Vínculo por número depende de ninguém fazer `UPDATE` na linha. Vínculo por hash não depende de disciplina humana. | ADR-009 |
| **C5** | **Identidade de cliente é entidade de primeira classe.** O modelo de dados liga `customers` direto a `conversations`, sem camada de identidade. Um mesmo cliente chega por WhatsApp, Instagram, e-mail e Shopify com IDs diferentes. Proposta: tabela `channel_identities` e um processo explícito de *identity resolution* com estado `unverified`/`verified`. | Sem isso, ou fundimos clientes errados (vazamento de dados entre pessoas) ou duplicamos tudo. Afeta CRM, consulta de pedido e GDPR. | ADR-005 |

## O que está bloqueado agora

Cinco perguntas impedem a Fase 1. Detalhe e opções em `02-open-decisions.md`.

- **Q-00** — Repositório de destino do ATENA (a sessão atual aponta para um projeto Android sem relação).
- **Q-01** — Provedor e modelo de IA (§ 24 marca como A DEFINIR; afeta contrato de *structured output* e custo).
- **Q-02** — **Método de verificação de identidade do cliente** para consulta de pedido. Maior risco de GDPR do projeto. Proposta concreta em `07-security-and-permissions.md` § 2.3.
- **Q-03** — Hospedagem do `agent-orchestrator` e do painel (afeta rede, segredos, observabilidade).
- **Q-04** — Escopo de órteses/saúde na v1. Recomendação: **captar interesse e encaminhar, sem coletar nenhum dado clínico**, até haver DPIA.

## Dimensionamento

Estimativa de complexidade por fase, em *pontos de complexidade relativa* (não em
dias — prazo depende do tamanho do time, que não foi informado). Base: Fase 1 = 10.

| Fase | Entregável | Complexidade | Risco |
|---|---|---|---|
| 0 | Descoberta e decisões | 3 | Baixo (mas bloqueia tudo) |
| 1 | Core Atena + 8 Skills + simulação | 10 | Médio |
| 2 | Supabase, migrations, RLS, auditoria | 13 | Médio-alto |
| 3 | Shopify | 13 | **Alto** (dependência externa, plano da loja) |
| 4 | n8n WF-01..05 + auxiliares | 8 | Médio |
| 5 | WhatsApp + Instagram | 15 | **Alto** (review da Meta, prazo fora do nosso controle) |
| 6 | Projetos, arquivos, orçamentos, aprovação | 18 | **Alto** (núcleo de valor + núcleo de risco) |
| 7 | Painel administrativo | 21 | Médio (volume, não incerteza) |
| 8 | Piloto e produção | 8 | Médio |
| | **Total** | **109** | |

Observação honesta: a Fase 5 tem um prazo que não controlamos (revisão de app da
Meta) e a Fase 3 depende de capacidades da conta Shopify que ainda não foram
verificadas. Ambas devem começar a *descoberta* na Fase 0, em paralelo, mesmo que
a implementação venha depois.

## Caminho crítico recomendado

```
Fase 0 ──┬─► Fase 1 (Core + Skills, modo simulação) ──┐
         ├─► [paralelo] Descoberta Shopify: plano, escopos, API version
         └─► [paralelo] Descoberta Meta: elegibilidade, review, templates
                                                        │
Fase 2 (Dados/RLS) ◄────────────────────────────────────┘
   └─► Fase 3 (Shopify) ─► Fase 4 (n8n) ─► Fase 6 (Projetos) ─► Fase 7 (Painel)
                                              │
                           Fase 5 (Canais) ───┘
                                              └─► Fase 8 (Piloto)
```

A Fase 6 depende de 2 e 4, não de 5. **O produto tem valor interno antes de ter
canal público** — recomendo provar o fluxo de projeto/orçamento/aprovação com a
equipe usando o painel, antes de abrir WhatsApp.

## O que este blueprint deliberadamente não faz

- Não inventa catálogo, preço, estoque, prazo, política comercial ou dado legal da Five Lines.
- Não afirma que qualquer integração funciona — nenhuma foi executada.
- Não fixa versão de API da Shopify, OpenAI ou Meta sem consulta à documentação atual no momento da implementação.
- Não escreve migrations, código de produção ou workflows executáveis. Isso é Fase 1+, após sua aprovação.
