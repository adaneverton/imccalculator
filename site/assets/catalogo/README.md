# Catálogo Five Lines

Página única de catálogo, feita para ser **o link da bio do Instagram** e para ser
enviada no WhatsApp. O cliente escolhe os produtos, monta o pedido e envia tudo
pronto na sua conversa.

- Sem Google Fonts, Google Analytics, pixel de rede social ou qualquer rastreador.
- Sem cookies. O pedido em andamento fica só no navegador do cliente.
- Sem back-end: são arquivos estáticos, hospedados em qualquer lugar.

## Onde fica cada coisa

```
assets/catalogo/     ← você está aqui: o motor, igual nos dois idiomas
assets/fotos/        ← fotos dos produtos (compartilhadas)
catalog/products.js  ← catálogo em inglês  (/catalog/)
pt/catalogo/produtos.js ← catálogo em português (/pt/catalogo/)
```

## O arquivo que você edita

**`products.js`** (inglês) e **`produtos.js`** (português) — são os únicos arquivos
do dia a dia. Cada um tem quatro partes:

1. `loja` — WhatsApp, Instagram, prazo, entrega, pagamento e se os preços aparecem.
2. `categorias` — os filtros que aparecem no topo.
3. `listas` — listas reaproveitáveis (cores, materiais, acabamento).
4. `produtos` — o catálogo em si.

Depois de editar, salve o arquivo e envie para a hospedagem. Não precisa compilar nada.

### Trocar o WhatsApp (faça isso primeiro)

```js
whatsapp: '353000000000',   // Irlanda: 353 + número sem o zero inicial
```

### País e moeda

```js
locale: 'en-IE',   // formato dos números: 1,234.50
moeda: 'EUR',      // código ISO: EUR, GBP, USD, BRL...
```

O símbolo e a posição saem prontos do navegador: `EUR` + `en-IE` mostra
**€45.00**; `BRL` + `pt-BR` mostraria **R$ 45,00**. Não escreva o símbolo à mão.

### Adicionar um produto

Copie um bloco inteiro (de `{` até `},`) e mude os campos:

```js
{
  id: 'porta-caneta',                    // sem espaços nem acentos — vira link
  nome: 'Porta-caneta hexagonal',
  categoria: 'utilidades',               // um dos id de "categorias"
  descricao: 'Encaixa em qualquer mesa.',// texto curto do card
  detalhes: 'Texto maior...',            // opcional
  preco: 29,                             // ou apague e use precoTexto
  foto: 'fotos/porta-caneta.jpg',        // '' mostra o desenho padrão
  etiqueta: 'Novo',                      // '' esconde
  disponivel: true,
  opcoes: [
    { nome: 'Cor', usar: 'cores', obrigatoria: true },
    { nome: 'Nome para gravar', texto: true, dica: 'Opcional' }
  ]
}
```

### Tipos de opção que o cliente escolhe

| Como escrever | O que aparece |
|---|---|
| `{ nome: 'Tamanho', valores: ['15 cm', '20 cm'] }` | botões de escolha única |
| `{ nome: 'Cor', usar: 'cores' }` | usa a lista pronta em `listas` |
| `{ nome: 'Texto', texto: true, dica: '...' }` | campo para o cliente digitar |

Acrescente `obrigatoria: true` para exigir a escolha antes de adicionar ao pedido.
Tudo o que o cliente escolher vai escrito na mensagem do WhatsApp.

### Esconder todos os preços

```js
mostrarPrecos: false,
```

O catálogo passa a mostrar "Sob consulta" em tudo e o pedido chega sem valores.

### Deixar um produto indisponível

```js
disponivel: false,
```

O produto continua aparecendo, marcado como indisponível e sem botão de pedido.

### Fotos

Coloque os arquivos em `assets/fotos/` e escreva **só o nome do arquivo** no produto:

```js
foto: 'vaso-espiral.jpg',
```

A pasta vem do campo `pastaFotos`, que já está ajustado em cada catálogo
(`../assets/fotos/` no inglês, `../../assets/fotos/` no português) porque as duas
páginas ficam em profundidades diferentes. Assim a mesma foto serve aos dois
idiomas. As instruções de tamanho e formato estão em `assets/fotos/LEIA-ME.txt`.

## Como o cliente usa

1. Abre o link, busca ou filtra por categoria.
2. Toca no produto, escolhe cor/tamanho/gravação e a quantidade.
3. Adiciona ao pedido — a barra de baixo mostra o total.
4. Toca em **Enviar no WhatsApp** e a conversa abre com o pedido escrito:

```
Olá! Vim pelo catálogo e gostaria de fazer um pedido.

1) Chaveiro personalizado — 3 un.
   • Texto do chaveiro: Maria
   • Cor da base: Preto
   €6.00 cada — €18.00

Total estimado: €18.00
```

## Link de um produto específico

Para mandar um único item para alguém, acrescente `?p=` e o `id` do produto:

```
https://fivelines.ie/catalog/?p=chaveiro
```

O catálogo abre já com aquele produto na tela. É o link para responder
"quanto custa o chaveiro?" no direct ou no WhatsApp.

## Publicar

O catálogo é estático, então serve qualquer hospedagem:

- **Netlify ou Vercel** (grátis, aceita repositório privado): conecte o repositório
  ou arraste a pasta. O link fica algo como `fivelines.netlify.app/catalogo/`.
- **GitHub Pages**: em *Settings → Pages*, publique a partir do branch escolhido.
  Repositório privado exige plano pago.
- **Hospedagem própria**: envie a pasta por FTP.

Com domínio próprio, o link da bio fica `fivelines.ie/catalog` (ou
`fivelines.ie/pt/catalogo` para o público brasileiro).

### Sobre privacidade

A página não carrega nada de fora: fontes, ícones e desenhos estão todos aqui
dentro. Não há Google Analytics, Google Fonts, Meta Pixel nem cookies. O único
dado guardado é o pedido em andamento, no `localStorage` do próprio celular do
cliente — some quando ele limpa os dados do navegador e nunca chega até você
antes de o pedido ser enviado.

Se um dia quiser medir acessos sem abrir mão disso, dá para usar um serviço
sem cookies e sem dados pessoais (Plausible, Umami ou GoatCounter), que respeitam
a LGPD melhor que o Google Analytics. Nesse caso, uma linha de script no
`index.html` resolve.

## Os dois idiomas

O catálogo em português fica em `/pt/catalogo/` e usa **os mesmos** `catalogo.css`
e `catalogo.js` daqui — só muda o arquivo de dados, que traz os produtos e um
bloco `textos` com todas as frases da interface:

```js
textos: {
  adicionar: 'Add to order',
  enviarNoWhats: 'Send on WhatsApp',
  ...
}
```

Ao criar um produto em um idioma, crie o equivalente no outro (mesmo `id`) para
os dois catálogos ficarem iguais. O botão **PT / EN** no topo troca de idioma, e
cada idioma guarda o pedido separadamente no navegador.

Para um terceiro idioma, copie a pasta `catalog/`, traduza `products.js`
(produtos + bloco `textos`) e ajuste `idioma`, `locale` e `pastaFotos`.

## Arquivos

```
assets/catalogo/
├── catalogo.css    aparência (usada pelos dois idiomas)
├── catalogo.js     funcionamento (usado pelos dois idiomas)
└── README.md       este arquivo

assets/fotos/       fotos dos produtos (usadas pelos dois idiomas)

catalog/
├── index.html      estrutura da página em inglês
└── products.js     ← produtos e textos da interface em inglês

pt/catalogo/
├── index.html      estrutura da página em português
└── produtos.js     ← produtos e textos da interface em português
```
