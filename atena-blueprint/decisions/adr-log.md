# ADR-001 a ADR-014 — registro consolidado

Todos no estado **Proposto**, data 2026-11-17, aguardando aprovação.
Referências `§` são ao documento mestre `ATENA_Five_Lines_AI_Ecosystem_v1.0.md`.

---

# ADR-001 — Monorepo

**Requisito:** § 22.

## Contexto
O sistema tem seis artefatos implantáveis (orquestrador, API, painel, banco,
workflows de n8n, pacote de prompts) que compartilham contratos. Uma mudança no
fluxo de orçamento toca banco, API, Skill e painel ao mesmo tempo.

## Decisão
Monorepo único `atena-five-lines`, com pnpm workspaces e Turborepo. Fronteiras de
dependência aplicadas por `eslint-plugin-boundaries` no CI.

## Alternativas
- **Multi-repo:** rejeitado. Uma mudança no fluxo de orçamento viraria quatro PRs
  coordenados, exatamente onde mora o risco financeiro do projeto (ADR-009).
- **Monorepo sem ferramenta de build:** rejeitado. Sem grafo de tarefas e cache,
  o CI fica lento e a disciplina de fronteira não é verificável.

## Consequências
(+) Mudança atravessando camadas é um PR revisável como unidade.
(+) Uma fonte de schemas; nenhum drift de versão.
(−) Clone e CI inicial maiores.
(−) Acoplamento indevido é possível — por isso a regra de lint é obrigatória, não opcional.

## Verificação
CI falha se um pacote importar fora do grafo declarado em `03-repository-structure.md` § 3.

---

# ADR-002 — Fronteira entre n8n e orquestrador  ⚠️ CORREÇÃO C1

**Requisito:** § 4.3, § 4.4, § 9.1, § 19.3.

## Contexto
§ 9.1 descreve o WF-01 como 17 passos no n8n, incluindo validar saída estruturada
(passo 10), validar autorização (passo 11) e executar ferramenta (passo 12). Isso
contradiz a tabela de § 4.4, que atribui ao backend "validar autorização, esquema,
identidade e regras", e torna inviável § 19.3 ("todas as operações críticas terem
testes de autorização"): lógica em nós visuais de n8n não tem teste unitário nem
diff revisável.

## Decisão
- **n8n:** ingestão (webhook, assinatura, deduplicação, normalização), egresso
  (envio pelo canal), agendados, notificações, DLQ.
- **`agent-orchestrator`:** o turno conversacional inteiro — identidade, contexto,
  roteamento, LLM, seleção e execução de ferramenta, autorização, filtro de egresso.
- Interface: **uma** chamada `POST /v1/turns`, autenticada por HMAC + timestamp + nonce.
- Proibido no n8n: nó de SQL arbitrário e qualquer condicional sobre permissão.

## Alternativas
- **Desenho literal de § 9.1:** rejeitado pelos motivos acima. Se mantido, o WF-01
  teria de chamar `POST /v1/authorize` para toda ação, e os nós não poderiam conter
  nenhuma lógica de permissão — mais frágil, mas auditável. Fica como alternativa
  se o responsável discordar.
- **Eliminar o n8n:** rejeitado. O n8n agrega valor real nos agendados e nos
  adaptadores de canal, que a operação precisa ajustar sem deploy.

## Consequências
(+) Autorização em código tipado, testável célula a célula, revisável em PR.
(+) WF-01 cai de 17 nós para ~7; menos saltos, menor latência, depuração viável.
(+) `turn_id` correlaciona tudo de um turno em um só serviço.
(−) A operação deixa de poder ajustar comportamento do agente sem deploy.
    Avaliado como ganho: comportamento que toca preço, PII e autorização deve
    passar por revisão de código.
(−) O orquestrador passa a ser componente crítico de disponibilidade — exige
    `/healthz`, `/readyz` e o modo de degradação de § 2.4 de `01`.

## Verificação
Nenhum nó de n8n contém expressão que decida permissão (verificado na revisão do
JSON exportado); 100% das operações de `authorization-matrix.yaml` têm teste unitário.

