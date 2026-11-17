# ATENA — Five Lines AI Ecosystem
## Architecture & Implementation Blueprint — v0.1 (para revisão)

**Entregável referente a:** § 28.3 do documento mestre `ATENA_Five_Lines_AI_Ecosystem_v1.0.md`
**Status:** proposta técnica aguardando aprovação. **Nenhuma implementação iniciada.**
**Data:** 17 de novembro de 2026
**Fonte da verdade de requisitos:** documento mestre v1.0 (não alterado por este blueprint)

---

### ⚠️ Aviso de localização

Este pacote foi escrito no diretório de trabalho da sessão, que atualmente
aponta para o repositório `adaneverton/imccalculator` (aplicativo Android
"Calculadora IMC") — **um projeto sem relação com o ATENA**.

Nada foi commitado nesse repositório. O ATENA deve receber um repositório
próprio (`atena-five-lines`), conforme § 22 do documento mestre e
`03-repository-structure.md` deste blueprint. Ver **Q-00** em
`02-open-decisions.md`.

---

### Como ler este blueprint

| # | Documento | Responde ao pedido | Leitura |
|---|---|---|---|
| 00 | [`00-executive-summary.md`](00-executive-summary.md) | Síntese, veredito e o que muda | 5 min |
| 01 | [`01-architecture-validation.md`](01-architecture-validation.md) | **(1)** Validação da arquitetura | 20 min |
| 02 | [`02-open-decisions.md`](02-open-decisions.md) | **(2)** Decisões pendentes + perguntas bloqueadoras | 15 min |
| 03 | [`03-repository-structure.md`](03-repository-structure.md) | **(3)** Estrutura do repositório | 10 min |
| 04 | [`04-data-model.md`](04-data-model.md) | **(4)** Modelo de dados | 25 min |
| 05 | [`05-api-and-tool-contracts.md`](05-api-and-tool-contracts.md) | **(5)** Contratos de APIs e ferramentas | 30 min |
| 06 | [`06-skills-specification.md`](06-skills-specification.md) | **(6)** Estrutura das oito Skills | 20 min |
| 07 | [`07-security-and-permissions.md`](07-security-and-permissions.md) | **(7)** Segurança e permissões | 30 min |
| 08 | [`08-n8n-workflows.md`](08-n8n-workflows.md) | **(8)** Workflows n8n | 20 min |
| 09 | [`09-delivery-and-test-plan.md`](09-delivery-and-test-plan.md) | **(9)** Etapas de desenvolvimento e testes | 20 min |
| — | [`decisions/adr-log.md`](decisions/adr-log.md) | Registro formal de decisões (ADR-001..014) | 25 min |

**Caminho de revisão mínimo antes de aprovar:** 00 → 01 (§1.3 Correções) → 02 (perguntas
bloqueadoras) → `decisions/adr-log.md` (ADR-002, 004, 006, 009).

### Convenções

- **OBRIGATÓRIO** — requisito do documento mestre; não negociável neste blueprint.
- **RECOMENDAÇÃO** — decisão arquitetural proposta, sujeita à sua validação.
- **A DEFINIR** — pendência que não foi preenchida por suposição.
- **CORREÇÃO** — ponto onde este blueprint discorda do documento mestre e propõe
  alteração. Toda correção tem ADR associado.
- `Q-nn` — pergunta bloqueadora, catalogada em `02-open-decisions.md`.

### Princípio de trabalho adotado

Conforme § 0.2 e § 28 do documento mestre: nenhuma credencial, URL privada, ID,
preço, política comercial, prazo ou dado de estoque foi inventado. Onde a
especificação exigia um valor que a empresa ainda não definiu, o blueprint
apresenta uma **proposta explicitamente marcada como proposta** e a registra
como pergunta bloqueadora — nunca como fato.
