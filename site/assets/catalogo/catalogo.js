/* =========================================================
   Catálogo Five Lines — funcionamento da página
   ---------------------------------------------------------
   Não é preciso mexer aqui: os dados ficam em produtos.js.
   Nada é enviado para fora da página. O pedido em andamento
   é guardado só no navegador do cliente (localStorage).
   ========================================================= */

(function () {
  'use strict';

  const dados = window.CATALOGO;
  if (!dados) return;

  const loja = dados.loja || {};
  const $ = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));

  // O pedido é guardado por idioma, para não misturar catálogos
  const CHAVE_PEDIDO = 'fivelines:pedido:' + (loja.idioma || 'pt');

  /* Textos da interface. Para outro idioma, defina "textos" no arquivo
     de dados (veja products.js da versão em inglês). */
  const PADROES = {
    tudo: 'Tudo',
    nadaEncontrado: 'Não encontramos esse item por aqui.<br>Fale com a gente no WhatsApp — provavelmente conseguimos fazer.',
    apartirDe: 'a partir de',
    indisponivel: 'Indisponível',
    indisponivelAgora: 'Indisponível no momento',
    sobConsulta: 'Sob consulta',
    opcional: 'opcional',
    erroTexto: 'preencha',
    erroEscolha: 'escolha uma opção',
    prazo: 'Prazo:',
    adicionar: 'Adicionar ao pedido',
    adicionado: 'Adicionado ao pedido',
    diminuir: 'Diminuir quantidade',
    aumentar: 'Aumentar quantidade',
    umItemNoPedido: '1 item no pedido',
    itensNoPedido: '{n} itens no pedido',
    maisSobConsulta: '+ itens sob consulta',
    valoresSobConsulta: 'Valores sob consulta',
    seuPedido: 'Seu pedido',
    umItem: '1 item',
    nItens: '{n} itens',
    pedidoVazio: 'Seu pedido está vazio.<br>Toque em um produto para começar.',
    verProdutos: 'Ver produtos',
    remover: 'remover',
    totalEstimado: 'Total estimado',
    totalParcial: 'Total parcial',
    total: 'Total',
    orcamentoPeloWhats: 'enviamos o orçamento no WhatsApp',
    limpar: 'Limpar',
    enviarNoWhats: 'Enviar no WhatsApp',
    unidades: 'un.',
    unidade: 'un.',
    cada: 'cada',
    valorSobConsulta: 'Valor sob consulta',
    somaSobConsulta: '(mais os itens sob consulta)',
    linkCopiado: 'Link copiado',
    tituloPagina: '{loja} — catálogo'
  };
  const T = Object.assign({}, PADROES, dados.textos || {});
  const txt = (chave, valores) =>
    String(T[chave] || '').replace(/\{(\w+)\}/g, (_, k) => (valores && valores[k] != null ? valores[k] : ''));
  // Desenho usado enquanto o produto não tem foto, por categoria
  const DESENHOS = {
    decoracao: 'd-vaso',
    utilidades: 'd-caixa',
    tecnicas: 'd-peca',
    personalizados: 'd-estrela',
    colecionaveis: 'd-cubo'
  };
  const DESENHO_PADRAO = 'd-cubo';

  let filtro = 'todos';
  let busca = '';
  let pedido = [];
  let atual = null;      // produto aberto no painel
  let escolhas = {};     // opções escolhidas no painel
  let quantidade = 1;

  /* ---------- utilidades ---------- */
  const esc = (t) => String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const semAcento = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  /* Formata o valor conforme o país da loja.
     Com "moeda" no código ISO (EUR, BRL, USD...), o símbolo e a posição
     saem prontos do navegador: €45.00, R$ 45,00, $45.00. */
  const dinheiro = (v) => {
    const locale = loja.locale || 'en-IE';
    const moeda = loja.moeda || 'EUR';
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency: moeda }).format(v);
    } catch (e) {
      return moeda + ' ' + Number(v).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  };

  const precoDe = (p) => {
    if (!loja.mostrarPrecos) return T.sobConsulta;
    if (typeof p.preco === 'number') return dinheiro(p.preco);
    return p.precoTexto || T.sobConsulta;
  };

  const temValor = (p) => loja.mostrarPrecos && typeof p.preco === 'number';

  const desenho = (p) => {
    if (typeof p === 'string') {
      const achado = (dados.produtos || []).find((x) => x.id === p);
      p = achado || { categoria: '' };
    }
    return p.desenho || DESENHOS[p.categoria] || DESENHO_PADRAO;
  };

  // Caminho da foto: nome do arquivo + a pasta configurada em loja.pastaFotos
  const caminhoFoto = (foto) =>
    /^(https?:)?\//.test(foto) ? foto : (loja.pastaFotos || '') + foto;

  const arteDe = (p, classe) => p.foto
    ? `<img src="${esc(caminhoFoto(p.foto))}" alt="${esc(p.nome)}" loading="lazy">`
    : `<svg class="${classe || ''}" aria-hidden="true"><use href="#${desenho(p)}"></use></svg>`;

  const valoresDaOpcao = (opcao) =>
    opcao.valores || (opcao.usar && dados.listas ? dados.listas[opcao.usar] : null) || [];

  /* ---------- link do WhatsApp ---------- */
  function linkWhats(texto) {
    return 'https://wa.me/' + (loja.whatsapp || '') + (texto ? '?text=' + encodeURIComponent(texto) : '');
  }

  /* ---------- montagem da vitrine ---------- */
  function montarFiltros() {
    const alvo = $('#chips');
    const cats = [{ id: 'todos', nome: T.tudo }].concat(dados.categorias || []);
    alvo.innerHTML = cats.map((c, i) =>
      `<button class="chip" type="button" data-cat="${esc(c.id)}" aria-pressed="${i === 0}">${esc(c.nome)}</button>`
    ).join('');

    alvo.addEventListener('click', (e) => {
      const botao = e.target.closest('.chip');
      if (!botao) return;
      filtro = botao.dataset.cat;
      $$('.chip', alvo).forEach((c) => c.setAttribute('aria-pressed', String(c === botao)));
      montarGrade();
    });
  }

  function produtosVisiveis() {
    const termo = semAcento(busca).trim();
    return (dados.produtos || []).filter((p) => {
      if (filtro !== 'todos' && p.categoria !== filtro) return false;
      if (!termo) return true;
      return semAcento(p.nome + ' ' + (p.descricao || '') + ' ' + (p.detalhes || '')).includes(termo);
    });
  }

  function montarGrade() {
    const lista = produtosVisiveis();
    const grade = $('#grade');

    if (!lista.length) {
      grade.innerHTML = `<p class="vazio">${T.nadaEncontrado}</p>`;
      return;
    }

    grade.innerHTML = lista.map((p) => {
      const fora = p.disponivel === false;
      const etiqueta = fora
        ? `<span class="etiqueta etiqueta--fora">${esc(T.indisponivel)}</span>`
        : (p.etiqueta ? `<span class="etiqueta">${esc(p.etiqueta)}</span>` : '');
      const apartir = temValor(p) && (p.opcoes || []).length ? `<small>${esc(T.apartirDe)}</small>` : '';

      return `
        <button class="card${fora ? ' card--fora' : ''}" type="button" data-id="${esc(p.id)}">
          <span class="card__foto">${etiqueta}${arteDe(p)}</span>
          <span class="card__corpo">
            <span class="card__nome">${esc(p.nome)}</span>
            <span class="card__desc">${esc(p.descricao || '')}</span>
            <span class="card__preco">${esc(precoDe(p))}${apartir}</span>
          </span>
        </button>`;
    }).join('');
  }

  /* ---------- painel do produto ---------- */
  function abrirProduto(id) {
    const p = (dados.produtos || []).find((x) => x.id === id);
    if (!p) return;

    atual = p;
    escolhas = {};
    quantidade = 1;

    $('#painelTitulo').textContent = p.nome;
    $('#painelSub').textContent = precoDe(p);

    const prazo = p.prazo || loja.prazoPadrao;
    const opcoes = (p.opcoes || []).map((op, i) => {
      const valores = valoresDaOpcao(op);
      const obrig = op.obrigatoria ? '' : `<em>${esc(T.opcional)}</em>`;

      if (op.texto) {
        return `
          <div class="opcao" data-opcao="${i}">
            <div class="opcao__titulo">${esc(op.nome)} ${obrig}<span class="opcao__erro" hidden>${esc(T.erroTexto)}</span></div>
            <input type="text" data-campo="${i}" placeholder="${esc(op.dica || '')}" maxlength="80">
          </div>`;
      }

      return `
        <div class="opcao" data-opcao="${i}">
          <div class="opcao__titulo">${esc(op.nome)} ${obrig}<span class="opcao__erro" hidden>${esc(T.erroEscolha)}</span></div>
          <div class="valores">
            ${valores.map((v) => `<button class="valor" type="button" data-i="${i}" data-v="${esc(v)}" aria-pressed="false">${esc(v)}</button>`).join('')}
          </div>
        </div>`;
    }).join('');

    $('#painelConteudo').innerHTML = `
      <div class="produto__foto">${arteDe(p)}</div>
      <p class="produto__desc">${esc(p.detalhes || p.descricao || '')}</p>
      ${prazo ? `<p class="produto__prazo"><svg aria-hidden="true"><use href="#i-relogio"></use></svg> ${esc(T.prazo)} ${esc(prazo)}</p>` : ''}
      ${opcoes}
    `;

    $('#painelPe').innerHTML = p.disponivel === false
      ? `<button class="btn btn--simples btn--cheio" type="button" disabled>${esc(T.indisponivelAgora)}</button>`
      : `
        <div class="qtd">
          <button type="button" id="menos" aria-label="${esc(T.diminuir)}">−</button>
          <span id="qtdValor">1</span>
          <button type="button" id="mais" aria-label="${esc(T.aumentar)}">+</button>
        </div>
        <button class="btn btn--marca btn--cheio" type="button" id="addPedido">${esc(T.adicionar)}</button>`;

    $('#painel').classList.add('aberto');
    document.body.classList.add('travado');
    $('#painelFechar').focus();

    try {
      history.replaceState(null, '', '?p=' + encodeURIComponent(p.id));
    } catch (e) { /* file:// não permite */ }
  }

  function fecharPainel() {
    $('#painel').classList.remove('aberto');
    document.body.classList.remove('travado');
    atual = null;
    try { history.replaceState(null, '', location.pathname); } catch (e) {}
  }

  function ligarPainel() {
    $('#grade').addEventListener('click', (e) => {
      const card = e.target.closest('.card');
      if (card) abrirProduto(card.dataset.id);
    });

    $('#painelFechar').addEventListener('click', fecharPainel);
    $('#painelFundo').addEventListener('click', fecharPainel);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && $('#painel').classList.contains('aberto')) fecharPainel();
    });

    $('#painelConteudo').addEventListener('click', (e) => {
      const botao = e.target.closest('.valor');
      if (!botao) return;
      const i = botao.dataset.i;
      escolhas[i] = botao.dataset.v;
      $$(`.valor[data-i="${i}"]`).forEach((b) => b.setAttribute('aria-pressed', String(b === botao)));
      const erro = botao.closest('.opcao').querySelector('.opcao__erro');
      if (erro) erro.hidden = true;
    });

    $('#painelConteudo').addEventListener('input', (e) => {
      const campo = e.target.closest('input[data-campo]');
      if (!campo) return;
      escolhas[campo.dataset.campo] = campo.value.trim();
      const erro = campo.closest('.opcao').querySelector('.opcao__erro');
      if (erro) erro.hidden = true;
    });

    $('#painelPe').addEventListener('click', (e) => {
      if (e.target.closest('#menos') && quantidade > 1) atualizarQtd(quantidade - 1);
      if (e.target.closest('#mais') && quantidade < 99) atualizarQtd(quantidade + 1);
      if (e.target.closest('#addPedido')) adicionarAoPedido();
    });
  }

  function atualizarQtd(v) {
    quantidade = v;
    const alvo = $('#qtdValor');
    if (alvo) alvo.textContent = String(v);
    const menos = $('#menos');
    if (menos) menos.disabled = v <= 1;
  }

  function adicionarAoPedido() {
    const p = atual;
    if (!p) return;

    let faltou = null;
    (p.opcoes || []).forEach((op, i) => {
      if (!op.obrigatoria) return;
      if (escolhas[i]) return;
      const bloco = $(`.opcao[data-opcao="${i}"]`);
      const erro = bloco && bloco.querySelector('.opcao__erro');
      if (erro) erro.hidden = false;
      if (!faltou) faltou = bloco;
    });
    if (faltou) {
      faltou.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const escolhidas = (p.opcoes || [])
      .map((op, i) => (escolhas[i] ? { nome: op.nome, valor: escolhas[i] } : null))
      .filter(Boolean);

    const assinatura = p.id + '|' + escolhidas.map((o) => o.nome + '=' + o.valor).join('|');
    const existente = pedido.find((it) => it.assinatura === assinatura);

    if (existente) {
      existente.qtd = Math.min(99, existente.qtd + quantidade);
    } else {
      pedido.push({
        assinatura,
        id: p.id,
        nome: p.nome,
        foto: p.foto || '',
        preco: temValor(p) ? p.preco : null,
        precoTexto: precoDe(p),
        opcoes: escolhidas,
        qtd: quantidade
      });
    }

    salvarPedido();
    fecharPainel();
    atualizarBarra();
    avisar(T.adicionado);
  }

  /* ---------- pedido ---------- */
  function salvarPedido() {
    try { localStorage.setItem(CHAVE_PEDIDO, JSON.stringify(pedido)); } catch (e) {}
  }

  function carregarPedido() {
    try {
      const guardado = JSON.parse(localStorage.getItem(CHAVE_PEDIDO) || '[]');
      if (Array.isArray(guardado)) {
        const ids = new Set((dados.produtos || []).map((p) => p.id));
        pedido = guardado.filter((it) => it && ids.has(it.id));
      }
    } catch (e) { pedido = []; }
  }

  const totalItens = () => pedido.reduce((s, it) => s + it.qtd, 0);
  const totalValor = () => pedido.reduce((s, it) => s + (it.preco || 0) * it.qtd, 0);
  const temSobConsulta = () => pedido.some((it) => it.preco == null);

  function atualizarBarra() {
    const barra = $('#pedidoBarra');
    const n = totalItens();

    if (!n) {
      barra.classList.remove('visivel');
      document.body.classList.add('sem-barra');
      return;
    }

    document.body.classList.remove('sem-barra');
    barra.classList.add('visivel');
    $('#barraQtd').textContent = n === 1 ? T.umItemNoPedido : txt('itensNoPedido', { n: n });
    $('#barraTotal').textContent = loja.mostrarPrecos
      ? (temSobConsulta() ? dinheiro(totalValor()) + ' ' + T.maisSobConsulta : dinheiro(totalValor()))
      : T.valoresSobConsulta;
  }

  function abrirPedido() {
    $('#copiado').classList.remove('visivel');   // evita o aviso sobre o resumo
    $('#painelTitulo').textContent = T.seuPedido;
    $('#painelSub').textContent = totalItens() === 1 ? T.umItem : txt('nItens', { n: totalItens() });

    if (!pedido.length) {
      $('#painelConteudo').innerHTML = `<p class="aviso-vazio">${T.pedidoVazio}</p>`;
      $('#painelPe').innerHTML = `<button class="btn btn--simples btn--cheio" type="button" id="voltarCatalogo">${esc(T.verProdutos)}</button>`;
    } else {
      const itens = pedido.map((it, i) => `
        <div class="item">
          <span class="item__foto">${it.foto
            ? `<img src="${esc(caminhoFoto(it.foto))}" alt="">`
            : `<svg aria-hidden="true"><use href="#${desenho(it.id)}"></use></svg>`}</span>
          <span class="item__txt">
            <strong>${esc(it.nome)}</strong>
            ${it.opcoes.length ? `<span class="item__opcoes">${esc(it.opcoes.map((o) => o.nome + ': ' + o.valor).join(' · '))}</span>` : ''}
            <span class="item__linha">
              <span class="item__preco">${it.qtd} × ${esc(it.preco != null ? dinheiro(it.preco) : it.precoTexto)}</span>
              <button class="item__remover" type="button" data-remover="${i}">${esc(T.remover)}</button>
            </span>
          </span>
        </div>`).join('');

      const total = loja.mostrarPrecos
        ? `<div class="total"><span>${esc(temSobConsulta() ? T.totalParcial : T.totalEstimado)}</span>
             <span>${dinheiro(totalValor())}${temSobConsulta() ? `<small>${esc(T.maisSobConsulta)}</small>` : ''}</span>
           </div>`
        : `<div class="total"><span>${esc(T.total)}</span><span>${esc(T.sobConsulta)}<small>${esc(T.orcamentoPeloWhats)}</small></span></div>`;

      $('#painelConteudo').innerHTML = itens + total;
      $('#painelPe').innerHTML = `
        <button class="btn btn--simples" type="button" id="limparPedido">${esc(T.limpar)}</button>
        <a class="btn btn--whats btn--cheio" id="enviarPedido" href="#" target="_blank" rel="noopener">
          <svg aria-hidden="true"><use href="#i-whats"></use></svg> ${esc(T.enviarNoWhats)}
        </a>`;
      $('#enviarPedido').href = linkWhats(mensagemDoPedido());
    }

    $('#painel').classList.add('aberto');
    document.body.classList.add('travado');
  }

  function mensagemDoPedido() {
    const linhas = [loja.saudacao || 'Olá! Gostaria de fazer um pedido.', ''];

    pedido.forEach((it, i) => {
      linhas.push(`${i + 1}) ${it.nome} — ${it.qtd} ${it.qtd === 1 ? (T.unidade || T.unidades) : T.unidades}`);
      it.opcoes.forEach((o) => linhas.push(`   • ${o.nome}: ${o.valor}`));
      if (it.preco != null) {
        linhas.push(`   ${dinheiro(it.preco)} ${T.cada}` + (it.qtd > 1 ? ` — ${dinheiro(it.preco * it.qtd)}` : ''));
      } else {
        linhas.push('   ' + T.valorSobConsulta);
      }
      linhas.push('');
    });

    if (loja.mostrarPrecos && totalValor() > 0) {
      linhas.push(`${temSobConsulta() ? T.totalParcial : T.totalEstimado}: ${dinheiro(totalValor())}`);
      if (temSobConsulta()) linhas.push(T.somaSobConsulta);
    }

    return linhas.join('\n');
  }

  function ligarPedido() {
    $('#pedidoBarra').addEventListener('click', (e) => {
      if (e.target.closest('#verPedido')) abrirPedido();
    });

    $('#painelConteudo').addEventListener('click', (e) => {
      const remover = e.target.closest('[data-remover]');
      if (!remover) return;
      pedido.splice(Number(remover.dataset.remover), 1);
      salvarPedido();
      atualizarBarra();
      abrirPedido();
    });

    $('#painelPe').addEventListener('click', (e) => {
      if (e.target.closest('#limparPedido')) {
        pedido = [];
        salvarPedido();
        atualizarBarra();
        abrirPedido();
      }
      if (e.target.closest('#voltarCatalogo')) fecharPainel();
    });
  }

  /* ---------- busca ---------- */
  function ligarBusca() {
    const campo = $('#campoBusca');
    const limpar = $('#limparBusca');

    campo.addEventListener('input', () => {
      busca = campo.value;
      limpar.classList.toggle('visivel', busca.length > 0);
      montarGrade();
    });

    limpar.addEventListener('click', () => {
      campo.value = '';
      busca = '';
      limpar.classList.remove('visivel');
      montarGrade();
      campo.focus();
    });
  }

  /* ---------- compartilhar ---------- */
  function avisar(texto) {
    const aviso = $('#copiado');
    aviso.textContent = texto;
    aviso.classList.add('visivel');
    clearTimeout(avisar.tempo);
    avisar.tempo = setTimeout(() => aviso.classList.remove('visivel'), 2200);
  }

  function ligarCompartilhar() {
    $('#compartilhar').addEventListener('click', async () => {
      const url = location.href.split('?')[0];
      const titulo = txt('tituloPagina', { loja: loja.nome });

      if (navigator.share) {
        try { await navigator.share({ title: titulo, text: loja.slogan || '', url }); return; } catch (e) { return; }
      }
      try {
        await navigator.clipboard.writeText(url);
        avisar(T.linkCopiado);
      } catch (e) {
        avisar(url);
      }
    });
  }

  /* ---------- ligar tudo ---------- */
  function preencherTextos() {
    document.title = txt('tituloPagina', { loja: loja.nome || '' });
    $('#lojaNome').textContent = loja.nome || '';
    $('#lojaSlogan').textContent = loja.slogan || '';

    const whats = linkWhats(loja.saudacao || '');
    $$('[data-whats]').forEach((a) => { a.href = whats; });

    const insta = $('#linkInsta');
    if (loja.instagram) {
      insta.href = 'https://instagram.com/' + loja.instagram;
    } else {
      insta.remove();
    }

    const preencher = (sel, texto) => $$(sel).forEach((el) => { el.textContent = texto || ''; });
    preencher('#pePrazo, #pePrazo2', loja.prazoPadrao);
    preencher('#peEntrega, #peEntrega2', loja.entrega);
    preencher('#pePagamento', loja.pagamento);
    $('#peAno').textContent = new Date().getFullYear();
    $('#peNome').textContent = loja.nome || '';

    const aviso = $('#peAviso');
    if (loja.aviso) aviso.textContent = loja.aviso; else aviso.remove();

    $$('.topo__info span').forEach((s) => { if (!s.textContent.trim()) s.remove(); });
  }

  function abrirDoLink() {
    const busca = new URLSearchParams(location.search);
    const id = busca.get('p');
    if (id) abrirProduto(id);
  }

  preencherTextos();
  montarFiltros();
  montarGrade();
  ligarBusca();
  ligarPainel();
  carregarPedido();
  ligarPedido();
  atualizarBarra();
  ligarCompartilhar();
  abrirDoLink();
})();
