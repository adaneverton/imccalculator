/* =========================================================
   FIVE LINES CATALOGUE — CONFIGURATION FILE (ENGLISH)
   ---------------------------------------------------------
   This is the only file you need to edit day to day.
   The Portuguese version lives in /catalogo/produtos.js —
   keep both in sync when you add or remove a product.

   Tip: keep the commas and quotation marks exactly as they are.
   ========================================================= */

window.CATALOGO = {

  /* ---------------------------------------------------------
     1. STORE DETAILS
     --------------------------------------------------------- */
  loja: {
    // Store country: drives number format and currency
    idioma: 'en',
    locale: 'en-IE',        // Ireland: 1,234.50
    moeda: 'EUR',           // ISO code: EUR, GBP, USD...

    nome: 'Five Lines',
    slogan: 'Custom 3D printing',

    // WhatsApp in international format, digits only.
    // Ireland: 353 + number without the leading zero. e.g. 353871234567
    whatsapp: '353000000000',

    // First line of the message the customer sends
    saudacao: 'Hi! I found your catalogue and I would like to place an order.',

    instagram: 'fivelines',
    email: 'hello@fivelines.ie',

    // true  = show prices
    // false = hide every price and show "On request"
    mostrarPrecos: true,

    // Folder holding the product photos (shared with the Portuguese catalogue)
    pastaFotos: '../assets/fotos/',

    entrega: 'Delivery anywhere in Ireland, or local collection',
    pagamento: 'Card, bank transfer, Revolut or cash on collection',
    prazoPadrao: '3 to 7 working days',

    aviso: 'Prices are confirmed after we check size, colour and material. VAT included.'
  },

  /* ---------------------------------------------------------
     2. INTERFACE TEXTS
     Everything the page writes on its own. Translate here if
     you ever want a third language.
     --------------------------------------------------------- */
  textos: {
    tudo: 'All',
    nadaEncontrado: 'We could not find that here.<br>Send us a message on WhatsApp — we can probably make it.',
    apartirDe: 'from',
    indisponivel: 'Unavailable',
    indisponivelAgora: 'Currently unavailable',
    sobConsulta: 'On request',
    opcional: 'optional',
    erroTexto: 'please fill this in',
    erroEscolha: 'pick one option',
    prazo: 'Lead time:',
    adicionar: 'Add to order',
    adicionado: 'Added to your order',
    diminuir: 'Decrease quantity',
    aumentar: 'Increase quantity',
    umItemNoPedido: '1 item in your order',
    itensNoPedido: '{n} items in your order',
    maisSobConsulta: '+ items on request',
    valoresSobConsulta: 'Prices on request',
    seuPedido: 'Your order',
    umItem: '1 item',
    nItens: '{n} items',
    pedidoVazio: 'Your order is empty.<br>Tap a product to start.',
    verProdutos: 'Browse products',
    remover: 'remove',
    totalEstimado: 'Estimated total',
    totalParcial: 'Subtotal',
    total: 'Total',
    orcamentoPeloWhats: 'we send the quote on WhatsApp',
    limpar: 'Clear',
    enviarNoWhats: 'Send on WhatsApp',
    unidades: 'pcs',
    unidade: 'pc',
    cada: 'each',
    valorSobConsulta: 'Price on request',
    somaSobConsulta: '(plus the items quoted on request)',
    linkCopiado: 'Link copied',
    tituloPagina: '{loja} — catalogue'
  },

  /* ---------------------------------------------------------
     3. CATEGORIES
     --------------------------------------------------------- */
  categorias: [
    { id: 'decoracao',      nome: 'Home décor' },
    { id: 'utilidades',     nome: 'Everyday' },
    { id: 'tecnicas',       nome: 'Technical parts' },
    { id: 'personalizados', nome: 'Custom made' },
    { id: 'colecionaveis',  nome: 'Collectibles' }
  ],

  /* ---------------------------------------------------------
     4. REUSABLE OPTION LISTS
     Use in any product with:  { nome: 'Colour', usar: 'cores' }
     --------------------------------------------------------- */
  listas: {
    cores: ['White', 'Black', 'Grey', 'Blue', 'Green', 'Red', 'Yellow', 'Gold', 'Clear'],
    materiais: ['PLA (general use)', 'PETG (tougher)', 'ABS/ASA (heat and sun)', 'TPU (flexible)', 'Resin (fine detail)'],
    acabamento: ['Standard (straight off the printer)', 'Sanded', 'Sanded and painted']
  },

  /* ---------------------------------------------------------
     5. PRODUCTS
     Field reference:
       id .......... unique short name, no spaces or accents (becomes the link)
       nome ........ product name on the card
       categoria ... one of the category ids above
       descricao ... short line on the card
       detalhes .... longer text shown when the product opens
       preco ....... number, no currency symbol. e.g. 22 or 22.50
       precoTexto .. use instead of "preco" for cases like 'On request'
       foto ........ just the file name, e.g. 'vase.jpg' (the folder comes from
                     pastaFotos). Leave '' for the default drawing
       etiqueta .... badge over the photo ('' hides it)
       disponivel .. false marks the product as unavailable
       opcoes ...... choices the customer makes

     Option types:
       { nome: 'Size', valores: ['15 cm', '20 cm'] }   → single choice
       { nome: 'Colour', usar: 'cores' }                → uses a ready list
       { nome: 'Name to engrave', texto: true }         → customer types it
     Add  obrigatoria: true  to require the choice.
     --------------------------------------------------------- */
  produtos: [
    {
      id: 'vaso-espiral',
      nome: 'Spiral vase',
      categoria: 'decoracao',
      descricao: 'Decorative vase with a spiral texture, printed in a single wall.',
      detalhes: 'Matte finish and thin walls that let the light through. For live plants, keep the water in an inner container.',
      preco: 22,
      foto: '',
      etiqueta: 'Best seller',
      disponivel: true,
      opcoes: [
        { nome: 'Size', valores: ['15 cm', '20 cm', '25 cm'], obrigatoria: true },
        { nome: 'Colour', usar: 'cores', obrigatoria: true }
      ]
    },
    {
      id: 'luminaria-lithophane',
      nome: 'Lithophane lamp',
      categoria: 'decoracao',
      descricao: 'Your photo becomes relief and appears when the light turns on.',
      detalhes: 'Send the photo on WhatsApp after ordering. High-contrast pictures work best. Comes with the base, socket and cable.',
      preco: 39,
      foto: '',
      etiqueta: 'Gift idea',
      disponivel: true,
      opcoes: [
        { nome: 'Shape', valores: ['Rectangular', 'Heart', 'Round'], obrigatoria: true },
        { nome: 'Base', valores: ['With lit base', 'Panel only'], obrigatoria: true }
      ]
    },
    {
      id: 'cachepo-geometrico',
      nome: 'Geometric planter',
      categoria: 'decoracao',
      descricao: 'Planter for succulents with a built-in saucer.',
      preco: 18,
      foto: '',
      disponivel: true,
      opcoes: [
        { nome: 'Size', valores: ['Small (8 cm)', 'Medium (12 cm)'], obrigatoria: true },
        { nome: 'Colour', usar: 'cores', obrigatoria: true }
      ]
    },
    {
      id: 'organizador-mesa',
      nome: 'Desk organiser',
      categoria: 'utilidades',
      descricao: 'Modular dividers for pens, cables and small items.',
      preco: 26,
      foto: '',
      disponivel: true,
      opcoes: [
        { nome: 'Compartments', valores: ['3 sections', '5 sections', '7 sections'], obrigatoria: true },
        { nome: 'Colour', usar: 'cores', obrigatoria: true }
      ]
    },
    {
      id: 'suporte-headset',
      nome: 'Headset stand',
      categoria: 'utilidades',
      descricao: 'Desk stand or under-desk mount, with a non-slip base.',
      preco: 24,
      foto: '',
      disponivel: true,
      opcoes: [
        { nome: 'Model', valores: ['On the desk', 'Under the desk'], obrigatoria: true },
        { nome: 'Colour', usar: 'cores', obrigatoria: true }
      ]
    },
    {
      id: 'suporte-celular',
      nome: 'Phone stand',
      categoria: 'utilidades',
      descricao: 'Adjustable angle and a channel for the charging cable.',
      preco: 16,
      foto: '',
      disponivel: true,
      opcoes: [
        { nome: 'Colour', usar: 'cores', obrigatoria: true },
        { nome: 'Name to engrave', texto: true, dica: 'Optional — up to 12 letters' }
      ]
    },
    {
      id: 'peca-reposicao',
      nome: 'Replacement part',
      categoria: 'tecnicas',
      descricao: 'That part that broke and is nowhere to be found: we measure, model and print it.',
      detalhes: 'Send a photo of the broken part with a ruler or tape measure next to it. If you already have the 3D file, even better.',
      precoTexto: 'On request',
      foto: '',
      disponivel: true,
      opcoes: [
        { nome: 'Material', usar: 'materiais' },
        { nome: 'What the part is', texto: true, dica: 'e.g. blender gear', obrigatoria: true }
      ]
    },
    {
      id: 'engrenagens',
      nome: 'Gears and bushings',
      categoria: 'tecnicas',
      descricao: 'Mechanical components with tolerances tuned to your assembly.',
      precoTexto: 'On request',
      foto: '',
      disponivel: true,
      opcoes: [
        { nome: 'Material', usar: 'materiais' },
        { nome: 'Key measurements', texto: true, dica: 'e.g. 40 mm outer, 8 mm bore' }
      ]
    },
    {
      id: 'gabaritos',
      nome: 'Jigs and fixtures',
      categoria: 'tecnicas',
      descricao: 'Custom jigs, gauges and bench fixtures.',
      precoTexto: 'On request',
      foto: '',
      disponivel: true,
      opcoes: [
        { nome: 'Material', usar: 'materiais' },
        { nome: 'Which process', texto: true, dica: 'Describe where it will be used' }
      ]
    },
    {
      id: 'chaveiro',
      nome: 'Custom keyring',
      categoria: 'personalizados',
      descricao: 'Name, logo or artwork in relief, in two colours.',
      preco: 6,
      foto: '',
      etiqueta: 'From 5 pcs',
      disponivel: true,
      opcoes: [
        { nome: 'Text on the keyring', texto: true, dica: 'Name or short phrase', obrigatoria: true },
        { nome: 'Base colour', usar: 'cores', obrigatoria: true },
        { nome: 'Text colour', usar: 'cores', obrigatoria: true }
      ]
    },
    {
      id: 'brindes-corporativos',
      nome: 'Corporate gifts',
      categoria: 'personalizados',
      descricao: 'Kits with your company identity: trophies, card holders and displays.',
      detalhes: 'Minimum order of 20 pieces. Send your logo as PNG, SVG or PDF and we prepare the model.',
      precoTexto: 'On request',
      foto: '',
      disponivel: true,
      opcoes: [
        { nome: 'Type of gift', valores: ['Trophy', 'Card holder', 'Display', 'Keyring', 'Other'], obrigatoria: true },
        { nome: 'Approximate quantity', valores: ['20 to 50', '50 to 100', 'More than 100'], obrigatoria: true },
        { nome: 'Company name', texto: true }
      ]
    },
    {
      id: 'miniaturas',
      nome: 'Miniatures and figures',
      categoria: 'colecionaveis',
      descricao: 'Resin printing for the finest detail.',
      preco: 29,
      foto: '',
      disponivel: true,
      opcoes: [
        { nome: 'Scale', valores: ['28 mm', '54 mm', '15 cm'], obrigatoria: true },
        { nome: 'Finish', usar: 'acabamento', obrigatoria: true }
      ]
    },
    {
      id: 'acessorios-jogos',
      nome: 'Tabletop accessories',
      categoria: 'colecionaveis',
      descricao: 'Dice towers, component trays and inserts made to fit your box.',
      preco: 35,
      foto: '',
      disponivel: true,
      opcoes: [
        { nome: 'Item', valores: ['Dice tower', 'Dice tray', 'Box insert', 'Tokens'], obrigatoria: true },
        { nome: 'Colour', usar: 'cores', obrigatoria: true },
        { nome: 'Which game', texto: true, dica: 'For a made-to-fit insert' }
      ]
    }
  ]
};
