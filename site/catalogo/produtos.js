/* =========================================================
   CATÁLOGO FIVE LINES — ARQUIVO DE CONFIGURAÇÃO
   ---------------------------------------------------------
   Este é o ÚNICO arquivo que você precisa editar no dia a dia.
   Mude os dados da loja, as categorias e os produtos abaixo.
   Depois salve e envie o arquivo para a hospedagem.

   Dica: mantenha as vírgulas e as aspas exatamente como estão.
   ========================================================= */

window.CATALOGO = {

  /* ---------------------------------------------------------
     1. DADOS DA LOJA
     --------------------------------------------------------- */
  loja: {
    nome: 'Five Lines',
    slogan: 'Impressão 3D sob medida',

    // WhatsApp no formato internacional, só dígitos: 55 + DDD + número
    whatsapp: '5599999999999',

    // Primeira linha da mensagem enviada pelo cliente
    saudacao: 'Olá! Vim pelo catálogo e gostaria de fazer um pedido.',

    instagram: 'fivelines',        // só o usuário, sem @ (deixe '' para esconder)
    email: 'contato@fivelines.com.br',

    // true  = mostra os preços
    // false = esconde todos os preços e mostra "Sob consulta"
    mostrarPrecos: true,
    moeda: 'R$',

    // Informações que aparecem no rodapé do catálogo
    entrega: 'Envio para todo o Brasil ou retirada combinada',
    pagamento: 'Pix, cartão ou dinheiro na retirada',
    prazoPadrao: '3 a 7 dias úteis',

    // Aviso curto no rodapé (deixe '' para esconder)
    aviso: 'Valores sujeitos a confirmação conforme tamanho, cor e material.'
  },

  /* ---------------------------------------------------------
     2. CATEGORIAS
     O "id" é usado nos produtos; o "nome" aparece no filtro.
     --------------------------------------------------------- */
  categorias: [
    { id: 'decoracao',     nome: 'Decoração' },
    { id: 'utilidades',    nome: 'Utilidades' },
    { id: 'tecnicas',      nome: 'Peças técnicas' },
    { id: 'personalizados',nome: 'Personalizados' },
    { id: 'colecionaveis', nome: 'Colecionáveis' }
  ],

  /* ---------------------------------------------------------
     3. LISTAS DE OPÇÕES REUTILIZÁVEIS
     Use em qualquer produto escrevendo, por exemplo:
        { nome: 'Cor', usar: 'cores' }
     --------------------------------------------------------- */
  listas: {
    cores: ['Branco', 'Preto', 'Cinza', 'Azul', 'Verde', 'Vermelho', 'Amarelo', 'Dourado', 'Transparente'],
    materiais: ['PLA (uso geral)', 'PETG (mais resistente)', 'ABS/ASA (calor e sol)', 'TPU (flexível)', 'Resina (alta definição)'],
    acabamento: ['Padrão (direto da impressora)', 'Lixado', 'Lixado e pintado']
  },

  /* ---------------------------------------------------------
     4. PRODUTOS

     Campos de cada produto:
       id .......... apelido único, sem espaços nem acentos (vira link)
       nome ........ nome que aparece no card
       categoria ... um dos "id" da lista de categorias acima
       descricao ... texto curto do card
       detalhes .... texto maior, aparece ao abrir o produto (opcional)
       preco ....... número, sem "R$". Ex.: 45 ou 45.90
       precoTexto .. use no lugar de "preco" para casos como 'Sob consulta'
       foto ........ 'fotos/arquivo.jpg' — deixe '' para usar o desenho padrão
       etiqueta .... selo no canto da foto: 'Novo', 'Mais pedido'... ('' esconde)
       disponivel .. false marca o produto como indisponível
       prazo ....... prazo específico deste produto (opcional)
       opcoes ...... escolhas do cliente (cor, tamanho, gravação...)

     Tipos de opção:
       { nome: 'Tamanho', valores: ['15 cm', '20 cm'] }   → escolha única
       { nome: 'Cor', usar: 'cores' }                      → usa a lista pronta
       { nome: 'Nome para gravar', texto: true }           → cliente digita
     Acrescente  obrigatoria: true  para exigir a escolha.
     --------------------------------------------------------- */
  produtos: [
    {
      id: 'vaso-espiral',
      nome: 'Vaso espiral',
      categoria: 'decoracao',
      descricao: 'Vaso decorativo com textura em espiral, impresso em parede única.',
      detalhes: 'Acabamento fosco e paredes finas que deixam a luz passar. Para uso com plantas, recomendamos manter a água em um recipiente interno.',
      preco: 45,
      foto: '',
      etiqueta: 'Mais pedido',
      disponivel: true,
      opcoes: [
        { nome: 'Tamanho', valores: ['15 cm', '20 cm', '25 cm'], obrigatoria: true },
        { nome: 'Cor', usar: 'cores', obrigatoria: true }
      ]
    },
    {
      id: 'luminaria-lithophane',
      nome: 'Luminária lithophane',
      categoria: 'decoracao',
      descricao: 'Sua foto vira relevo e aparece quando a luz acende.',
      detalhes: 'Envie a foto pelo WhatsApp depois de fazer o pedido. Fotos com bom contraste ficam melhores. Acompanha base com soquete e cabo.',
      preco: 89,
      foto: '',
      etiqueta: 'Presente',
      disponivel: true,
      opcoes: [
        { nome: 'Formato', valores: ['Retangular', 'Coração', 'Redondo'], obrigatoria: true },
        { nome: 'Base', valores: ['Com base e luz', 'Só a placa'], obrigatoria: true }
      ]
    },
    {
      id: 'cachepo-geometrico',
      nome: 'Cachepô geométrico',
      categoria: 'decoracao',
      descricao: 'Vaso para suculentas com prato de apoio integrado.',
      preco: 39,
      foto: '',
      disponivel: true,
      opcoes: [
        { nome: 'Tamanho', valores: ['Pequeno (8 cm)', 'Médio (12 cm)'], obrigatoria: true },
        { nome: 'Cor', usar: 'cores', obrigatoria: true }
      ]
    },
    {
      id: 'organizador-mesa',
      nome: 'Organizador de mesa',
      categoria: 'utilidades',
      descricao: 'Divisórias modulares para canetas, cabos e miudezas.',
      preco: 55,
      foto: '',
      disponivel: true,
      opcoes: [
        { nome: 'Compartimentos', valores: ['3 divisões', '5 divisões', '7 divisões'], obrigatoria: true },
        { nome: 'Cor', usar: 'cores', obrigatoria: true }
      ]
    },
    {
      id: 'suporte-headset',
      nome: 'Suporte de headset',
      categoria: 'utilidades',
      descricao: 'Apoio de mesa ou de parafusar sob a mesa, com base antiderrapante.',
      preco: 49,
      foto: '',
      disponivel: true,
      opcoes: [
        { nome: 'Modelo', valores: ['De mesa', 'Sob a mesa'], obrigatoria: true },
        { nome: 'Cor', usar: 'cores', obrigatoria: true }
      ]
    },
    {
      id: 'suporte-celular',
      nome: 'Suporte de celular',
      categoria: 'utilidades',
      descricao: 'Ângulo ajustável e passagem para o cabo de carga.',
      preco: 35,
      foto: '',
      disponivel: true,
      opcoes: [
        { nome: 'Cor', usar: 'cores', obrigatoria: true },
        { nome: 'Nome para gravar', texto: true, dica: 'Opcional — até 12 letras' }
      ]
    },
    {
      id: 'peca-reposicao',
      nome: 'Peça de reposição',
      categoria: 'tecnicas',
      descricao: 'Aquele componente que quebrou e não se acha mais: medimos, modelamos e imprimimos.',
      detalhes: 'Mande uma foto da peça quebrada com uma régua ou fita métrica ao lado. Se tiver o arquivo 3D, melhor ainda.',
      precoTexto: 'Sob consulta',
      foto: '',
      disponivel: true,
      opcoes: [
        { nome: 'Material', usar: 'materiais' },
        { nome: 'O que é a peça', texto: true, dica: 'Ex.: engrenagem do liquidificador', obrigatoria: true }
      ]
    },
    {
      id: 'engrenagens',
      nome: 'Engrenagens e buchas',
      categoria: 'tecnicas',
      descricao: 'Componentes mecânicos com tolerâncias ajustadas ao seu conjunto.',
      precoTexto: 'Sob consulta',
      foto: '',
      disponivel: true,
      opcoes: [
        { nome: 'Material', usar: 'materiais' },
        { nome: 'Medidas principais', texto: true, dica: 'Ex.: diâmetro 40 mm, furo 8 mm' }
      ]
    },
    {
      id: 'gabaritos',
      nome: 'Gabaritos e dispositivos',
      categoria: 'tecnicas',
      descricao: 'Jigs, calibradores e suportes de bancada sob medida.',
      precoTexto: 'Sob consulta',
      foto: '',
      disponivel: true,
      opcoes: [
        { nome: 'Material', usar: 'materiais' },
        { nome: 'Para qual processo', texto: true, dica: 'Descreva onde vai ser usado' }
      ]
    },
    {
      id: 'chaveiro',
      nome: 'Chaveiro personalizado',
      categoria: 'personalizados',
      descricao: 'Nome, logo ou ilustração em relevo, em duas cores.',
      preco: 12,
      foto: '',
      etiqueta: 'A partir de 5 un.',
      disponivel: true,
      opcoes: [
        { nome: 'Texto do chaveiro', texto: true, dica: 'Nome ou frase curta', obrigatoria: true },
        { nome: 'Cor da base', usar: 'cores', obrigatoria: true },
        { nome: 'Cor do texto', usar: 'cores', obrigatoria: true }
      ]
    },
    {
      id: 'brindes-corporativos',
      nome: 'Brindes corporativos',
      categoria: 'personalizados',
      descricao: 'Kits com a identidade da sua empresa: troféus, porta-cartões e displays.',
      detalhes: 'Pedido mínimo de 20 peças. Envie o logo em PNG, SVG ou PDF que preparamos o modelo.',
      precoTexto: 'Sob consulta',
      foto: '',
      disponivel: true,
      opcoes: [
        { nome: 'Tipo de brinde', valores: ['Troféu', 'Porta-cartões', 'Display', 'Chaveiro', 'Outro'], obrigatoria: true },
        { nome: 'Quantidade aproximada', valores: ['20 a 50', '50 a 100', 'Mais de 100'], obrigatoria: true },
        { nome: 'Nome da empresa', texto: true }
      ]
    },
    {
      id: 'miniaturas',
      nome: 'Miniaturas e figures',
      categoria: 'colecionaveis',
      descricao: 'Impressão em resina para máximo detalhe.',
      preco: 69,
      foto: '',
      disponivel: true,
      opcoes: [
        { nome: 'Escala', valores: ['28 mm', '54 mm', '15 cm'], obrigatoria: true },
        { nome: 'Acabamento', usar: 'acabamento', obrigatoria: true }
      ]
    },
    {
      id: 'acessorios-jogos',
      nome: 'Acessórios para jogos',
      categoria: 'colecionaveis',
      descricao: 'Torres de dados, organizadores e insertos sob medida para a sua caixa.',
      preco: 79,
      foto: '',
      disponivel: true,
      opcoes: [
        { nome: 'Item', valores: ['Torre de dados', 'Porta-dados', 'Insert para caixa', 'Marcadores'], obrigatoria: true },
        { nome: 'Cor', usar: 'cores', obrigatoria: true },
        { nome: 'Qual jogo', texto: true, dica: 'Para insert sob medida' }
      ]
    }
  ]
};