---

# ADR-003 — Abstração de provedor de LLM

**Requisito:** § 21, § 24 (provedor A DEFINIR).

## Contexto
§ 21 recomenda OpenAI; § 24 marca a escolha como pendente (**Q-01**). Modo estrito
de JSON Schema, prompt caching e residência de dados na UE diferem entre
provedores, e a Fase 1 não pode esperar pela decisão comercial.

## Decisão
Porta `ModelProvider` em `packages/llm`, com operações mínimas: completar com
tool calling, completar com saída estruturada, contar tokens, reportar custo.
Adaptadores por provedor. Nenhum código de Skill importa SDK de fornecedor.

## Alternativas
- **Acoplar ao SDK escolhido:** rejeitado. Trocar provedor depois exigiria tocar
  as oito Skills, e a decisão de § 24 ainda está aberta.
- **Framework de agentes de terceiro:** rejeitado na v1. Acrescenta abstração e
  superfície de dependência sem resolver nenhum requisito de § 5 a § 8 que o
  desenho próprio não resolva.

## Consequências
(+) **Q-01 não bloqueia a Fase 1.**
(+) Permite o bake-off de dois candidatos contra o mesmo golden set.
(−) Denominador comum: recursos exclusivos de um fornecedor ficam atrás de
    detecção de capacidade, não de uso direto.

## Verificação
Teste de contrato roda a mesma suíte contra dois adaptadores, inclusive um falso.

---

# ADR-004 — Roteamento determinístico para intenções de risco  ⚠️ CORREÇÃO C2

**Requisito:** § 6.2, § 6.3, § 26.4, § 26.7.

## Contexto
§ 6.2 expõe `confidence` e § 6.3 roteia por ela, enquanto o próprio documento
admite que o valor "é uma estimativa do modelo, não uma prova de correção". Um
LLM que erra com confiança alta — o caso comum — passaria o gate. Para
`human_request`, `refund_request` e pedido de desconto, o custo do falso negativo
é concessão comercial indevida ou cliente frustrado.

## Decisão
Três camadas, nesta ordem:
1. **Determinística, pré-LLM:** padrões de alta precisão em
   `config/intent-rules/{pt-BR,en}.yaml` para `human_request`, `refund_request`,
   pedido de desconto e presença de número de pedido. Rota fixa, independente do modelo.
2. **LLM:** intenção primária e secundárias, idioma, entidades.
3. **Política, pós-LLM:** `authorization-matrix.yaml` decide. Se nega ou exige
   aprovação, a decisão do modelo é irrelevante.

`confidence` é gravado em `agent_actions` como telemetria. Não é gate de nada.
O campo `required_approval` de § 6.2 é **removido** da saída estruturada: não cabe
ao modelo declarar se algo requer aprovação.

## Alternativas
- **Roteamento só por LLM, como em § 6.2:** rejeitado pelos motivos acima.
- **Classificador treinado próprio:** rejeitado na v1. Exige dados rotulados que
  ainda não existem; reavaliar após o piloto.

## Consequências
(+) Recall de 100% exigível e verificável em `human_request` e `refund_request`.
(+) Falha do LLM não derruba as rotas de segurança.
(−) Manutenção de padrões em dois idiomas; falso positivo possível (escala quando
    não precisava — erro barato e preferível).

## Verificação
Teste por regra, positivo e negativo, PT e EN. Eval exige recall 100% nas duas
intenções críticas. Nenhum caminho de código lê `confidence` para decidir.

---

# ADR-005 — Identidade de canal como entidade de primeira classe  ⚠️ CORREÇÃO C5

**Requisito:** § 10.2, § 10.3, § 13.3, § 19.1, § 19.2.

## Contexto
§ 10.2 liga `customers` direto a `conversations`. O mesmo ser humano chega como
`wa_id` no WhatsApp, IGSID opaco no Instagram, e-mail no site e `customer_id` na
Shopify. Sem camada de identidade, só há dois desfechos: fusão heurística (que
eventualmente mostra o pedido de uma pessoa a outra) ou duplicação (CRM sem valor).

