# Registro de decisões arquiteturais (ADR)

## Processo

Toda decisão que afete **estrutura, segurança, dinheiro, dados pessoais ou
comportamento comercial** é registrada como ADR antes de ser implementada
(§ 0.2.11 e § 28.1 do documento mestre).

| Estado | Significado |
|---|---|
| `Proposto` | Escrito, aguardando aprovação do responsável pelo produto |
| `Aceito` | Aprovado; pode ser implementado |
| `Rejeitado` | Recusado; a razão fica registrada (valor histórico) |
| `Substituído` | Trocado por um ADR posterior, nomeado |
| `Depreciado` | Não se aplica mais, sem substituto |

Um ADR aceito não é editado. Mudança de rumo gera novo ADR que o substitui.

## Template

```markdown
# ADR-NNNN — <título>

**Estado:** Proposto | Aceito | Rejeitado | Substituído por ADR-NNNN
**Data:** AAAA-MM-DD
**Requisito relacionado:** § N.N do documento mestre
**Decide:** <quem aprova>

## Contexto
O que força uma decisão agora.

## Decisão
O que foi decidido, em voz ativa.

## Alternativas consideradas
Cada uma, com por que não foi escolhida.

## Consequências
Positivas, negativas e o que fica mais difícil.

## Verificação
Como se comprova que a decisão está de fato em vigor no código.
```

## Índice

Todos os 14 ADRs estão em [`adr-log.md`](adr-log.md), consolidados para facilitar
a revisão inicial. Após a aprovação, cada um é extraído para
`docs/decisions/NNNN-titulo.md`, conforme § 22.

| ADR | Título | Estado | Correção? |
|---|---|---|---|
| 001 | Monorepo | Proposto | — |
| 002 | Fronteira n8n / orquestrador | Proposto | **C1** |
| 003 | Abstração de provedor de LLM | Proposto | — |
| 004 | Roteamento determinístico para intenções de risco | Proposto | **C2** |
| 005 | Identidade de canal como entidade de primeira classe | Proposto | **C5** |
| 006 | Dois perímetros de segurança | Proposto | **C3** |
| 007 | Painel sem `service_role` | Proposto | — |
| 008 | Métricas por SQL determinístico | Proposto | — |
| 009 | Orçamento imutável com vínculo por hash | Proposto | **C4** |
| 010 | Prompt versionado em git | Proposto | — |
| 011 | FTS antes de busca vetorial | Proposto | — |
| 012 | Nenhum parser de arquivo de cliente na v1 | Proposto | — |
| 013 | TypeScript estrito em todo o stack | Proposto | — |
| 014 | Zod como fonte única de schema | Proposto | — |
