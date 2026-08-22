# Site Five Lines — Impressão 3D

Site institucional e catálogo da **Five Lines**, feito em HTML, CSS e JavaScript puros:
sem build, sem dependências e sem framework. É só abrir o `index.html`.

## Como ver o site no seu computador

Abrir o arquivo direto no navegador já funciona:

```bash
xdg-open site/index.html      # Linux
open site/index.html          # macOS
start site\index.html         # Windows
```

Para testar em condições parecidas com as do servidor (recomendado):

```bash
cd site
python3 -m http.server 8000
# depois acesse http://localhost:8000
```

## O que você precisa ajustar antes de publicar

### 1. Dados de contato (obrigatório)

Todos os links de contato saem de um único lugar: o objeto `SITE_CONFIG`, no topo de
`assets/js/main.js`.

```js
const SITE_CONFIG = {
  whatsapp: '5599999999999',            // 55 + DDD + número, só dígitos
  whatsappDisplay: '(00) 00000-0000',   // como o número aparece na tela
  email: 'contato@fivelines.com.br',
  instagram: 'fivelines',               // só o usuário, sem @
  linkedin: 'https://www.linkedin.com/company/fivelines',
  local: 'Todo o Brasil, com envio rastreado',
  horario: 'Segunda a sexta, das 9h às 18h'
};
```

Trocar esses valores atualiza de uma vez o botão flutuante, a seção de contato, o rodapé
e a mensagem que o formulário monta.

### 2. Preços e produtos

Os preços do catálogo em `index.html` são **exemplos** — confira e ajuste todos antes de
publicar, ou troque por `Sob consulta`.

Para adicionar um produto, copie um bloco `<article class="product reveal">` e altere:

- `data-category` — precisa ser uma das categorias dos filtros: `decoracao`,
  `utilidades`, `tecnicas`, `personalizados`, `colecionaveis`;
- `data-name` e o título;
- a descrição, o preço e o `data-quote` do botão (é o nome que vai na mensagem do WhatsApp).

Para criar uma categoria nova, acrescente um botão na lista `.filters` com o
`data-filter` correspondente. O filtro funciona sozinho, sem mexer no JavaScript.

As ilustrações dos cards são SVGs definidos no sprite no começo do `index.html`
(`<symbol id="p-...">`). Quando tiver fotos reais das peças, troque o
`<svg><use .../></svg>` por `<img src="assets/img/foto.jpg" alt="...">` — o estilo do
card já cuida do enquadramento.

### 3. Endereço do site

Se o domínio não for `fivelines.com.br`, atualize:

- `<link rel="canonical">` e as metatags `og:` no `<head>` do `index.html`;
- o bloco de dados estruturados (`application/ld+json`), incluindo telefone, e-mail e cidade;
- `robots.txt` e `sitemap.xml`.

## Como o formulário funciona

Não há servidor nem back-end. Ao enviar, o formulário monta uma mensagem organizada
(nome, contato, serviço, quantidade, material, prazo e descrição) e abre a conversa no
WhatsApp com o texto pronto. O link "Enviar por e-mail" faz o mesmo usando `mailto:`.

Se um dia quiser receber os pedidos por e-mail automaticamente, dá para apontar o
formulário para um serviço como Formspree ou Web3Forms sem mudar o layout.

## Publicar

O site é estático, então qualquer hospedagem serve.

- **GitHub Pages**: em *Settings → Pages*, publique a partir do branch escolhido e da
  pasta `/site` (ou mova o conteúdo de `site/` para a raiz de um repositório novo).
- **Netlify / Vercel**: arraste a pasta `site/` na interface, ou conecte o repositório
  definindo `site` como diretório de publicação. Sem comando de build.
- **Hospedagem tradicional**: envie o conteúdo de `site/` por FTP para a pasta pública.

Depois de publicar, aponte o domínio para a hospedagem e ative o HTTPS.

## Estrutura

```
site/
├── index.html          página única, com todas as seções
├── site.webmanifest    ícones e nome para instalação como app
├── robots.txt
├── sitemap.xml
├── favicon.ico
└── assets/
    ├── css/styles.css  estilos (tokens de cor da marca no topo)
    ├── js/main.js      SITE_CONFIG, menu, filtros, formulário
    └── img/            logo em várias versões e ícones
```

## Detalhes de implementação

- **Cores da marca** extraídas da própria logo: navy `#011e5a` → teal `#049c90`.
  Estão como variáveis CSS em `:root`, no início do `styles.css`.
- **Modo escuro** automático, seguindo a preferência do sistema do visitante
  (a logo troca para a versão clara sozinha).
- **Acessibilidade**: link para pular ao conteúdo, navegação por teclado, `aria-pressed`
  nos filtros, foco visível e respeito a `prefers-reduced-motion`.
- **Responsivo** do celular ao desktop, com menu recolhido abaixo de 940 px.
- **SEO**: título e descrição, Open Graph, dados estruturados de `LocalBusiness`,
  `sitemap.xml` e `robots.txt`.