## Decisão
Tabela `channel_identities` (`channel`, `external_id`, `verification_status`,
`opt_out_at`), com `UNIQUE (channel, external_id)` e `customer_id` **nulável** —
a identidade existe antes de haver cliente. Vinculação de identidade a cliente
exige verificação registrada em `identity_verifications`. Opt-out é por identidade,
não por cliente. Fusão de clientes nunca apaga: usa `merged_into_customer_id`.

**Regra de ouro:** identidade `unverified` nunca acessa dado de outra identidade
do mesmo cliente.

## Alternativas
- **Colunas em `customers`, como em § 10.3:** rejeitado. Não modela N identidades
  por pessoa nem verificação por canal.
- **Fusão automática por e-mail/telefone coincidente:** rejeitado. É exatamente o
  mecanismo que causa vazamento entre pessoas.

## Consequências
(+) "Cliente tenta acessar outro pedido → bloqueia" (§ 19.1) ganha mecanismo concreto.
(+) Opt-out por canal, como as regras da Meta requerem.
(+) Histórico unificado quando — e só quando — verificado.
(−) Um join a mais em todo turno (mitigado por índice único).
(−) Fluxo de verificação a construir (**Q-02**).

## Verificação
`tests/security/cross-customer-access.spec.ts` verde para toda ferramenta de
leitura. Teste: identidade `unverified` não lê dado de identidade `verified` do
mesmo cliente.

---

# ADR-006 — Dois perímetros de segurança  ⚠️ CORREÇÃO C3

**Requisito:** § 10.6, § 16.1, § 19.2.

## Contexto
§ 10.6 pede RLS "nas tabelas expostas", sugerindo que o RLS protege o isolamento
entre clientes. Não protege: clientes de WhatsApp/Instagram não são usuários do
Supabase Auth, não há `auth.uid()` para eles, e o orquestrador conecta com
`service_role`, que ignora RLS por definição. Se a equipe acreditar o contrário,
o requisito de isolamento fica sem dono.

## Decisão
Dois perímetros, nomeados e com mecanismos distintos:
- **Staff/painel:** protegido por **RLS + RBAC**. JWT do Supabase, claim de papel,
  política por tabela, `FORCE ROW LEVEL SECURITY`.
- **Conversacional:** protegido por **scoping obrigatório** em
  `packages/data-access`. Tipos que tornam a query sem `CustomerScope`
  inexpressável. Regra de lint: só este pacote importa o cliente do banco.

RLS também é ativado com negação por padrão nas tabelas de cliente, como defesa
em profundidade contra alguém apontar o painel para elas no futuro.

## Alternativas
- **Confiar no RLS para ambos:** rejeitado. Tecnicamente não funciona com `service_role`.
- **Criar usuário de Auth por cliente:** rejeitado. Cliente de WhatsApp não faz
  login; criaria identidade sem valor e ampliaria a superfície de dados pessoais.

## Consequências
(+) O perímetro mais arriscado tem dono explícito e teste dedicado.
(+) Defesa em profundidade real, não nominal.
(−) Disciplina obrigatória: nenhuma query fora de `data-access`. Verificada por
    lint e por revisão, não por boa intenção.

## Verificação
Lint bloqueia import do cliente do banco fora de `packages/data-access`. Teste de
compilação: repositório sem escopo não tipa. Suíte de acesso cruzado em todo PR.

---

# ADR-007 — Painel sem `service_role`

**Requisito:** § 10.6, § 15, § 16.4.

## Contexto
O caminho mais curto para um painel Next.js com Supabase é usar `service_role` no
servidor e fazer `UPDATE` direto nas tabelas. Isso descarta RLS, RBAC, trilha de
auditoria e as invariantes de aprovação de uma só vez.

## Decisão
O painel **lê** via Supabase Auth com o JWT do usuário, sujeito a RLS. Toda
operação privilegiada — aprovar orçamento, alterar PII, publicar documento,
mudar papel, executar DSR — passa por `services/api`, que valida RBAC e escreve
em `audit_log`. O painel nunca importa `packages/data-access`.

