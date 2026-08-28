/* =========================================================
   Five Lines — scripts do site
   ---------------------------------------------------------
   Tudo o que precisa ser trocado antes de publicar o site
   está no objeto SITE_CONFIG abaixo.
   ========================================================= */

const SITE_CONFIG = {
  /* Número do WhatsApp no formato internacional, só dígitos.
     Irlanda: 353 + número sem o zero inicial. Ex.: 353871234567 */
  whatsapp: '353000000000',
  whatsappDisplay: '+353 00 000 0000',
  email: 'hello@fivelines.ie',
  instagram: 'fivelines',
  linkedin: 'https://www.linkedin.com/company/fivelines',
  /* Estes dois aparecem no site em português e no site em inglês (/en/).
     Escreva os dois idiomas: { pt: '...', en: '...' } */
  local: {
    pt: 'Toda a Irlanda, com envio rastreado',
    en: 'All of Ireland, with tracked delivery'
  },
  horario: {
    pt: 'Segunda a sexta, das 9h às 18h',
    en: 'Monday to Friday, 9am to 6pm'
  }
};

(function () {
  'use strict';

  /* Textos da interface por idioma. A página em inglês (/en/) usa "en"
     por causa do atributo lang do <html>. */
  const IDIOMA = (document.documentElement.lang || 'pt').toLowerCase().startsWith('en') ? 'en' : 'pt';
  const TEXTOS = {
    pt: {
      saudacao: 'Olá! Vim pelo site da Five Lines e gostaria de um orçamento.',
      carregando: 'Carregando…',
      interesse: 'Tenho interesse no produto: {p}. ',
      abertura: 'Olá, Five Lines! Gostaria de um orçamento.',
      nome: 'Nome', contato: 'Contato', servico: 'Serviço', quantidade: 'Quantidade',
      material: 'Material', prazo: 'Prazo', descricao: 'Descrição:',
      faltamCampos: 'Preencha nome, contato e a descrição do projeto para continuar.',
      pedidoMontado: 'Pedido montado! Se o WhatsApp não abrir, verifique o bloqueador de pop-ups.',
      assunto: 'Orçamento de impressão 3D — {n}',
      catalogo: 'Produto do catálogo'
    },
    en: {
      saudacao: 'Hi! I came from the Five Lines website and I would like a quote.',
      carregando: 'Loading…',
      interesse: 'I am interested in this product: {p}. ',
      abertura: 'Hello, Five Lines! I would like a quote.',
      nome: 'Name', contato: 'Contact', servico: 'Service', quantidade: 'Quantity',
      material: 'Material', prazo: 'Timing', descricao: 'Description:',
      faltamCampos: 'Please fill in your name, contact and the project description to continue.',
      pedidoMontado: 'Your request is ready. If WhatsApp does not open, check the pop-up blocker.',
      assunto: '3D printing quote — {n}',
      catalogo: 'A catalogue product'
    }
  };
  const T = TEXTOS[IDIOMA];

  // Aceita 'texto' ou { pt: '...', en: '...' }
  const porIdioma = (valor) =>
    (valor && typeof valor === 'object') ? (valor[IDIOMA] || valor.pt || '') : (valor || '');

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ---------------------------------------------------------
     Links de contato preenchidos a partir do SITE_CONFIG
     --------------------------------------------------------- */
  const whatsLink = (texto) =>
    `https://wa.me/${SITE_CONFIG.whatsapp}` + (texto ? `?text=${encodeURIComponent(texto)}` : '');

  function preencherContatos() {
    const saudacao = T.saudacao;

    $$('[data-contact]').forEach((el) => {
      const tipo = el.dataset.contact;

      if (tipo === 'whatsapp') {
        el.href = whatsLink(saudacao);
        el.target = '_blank';
        el.rel = 'noopener';
        if (el.textContent.trim() === T.carregando) el.textContent = SITE_CONFIG.whatsappDisplay;
      } else if (tipo === 'email') {
        el.href = `mailto:${SITE_CONFIG.email}`;
        if (el.textContent.trim() === T.carregando) el.textContent = SITE_CONFIG.email;
      } else if (tipo === 'instagram') {
        el.href = `https://instagram.com/${SITE_CONFIG.instagram}`;
        if (el.textContent.trim() === T.carregando) el.textContent = '@' + SITE_CONFIG.instagram;
      } else if (tipo === 'linkedin') {
        el.href = SITE_CONFIG.linkedin;
      } else if (tipo === 'local') {
        el.textContent = porIdioma(SITE_CONFIG.local);
      } else if (tipo === 'horario') {
        el.textContent = porIdioma(SITE_CONFIG.horario);
      }
    });
  }

  /* ---------------------------------------------------------
     Menu mobile
     --------------------------------------------------------- */
  function iniciarMenu() {
    const toggle = $('#navToggle');
    const nav = $('#nav');
    if (!toggle || !nav) return;

    const fechar = () => {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    };

    toggle.addEventListener('click', () => {
      const aberto = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(aberto));
    });

    nav.addEventListener('click', (e) => {
      if (e.target.closest('a')) fechar();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') fechar();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 940) fechar();
    });
  }

  /* ---------------------------------------------------------
     Sombra no cabeçalho ao rolar
     --------------------------------------------------------- */
  function iniciarHeader() {
    const header = $('#header');
    if (!header) return;
    const atualizar = () => header.classList.toggle('is-stuck', window.scrollY > 8);
    atualizar();
    window.addEventListener('scroll', atualizar, { passive: true });
  }

  /* ---------------------------------------------------------
     Filtro do catálogo
     --------------------------------------------------------- */
  function iniciarCatalogo() {
    const filtros = $$('.filter');
    const produtos = $$('#catalogo .product');
    const vazio = $('#catalogoVazio');
    if (!filtros.length || !produtos.length) return;

    filtros.forEach((botao) => {
      botao.addEventListener('click', () => {
        const alvo = botao.dataset.filter;

        filtros.forEach((f) => f.setAttribute('aria-pressed', String(f === botao)));

        let visiveis = 0;
        produtos.forEach((produto) => {
          const mostrar = alvo === 'todos' || produto.dataset.category === alvo;
          produto.classList.toggle('is-hidden', !mostrar);
          if (mostrar) visiveis++;
        });

        if (vazio) vazio.hidden = visiveis > 0;
      });
    });
  }

  /* ---------------------------------------------------------
     Botões "Orçamento" dos produtos → preenchem o formulário
     --------------------------------------------------------- */
  function iniciarBotoesProduto() {
    const descricao = $('#descricao');
    const servico = $('#servico');

    $$('[data-quote]').forEach((botao) => {
      botao.addEventListener('click', () => {
        const produto = botao.dataset.quote;

        if (servico) servico.value = T.catalogo;
        if (descricao) {
          descricao.value = T.interesse.replace('{p}', produto);
        }

        const contato = $('#contato');
        if (contato) contato.scrollIntoView({ behavior: 'smooth', block: 'start' });

        window.setTimeout(() => {
          if (descricao) {
            descricao.focus();
            descricao.setSelectionRange(descricao.value.length, descricao.value.length);
          }
        }, 500);
      });
    });
  }

  /* ---------------------------------------------------------
     Formulário de orçamento
     --------------------------------------------------------- */
  function montarMensagem(dados) {
    return [
      T.abertura,
      '',
      `${T.nome}: ${dados.nome}`,
      `${T.contato}: ${dados.contato}`,
      `${T.servico}: ${dados.servico}`,
      `${T.quantidade}: ${dados.quantidade}`,
      `${T.material}: ${dados.material}`,
      `${T.prazo}: ${dados.prazo}`,
      '',
      T.descricao,
      dados.descricao
    ].join('\n');
  }

  function coletar(form) {
    const dados = Object.fromEntries(new FormData(form).entries());
    Object.keys(dados).forEach((k) => {
      dados[k] = String(dados[k]).trim();
    });
    return dados;
  }

  function validar(form, feedback) {
    const obrigatorios = $$('[required]', form);
    const faltando = obrigatorios.filter((campo) => !campo.value.trim());

    if (faltando.length) {
      feedback.hidden = false;
      feedback.textContent = T.faltamCampos;
      faltando[0].focus();
      return false;
    }

    feedback.hidden = true;
    return true;
  }

  function iniciarFormulario() {
    const form = $('#formOrcamento');
    const feedback = $('#formFeedback');
    if (!form || !feedback) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validar(form, feedback)) return;

      const mensagem = montarMensagem(coletar(form));
      window.open(whatsLink(mensagem), '_blank', 'noopener');

      feedback.hidden = false;
      feedback.textContent = T.pedidoMontado;
    });

    const linkEmail = $('#linkEmail');
    if (linkEmail) {
      linkEmail.addEventListener('click', (e) => {
        e.preventDefault();
        if (!validar(form, feedback)) return;

        const dados = coletar(form);
        const assunto = T.assunto.replace('{n}', dados.nome);
        window.location.href =
          `mailto:${SITE_CONFIG.email}?subject=${encodeURIComponent(assunto)}` +
          `&body=${encodeURIComponent(montarMensagem(dados))}`;
      });
    }
  }

  /* ---------------------------------------------------------
     Animação de entrada dos blocos
     --------------------------------------------------------- */
  function iniciarReveal() {
    const alvos = $$('.reveal');
    if (!alvos.length) return;

    const semAnimacao =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !('IntersectionObserver' in window);

    if (semAnimacao) {
      alvos.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada, i) => {
          if (!entrada.isIntersecting) return;
          const el = entrada.target;
          window.setTimeout(() => el.classList.add('is-visible'), Math.min(i * 70, 280));
          observador.unobserve(el);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );

    alvos.forEach((el) => observador.observe(el));
  }

  /* ---------------------------------------------------------
     Ano do rodapé
     --------------------------------------------------------- */
  function iniciarAno() {
    const ano = $('#ano');
    if (ano) ano.textContent = String(new Date().getFullYear());
  }

  /* --------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    preencherContatos();
    iniciarMenu();
    iniciarHeader();
    iniciarCatalogo();
    iniciarBotoesProduto();
    iniciarFormulario();
    iniciarReveal();
    iniciarAno();
  });
})();
