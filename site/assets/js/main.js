/* =========================================================
   Five Lines — scripts do site
   ---------------------------------------------------------
   Tudo o que precisa ser trocado antes de publicar o site
   está no objeto SITE_CONFIG abaixo.
   ========================================================= */

const SITE_CONFIG = {
  /* Número do WhatsApp no formato internacional, só dígitos:
     55 (Brasil) + DDD + número. Ex.: 5511987654321  */
  whatsapp: '5599999999999',
  whatsappDisplay: '(00) 00000-0000',
  email: 'contato@fivelines.com.br',
  instagram: 'fivelines',
  linkedin: 'https://www.linkedin.com/company/fivelines',
  local: 'Todo o Brasil, com envio rastreado',
  horario: 'Segunda a sexta, das 9h às 18h'
};

(function () {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ---------------------------------------------------------
     Links de contato preenchidos a partir do SITE_CONFIG
     --------------------------------------------------------- */
  const whatsLink = (texto) =>
    `https://wa.me/${SITE_CONFIG.whatsapp}` + (texto ? `?text=${encodeURIComponent(texto)}` : '');

  function preencherContatos() {
    const saudacao = 'Olá! Vim pelo site da Five Lines e gostaria de um orçamento.';

    $$('[data-contact]').forEach((el) => {
      const tipo = el.dataset.contact;

      if (tipo === 'whatsapp') {
        el.href = whatsLink(saudacao);
        el.target = '_blank';
        el.rel = 'noopener';
        if (el.textContent.trim() === 'Carregando…') el.textContent = SITE_CONFIG.whatsappDisplay;
      } else if (tipo === 'email') {
        el.href = `mailto:${SITE_CONFIG.email}`;
        if (el.textContent.trim() === 'Carregando…') el.textContent = SITE_CONFIG.email;
      } else if (tipo === 'instagram') {
        el.href = `https://instagram.com/${SITE_CONFIG.instagram}`;
        if (el.textContent.trim() === 'Carregando…') el.textContent = '@' + SITE_CONFIG.instagram;
      } else if (tipo === 'linkedin') {
        el.href = SITE_CONFIG.linkedin;
      } else if (tipo === 'local') {
        el.textContent = SITE_CONFIG.local;
      } else if (tipo === 'horario') {
        el.textContent = SITE_CONFIG.horario;
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

        if (servico) servico.value = 'Produto do catálogo';
        if (descricao) {
          descricao.value = `Tenho interesse no produto: ${produto}. `;
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
      'Olá, Five Lines! Gostaria de um orçamento.',
      '',
      `Nome: ${dados.nome}`,
      `Contato: ${dados.contato}`,
      `Serviço: ${dados.servico}`,
      `Quantidade: ${dados.quantidade}`,
      `Material: ${dados.material}`,
      `Prazo: ${dados.prazo}`,
      '',
      'Descrição:',
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
      feedback.textContent = 'Preencha nome, contato e a descrição do projeto para continuar.';
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
      feedback.textContent = 'Pedido montado! Se o WhatsApp não abrir, verifique o bloqueador de pop-ups.';
    });

    const linkEmail = $('#linkEmail');
    if (linkEmail) {
      linkEmail.addEventListener('click', (e) => {
        e.preventDefault();
        if (!validar(form, feedback)) return;

        const dados = coletar(form);
        const assunto = `Orçamento de impressão 3D — ${dados.nome}`;
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