## Alternativas
- **`service_role` no servidor do Next.js:** rejeitado. Um bug de autorização em
  componente de página viraria acesso total ao banco.
- **Tudo via API, inclusive leitura:** rejeitado. Dobraria o trabalho de CRUD sem
  ganho de segurança, já que a leitura com RLS é segura.

## Consequências
(+) `service_role` existe em exatamente dois serviços.
(+) Toda ação humana sensível é auditada por construção.
(−) Mais código: rota de API para cada operação privilegiada.

## Verificação
Inspeção do build do painel: nenhuma referência a `SUPABASE_SERVICE_ROLE_KEY`.
Lint bloqueia o import de `data-access`.

---

# ADR-008 — Métricas calculadas por SQL determinístico

**Requisito:** § 5.8, § 9.5, § 15.3, § 18.

## Contexto
A Skill 08 produz relatórios de vendas, conversão e satisfação. Um LLM que soma,
divide ou projeta números produz, em algum momento, um número errado em um
relatório de vendas — e um relatório errado é pior que nenhum relatório.

## Decisão
Todos os indicadores são calculados por views e funções SQL em
`database/functions/`. O LLM recebe o resultado já calculado e apenas o **narra**,
declarando obrigatoriamente período, filtros, origem e limitações (§ 5.8). O LLM
nunca executa aritmética sobre dados de negócio. Nenhuma ferramenta de escrita na
Skill 08 (§ 5.8: "não altere registros financeiros").

## Alternativas
- **LLM calcula a partir de dados brutos:** rejeitado pelos motivos acima.
- **Ferramenta de BI de terceiro:** fora de escopo na v1; reavaliar depois.

## Consequências
(+) Número reproduzível e auditável; mesma consulta, mesmo resultado.
(+) Definição de cada métrica mora em um só lugar, versionado.
(−) Métrica nova exige migration, não ajuste de prompt. Considero isso correto:
    definição de KPI é decisão de negócio e merece revisão.

## Verificação
Testes pgTAP das funções de métrica com dados conhecidos. Eval: resposta de
relatório contém apenas números presentes no retorno da ferramenta.

---

# ADR-009 — Orçamento imutável com aprovação vinculada por hash  ⚠️ CORREÇÃO C4

**Requisito:** § 7.3, § 8.1, § 10.3, § 15.5, § 25.3.

## Contexto
§ 10.3 vincula `quote_approvals` a `quote_version`. O vínculo depende de ninguém
fazer `UPDATE` em `quotes` sem incrementar `version`. Um bug no painel, um script
de correção ou um merge malfeito quebra a cadeia silenciosamente — e a Atena envia
uma proposta com preço diferente do aprovado. Isso é dano financeiro e de
credibilidade direto.

## Decisão
- `quotes` é **append-only**: trigger recusa `UPDATE` em `scope`, `amount_total`,
  `currency`, `lead_time_days`, `conditions`. Mudança cria nova linha com
  `supersedes_quote_id`.
- Coluna gerada `content_hash` = SHA-256 canônico desses campos + `project_id`.
- `quote_approvals.approved_content_hash` é `NOT NULL`, com FK composta para
  `quotes(id, content_hash)`.
- `quotes.created_by_staff_user_id` é `NOT NULL` com FK para `staff_users` — e a
  Atena não tem registro lá.
- Trigger de separação de funções: aprovador ≠ criador, e `can_approve_quotes`.
- `send_approved_quote` recalcula o hash no envio; divergência é **incidente de
  segurança**, não erro de validação.

## Alternativas
- **Vínculo por número de versão, como em § 10.3:** rejeitado. Depende de disciplina.
- **Versionamento na aplicação, sem trigger:** rejeitado. Um `UPDATE` por script
  administrativo passaria por cima.

## Consequências
(+) Alterar orçamento aprovado é **impossível sem invalidar a aprovação**, por
    construção. Não depende de ninguém lembrar.
