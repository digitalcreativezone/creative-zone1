/* Digital Creative Zone - animated portfolio mockups
   Add before </body> in index.html:  <script src="anim.js" defer></script> */
(function () {
  'use strict';
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var NS = 'http://www.w3.org/2000/svg';

  /* ---------- CSS ---------- */
  var css = [
    '.dcz-float{animation:dczFloat 3.8s ease-in-out infinite}',
    '@keyframes dczFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}',
    '.dcz-swing{transform-origin:250px 0;animation:dczSwing 3.2s ease-in-out infinite alternate}',
    '@keyframes dczSwing{from{transform:rotate(-2.5deg)}to{transform:rotate(2.5deg)}}',
    '.dcz-sway{transform-origin:200px 0;animation:dczSway 4.2s ease-in-out infinite alternate}',
    '@keyframes dczSway{from{transform:rotate(-1.3deg)}to{transform:rotate(1.3deg)}}',
    '.dcz-pulse{transform-box:fill-box;transform-origin:center;animation:dczPulse 1.6s ease-in-out infinite}',
    '@keyframes dczPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}',
    '.dcz-twinkle{transform-box:fill-box;transform-origin:center;opacity:0;animation:dczTw 2.6s ease-in-out infinite}',
    '@keyframes dczTw{0%,100%{opacity:0;transform:scale(.4)}50%{opacity:.9;transform:scale(1.5)}}',
    '.dcz-sweep{animation:dczSweep 4.8s ease-in-out infinite}',
    '@keyframes dczSweep{0%{transform:translateX(-120px)}55%,100%{transform:translateX(520px)}}',
    '.dcz-steam{animation:dczSteam 2.4s ease-in-out infinite}',
    '@keyframes dczSteam{0%{opacity:0;transform:translateY(4px)}40%{opacity:.7}100%{opacity:0;transform:translateY(-8px)}}',
    '.dcz-dash{animation:dczDash 1.2s linear infinite}',
    '@keyframes dczDash{to{stroke-dashoffset:-6}}',
    '.dcz-off svg *{animation-play-state:paused!important}'
  ].join('\n');
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  /* ---------- Shared shine gradient ---------- */
  var defs = document.createElementNS(NS, 'svg');
  defs.setAttribute('width', '0');
  defs.setAttribute('height', '0');
  defs.setAttribute('aria-hidden', 'true');
  defs.style.position = 'absolute';
  defs.innerHTML = '<defs><linearGradient id="dczShine" x1="0" y1="0" x2="1" y2="0">' +
    '<stop offset="0" stop-color="#fff" stop-opacity="0"/>' +
    '<stop offset=".5" stop-color="#fff" stop-opacity=".9"/>' +
    '<stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>';
  document.body.appendChild(defs);

  /* ---------- Helpers ---------- */
  function wrap(el, cls, delay) {
    var g = document.createElementNS(NS, 'g');
    g.setAttribute('class', cls);
    if (delay) g.style.animationDelay = delay + 's';
    el.parentNode.insertBefore(g, el);
    g.appendChild(el);
    return g;
  }

  var PULSE_TEXT = ['GRAND OPENING', 'UP TO 30% OFF', 'SALE', 'NEW BATCH: 5 MAY',
    'FREE HOME DELIVERY', 'Order Now', 'Order on WA \u2197', 'ONLY', '\u20B9149'];

  var likeSteps = ['1.4K', '1.5K', '1.6K', '1.7K'];
  var likeNodes = [];

  function animate(svg, idx) {
    if (svg.getAttribute('data-dcz')) return;
    svg.setAttribute('data-dcz', '1');
    var i;

    /* 1. Pulse badges, buttons, offers */
    svg.querySelectorAll('text').forEach(function (t) {
      var s = t.textContent.trim();
      if (PULSE_TEXT.indexOf(s) > -1) {
        t.classList.add('dcz-pulse');
        var pv = t.previousElementSibling;
        if (pv && pv.tagName.toLowerCase() === 'rect' && s !== 'ONLY' && s !== '\u20B9149') {
          pv.classList.add('dcz-pulse');
        }
      }
      if (s.indexOf('1.4K Likes') > -1) likeNodes.push(t);
    });
    svg.querySelectorAll('circle[r="17"]').forEach(function (c) { c.classList.add('dcz-pulse'); });

    /* 2. Logo leaf + construction grid */
    svg.querySelectorAll('path[d^="M130 76"]').forEach(function (p) { p.classList.add('dcz-pulse'); });
    svg.querySelectorAll('g[stroke-dasharray] > *').forEach(function (n) { n.classList.add('dcz-dash'); });

    /* 3. Coffee steam */
    svg.querySelectorAll('path[d^="M255 78"]').forEach(function (p) { p.classList.add('dcz-steam'); });

    /* 4. Float / swing top-level transformed groups */
    var kids = Array.prototype.slice.call(svg.children);
    var n = 0;
    kids.forEach(function (k) {
      if (k.tagName.toLowerCase() !== 'g' || !k.getAttribute('transform')) return;
      if (k.querySelector('path[stroke="#1d4ed8"]')) {
        wrap(k, 'dcz-swing');
      } else {
        wrap(k, 'dcz-float', -(n * 1.1));
        n++;
      }
    });

    /* 5. Festival banner hangs and sways */
    if (idx === 1) {
      var rest = Array.prototype.slice.call(svg.children).slice(2);
      var sway = document.createElementNS(NS, 'g');
      sway.setAttribute('class', 'dcz-sway');
      svg.insertBefore(sway, rest[0]);
      rest.forEach(function (r) { sway.appendChild(r); });
    }

    /* 6. Light sweep across every mockup */
    var sw = document.createElementNS(NS, 'g');
    sw.setAttribute('class', 'dcz-sweep');
    sw.style.animationDelay = (idx * 0.4) + 's';
    sw.setAttribute('pointer-events', 'none');
    sw.innerHTML = '<polygon points="0,0 70,0 40,250 -30,250" fill="url(#dczShine)" opacity=".16"/>';
    svg.appendChild(sw);

    /* 7. Twinkling sparkles */
    var sp = document.createElementNS(NS, 'g');
    sp.setAttribute('pointer-events', 'none');
    for (i = 0; i < 7; i++) {
      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', (idx * 53 + i * 67) % 380 + 10);
      c.setAttribute('cy', (idx * 29 + i * 41) % 220 + 12);
      c.setAttribute('r', (i % 3) * 0.5 + 1.2);
      c.setAttribute('fill', '#fff');
      c.setAttribute('class', 'dcz-twinkle');
      c.style.animationDelay = (i * 0.45) + 's';
      sp.appendChild(c);
    }
    svg.appendChild(sp);
  }

  /* ---------- Run on grid cards + modal slides ---------- */
  document.querySelectorAll('.work-thumb svg').forEach(function (svg) {
    var card = svg.closest('.work-card');
    var idx = card ? Array.prototype.indexOf.call(card.parentNode.children, card) : 0;
    animate(svg, idx);
  });

  /* ---------- Live like counter on the social ad ---------- */
  var step = 0;
  setInterval(function () {
    if (document.hidden || !likeNodes.length) return;
    step = (step + 1) % likeSteps.length;
    likeNodes.forEach(function (t) {
      t.textContent = '\u2764\uFE0F ' + likeSteps[step] + ' Likes';
    });
  }, 2200);

  /* ---------- Pause animations when off-screen ---------- */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { e.target.classList.toggle('dcz-off', !e.isIntersecting); });
    }, { threshold: 0.05 });
    document.querySelectorAll('.work-thumb').forEach(function (t) { io.observe(t); });
  }
})();