(+) § 8.1 ("Atena não pode aprovar a própria solicitação") passa a ser uma
    constraint de banco, não uma regra de prompt.
(−) Correção de erro de digitação exige nova versão e nova aprovação. É o
    comportamento desejado.
(−) `quotes` cresce com versões. Irrelevante no volume esperado.

## Verificação
Os quatro testes do gate da Fase 6 (`09` § 2). pgTAP sobre cada trigger.

---

# ADR-010 — Prompt versionado em git, com gate de eval

**Requisito:** § 9.7, § 15.2.12, § 18.4.

## Contexto
§ 9.7 versiona workflows de n8n, mas nada no documento versiona o comportamento
do agente — que é o que o cliente efetivamente vê. § 15.2.12 sugere um módulo
"Atena Configuration" no painel, o que convida a editar prompt em produção.

## Decisão
- Prompts e manifestos vivem em `prompts/`, em git, com CODEOWNERS. Nenhuma edição
  em runtime.
- SemVer por Skill; `prompt_version` e `model_id` gravados em `agent_actions` e
  `messages`.
- Mudança em `prompts/` ou `config/` dispara o harness de eval no CI; queda de
  métrica acima do limite reprova o PR.
- Rollback = reverter o commit e fazer deploy.
- O painel expõe **parâmetros** (horário de atendimento, tom, idiomas ativos,
  limiar de escalonamento, flags) — **nunca** o texto das instruções.
- Sem A/B na v1.

## Alternativas
- **Prompt editável pelo painel:** rejeitado. Texto de instrução alterado em
  produção, sem revisão e sem eval, é a forma mais rápida de quebrar o
  comportamento comercial da empresa — e sem trilha de quem mudou o quê.
- **Prompt no banco, com versionamento próprio:** rejeitado. Reconstrói, pior, o
  que o git já faz, e tira a mudança do fluxo de revisão.

## Consequências
(+) Dado um mau atendimento, sabe-se exatamente qual prompt e qual modelo o produziram.
(+) Regressão de comportamento é barrada antes do merge.
(−) Ajuste de tom exige PR e deploy. Aceitável: os parâmetros seguros cobrem o
    ajuste do dia a dia.

## Verificação
`prompt_version` presente em 100% dos registros de `agent_actions`. CI falha se
mudança em `prompts/` não dispara o eval.

---

# ADR-011 — Busca textual antes de busca vetorial

**Requisito:** § 11.3.

## Contexto
§ 11.3 recomenda começar com busca textual e metadados, e adicionar embeddings
"quando houver volume de documentos ou necessidade comprovada". Concordo, e vale
registrar para não cair na tentação do contrário.

## Decisão
V1 usa Postgres FTS: `knowledge_chunks.content_tsv` (`tsvector` gerado, índice
GIN, configuração por idioma) + filtro por `status='approved'`, `access_level`
e `language`. A coluna `embedding` já existe no schema, **nula na v1**. Adicionar
`pgvector` depois não exige reestruturação.

## Alternativas
- **pgvector desde o início:** rejeitado. Com um volume inicial pequeno de
  documentos aprovados, FTS tem precisão comparável, custo zero de embedding,
  nenhuma latência de vetorização e é depurável (dá para ver por que casou).
- **Serviço externo de busca:** rejeitado. Mais um fornecedor, mais um DPA, mais
  uma cópia de dado, sem ganho no volume atual.

## Consequências
(+) Zero custo e zero latência de embedding na v1.
(+) Resultado explicável.
(−) Sem paráfrase semântica. Mitigado por sinônimos no dicionário de FTS e por
    boa curadoria de títulos e categorias.
(−) Gatilho de migração precisa ser medido, não sentido: taxa de busca sem
    resultado útil acima de um limite por N semanas.

## Verificação
Métrica "busca na KB sem resultado relevante" instrumentada desde a Fase 1.

---

# ADR-012 — Nenhum parser de arquivo de cliente na v1

**Requisito:** § 12.2, § 12.3, § 16.3, § 25.5.

## Contexto
§ 12.2 aceita STL, STEP, 3MF, OBJ, PDF, PNG e JPG. Parsers de CAD e de PDF são
superfície de ataque conhecida (execução de código, consumo de memória, SSRF por
recurso externo, injection via metadado). Nenhum requisito da v1 exige abrir esses
arquivos: § 9.3 pede validar, armazenar e vincular.

## Decisão
Na v1 o sistema **armazena, hasheia e escaneia** arquivos de cliente. Não abre,
não parseia, não renderiza, não converte, não gera miniatura, não extrai metadado.
A validação de tipo usa *magic bytes* (biblioteca de detecção, não parser de
formato). Pré-visualização é feita por pessoa, baixando o arquivo por URL
assinada, fora do sistema.

## Alternativas
- **Miniatura de PDF e pré-visualização de STL no painel:** rejeitado na v1. Boa
  usabilidade, mas introduz dois parsers no caminho de dado não confiável para
  resolver conveniência, não requisito.
- **Parsear em sandbox isolado:** reavaliar na v2, se houver demanda real. Exige
  isolamento de processo, limite de recurso e rede negada.

## Consequências
(+) Elimina uma classe inteira de vulnerabilidade.
(+) Fecha o vetor de prompt injection por metadado de arquivo.
(−) Painel mostra ícone e nome, não pré-visualização. Fricção aceita.

## Verificação
Nenhuma dependência de parser de PDF, malha 3D ou imagem em
`packages/{tools,data-access}` ou no painel. Verificado por política de dependência no CI.

---

# ADR-013 — TypeScript estrito em todo o stack

**Requisito:** § 21.

## Contexto
§ 21 recomenda Next.js para o painel e "API server-side/serviços" para o backend,
sem fixar linguagem. Os contratos (schema de ferramenta, saída estruturada,
entidades) atravessam orquestrador, API e painel.

## Decisão
TypeScript em todo o stack, com `strict`, `noUncheckedIndexedAccess` e
`exactOptionalPropertyTypes`. Um só ecossistema de tipos e schemas.

## Alternativas
- **Python no orquestrador:** rejeitado apesar de ser confortável para trabalho
  com LLM. Duplicaria a definição de todo contrato entre Python e TypeScript —
  exatamente o drift que ADR-001 e ADR-014 existem para evitar.
- **Go na API:** rejeitado pela mesma razão.

## Consequências
(+) Contrato definido uma vez, usado em três lugares, verificado pelo compilador.
(+) Um só conjunto de ferramentas de CI.
(−) Ecossistema de ML menos rico. Irrelevante: não treinamos modelo; consumimos API.

## Verificação
`tsconfig.base.json` com as três flags; CI roda typecheck em todos os pacotes.

---

# ADR-014 — Zod como fonte única de schema

**Requisito:** § 6.2, § 7.6, § 22 (diretório `schemas/`).

## Contexto
O mesmo contrato precisa existir em três formas: validação em runtime no backend,
tipo estático em TypeScript, e JSON Schema para a saída estruturada do LLM e para
documentar ferramentas. Mantidos à mão, divergem — e a divergência aparece como
erro de validação em produção.

## Decisão
Zod em `packages/schemas` é a **única** definição. Dele são derivados: o tipo
TypeScript (inferência), o JSON Schema (gerado por `scripts/gen-schemas.ts` para
`schemas/`, commitado) e a validação em runtime. Editar JSON Schema à mão é
proibido; o CI falha se o gerado divergir do commitado.

## Alternativas
- **JSON Schema como fonte, tipos gerados:** rejeitado. Pior ergonomia para
  validação composta e para refinamento, e a inferência de tipo fica mais fraca.
- **Manter os três à mão:** rejeitado. Divergem na terceira semana.

## Consequências
(+) Impossível um campo existir na validação e não no tipo, ou no JSON Schema.
(+) Contratos de ferramenta autodocumentados.
(−) Acoplamento a uma biblioteca. Mitigado: a saída é JSON Schema padrão, portável.

## Verificação
CI regenera os schemas e falha se houver diferença em relação ao commitado.
