(function () {
  'use strict';

  let SERVICES = [];
  let HOURS = [['Sun – Sat', '9:00 AM – 9:00 PM']];
  let WA_NUMBER = '918730074910';
  let cfg = null;
  let offerClosed = false;
  let lang = 'en';
  let lastSig = '';
  let lastWhatsAppMsg = '';

  /* ===== Lightweight Analytics Helper (Plausible + GA4 compatible) ===== */
  function trackEvent(eventName, props) {
    try {
      if (typeof window.plausible === 'function') {
        window.plausible(eventName, { props: props || {} });
      }
      if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, props || {});
      }
    } catch (_) {}
  }

  /* ===== Firebase: on-demand order saving (Firestore) ===== */
  const FB_CONFIG = {
    apiKey: "AIzaSyBxJ00FIAZwrA04gImSBGHNC0T5g5ESxL0",
    authDomain: "dcz-orders.firebaseapp.com",
    projectId: "dcz-orders",
    storageBucket: "dcz-orders.firebasestorage.app",
    messagingSenderId: "635278999444",
    appId: "1:635278999444:web:b97c53a105f6f7176f9981"
  };
  let fbPromise = null;

  function loadScript(src) {
    return new Promise(function (ok, fail) {
      const s = document.createElement('script');
      s.src = src;
      s.onload = ok;
      s.onerror = fail;
      document.head.appendChild(s);
    });
  }

  function loadFirebase() {
    if (fbPromise) return fbPromise;
    fbPromise = loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js')
      .then(function () {
        return loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js');
      })
      .then(function () {
        if (!firebase.apps.length) firebase.initializeApp(FB_CONFIG);
        return firebase.firestore();
      })
      .catch(function () {
        fbPromise = null;
        return null;
      });
    return fbPromise;
  }

  (function preloadFirebaseWhenNear() {
    const f = document.getElementById('orderForm');
    const r = document.getElementById('repeatBtn');
    const s = document.getElementById('order');
    [f, r].forEach(function (el) {
      if (!el) return;
      ['focusin', 'pointerdown', 'touchstart'].forEach(function (ev) {
        el.addEventListener(ev, loadFirebase, { once: true, passive: true });
      });
    });
    if (s && 'IntersectionObserver' in window) {
      const o = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) {
          loadFirebase();
          o.disconnect();
        }
      }, { rootMargin: '400px' });
      o.observe(s);
    }
  })();

  /* ===== Telegram Order Alert ===== */
  const ALERT_URL = "https://dcz-alerts.sourajyotidebnath57.workers.dev";

  function sendTelegramAlert(o, msg) {
    try {
      if (!ALERT_URL || ALERT_URL.indexOf('PASTE_') === 0) return;
      const svc = (SERVICES[o.svc] && SERVICES[o.svc].name) || '-';
      const text =
        '🚨 New Order Received! — DCZ\n' +
        '━━━━━━━━━━━━━━━━━━\n' +
        '👤 Name: ' + (o.name || '-') + '\n' +
        '📞 Phone: ' + (o.phone || '-') + '\n' +
        '🛠 Service: ' + svc + '\n' +
        '📦 Order Details:\n' + (msg || '-') + '\n' +
        '━━━━━━━━━━━━━━━━━━\n' +
        '⏰ Time: ' + new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      fetch(ALERT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify({ text: text }),
        keepalive: true
      }).catch(function () {});
    } catch (_) {}
  }

  function saveOrder(o, msg) {
    sendTelegramAlert(o, msg);
    loadFirebase().then(function (db) {
      if (!db || !SERVICES[o.svc]) return;
      try {
        db.collection('orders').add({
          name: o.name,
          phone: o.phone || '',
          service: SERVICES[o.svc].name,
          size: o.size || '',
          qty: o.qty,
          print: o.print,
          deadline: o.date || '',
          text: msg,
          status: 'new',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(function () {});
      } catch (_) {}
    });
  }

  /* ===== DOM Elements ===== */
  const listEl = document.getElementById('list');
  const tabsEl = document.getElementById('tabs');
  const portfolioTabs = document.getElementById('portfolioTabs');
  const modalEl = document.getElementById('modal');
  const sampBtn = document.getElementById('sampBtn');
  const xBtn = document.getElementById('xBtn');
  const portfolioGrid = document.getElementById('portfolioGrid');
  const menuBtn = document.getElementById('menuBtn');
  const mobileNav = document.getElementById('mobileNav');
  const waFab = document.getElementById('waFab');
  const oService = document.getElementById('oService');
  const svcEstimate = document.getElementById('svcEstimate');
  const orderThanks = document.getElementById('orderThanks');
  const reopenWaBtn = document.getElementById('reopenWaBtn');
  const newOrderBtn = document.getElementById('newOrderBtn');

  document.getElementById('yr').textContent = new Date().getFullYear();

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ===== Mobile Quick-Jump Menu Toggle ===== */
  const navBackdrop = document.createElement('div');
  navBackdrop.className = 'nav-backdrop';
  document.body.appendChild(navBackdrop);

  function setMenu(open) {
    mobileNav.classList.toggle('open', open);
    navBackdrop.classList.toggle('show', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuBtn.textContent = open ? '✕' : '☰';
  }
  menuBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    setMenu(!mobileNav.classList.contains('open'));
  });
  mobileNav.addEventListener('click', function (e) {
    if (e.target.closest('a')) setMenu(false);
  });
  document.addEventListener('click', function (e) {
    if (mobileNav.classList.contains('open') && !mobileNav.contains(e.target) && !menuBtn.contains(e.target)) {
      setMenu(false);
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && mobileNav.classList.contains('open')) setMenu(false);
  });

  /* ===== Auto-hide Floating WhatsApp Button ===== */
  let formFocused = false, zoneVisible = false;
  function updateFabVisibility() {
    if (!waFab) return;
    waFab.classList.toggle('fab-hidden', formFocused || zoneVisible);
  }
  const orderSec = document.getElementById('order');
  const contactSec = document.getElementById('contact');
  if (orderSec) {
    orderSec.addEventListener('focusin', function () { formFocused = true; updateFabVisibility(); });
    orderSec.addEventListener('focusout', function () {
      setTimeout(function () {
        formFocused = orderSec.contains(document.activeElement);
        updateFabVisibility();
      }, 150);
    });
  }
  if ('IntersectionObserver' in window) {
    const visMap = new Map();
    const obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { visMap.set(en.target, en.isIntersecting); });
      zoneVisible = Boolean(visMap.get(orderSec) || visMap.get(contactSec));
      updateFabVisibility();
    }, { threshold: 0.25 });
    if (orderSec) obs.observe(orderSec);
    if (contactSec) obs.observe(contactSec);
  }

  /* ===== Toast Notification ===== */
  let toastTimer = null;
  function showToast(msg) {
    const toastEl = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    if (!toastEl || !toastMsg) return;
    toastMsg.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('show');
    }, 3200);
  }

  document.addEventListener('copy', function () {
    showToast(lang === 'bn' ? 'ক্লিপবোর্ডে টেক্সট কপি করা হয়েছে!' : 'Copied to clipboard!');
  });

  function priceRange(item) {
    const hi = (item.p2 || '').replace(/^up to\s*/i, '');
    return hi ? item.p1 + ' – ' + hi : item.p1;
  }

  function typicalDelivery(item, isBn) {
    if (isBn && item.bnDelivery) return item.bnDelivery;
    if (item.delivery) return item.delivery;
    if (item.cat === 'web') return isBn ? '৩–৭ দিন' : '3–7 days';
    if (item.cat === 'brand') return isBn ? '২৪–৪৮ ঘণ্টা' : '24–48 hrs';
    return isBn ? '২৪ ঘণ্টা' : '24 hrs';
  }

  /* ===== Render Services from config.json ===== */
  function renderServices() {
    if (!SERVICES.length) return;
    const bn = lang === 'bn';
    const markup = SERVICES.map(function (item, n) {
      const waText = encodeURIComponent("Hi Digital Creative Zone, I'd like a quote for " + item.name + " (" + priceRange(item) + ").");
      const svcName = bn ? (item.bnName || item.name) : item.name;
      const svcDesc = bn ? (item.bnDesc || item.desc) : item.desc;
      const fromTxt = bn ? 'শুরু থেকে' : 'Starting from';
      const p2Txt = bn ? (item.p2 || '').replace(/^up to\s*/i, 'সর্বোচ্চ ') : (item.p2 || '');
      const btnTxt = bn ? 'জানুন →' : 'Enquire →';
      return (
        '<article class="item" data-cat="' + esc(item.cat) + '" data-service-name="' + esc(item.name) + '" style="--c: ' + esc(item.color) + '; --i: ' + n + '">' +
          '<div class="item-top">' +
            '<div class="ico" aria-hidden="true"><svg viewBox="0 0 24 24">' + (item.icon || '') + '</svg></div>' +
            '<div class="name">' + esc(svcName) + '<small>' + esc(svcDesc) + '</small></div>' +
          '</div>' +
          '<div class="item-bottom">' +
            '<div class="prices">' +
              '<div class="from">' + fromTxt + '</div>' +
              '<div class="p1">' + esc(item.p1) + '</div>' +
              (p2Txt ? '<div class="p2">' + esc(p2Txt) + '</div>' : '') +
            '</div>' +
            '<a class="item-quote" data-track-service="' + esc(item.name) + '" href="https://wa.me/' + WA_NUMBER + '?text=' + waText + '" target="_blank" rel="noopener noreferrer" aria-label="Enquire about ' + esc(item.name) + ' on WhatsApp">' + btnTxt + '</a>' +
          '</div>' +
        '</article>'
      );
    }).join('');

    /* Skip the DOM swap when the prerendered/previous cards are identical: no flicker, no replayed fade-in */
    const probe = document.createElement('div');
    probe.innerHTML = markup;
    const sameAsLive = listEl.children.length === probe.children.length &&
      Array.prototype.every.call(probe.children, function (el, i) {
        const live = listEl.children[i];
        return live.dataset.serviceName === el.dataset.serviceName &&
          live.innerHTML === el.innerHTML;
      });
    if (!sameAsLive) listEl.innerHTML = markup;

    const activeTab = tabsEl.querySelector('[aria-pressed="true"]');
    const f = activeTab ? activeTab.dataset.f : 'all';
    let visibleIdx = 0;
    listEl.querySelectorAll('.item').forEach(function (c) {
      const show = (f === 'all' || c.dataset.cat === f);
      c.hidden = !show;
      if (show) c.style.setProperty('--i', visibleIdx++);
    });
  }

  /* Track clicks on service cards and portfolio CTAs */
  document.addEventListener('click', function (e) {
    const svcLink = e.target.closest('[data-track-service]');
    if (svcLink) {
      trackEvent('Service Enquiry Click', { service: svcLink.dataset.trackService });
      return;
    }
    const workCta = e.target.closest('.work-cta');
    if (workCta) {
      const card = workCta.closest('.work-card');
      const titleEl = card ? card.querySelector('h3') : null;
      trackEvent('Portfolio Sample Click', { sample: titleEl ? titleEl.textContent.trim() : 'Sample' });
    }
  });

  tabsEl.addEventListener('click', function (e) {
    const btn = e.target.closest('.tab');
    if (!btn) return;
    const filter = btn.dataset.f;
    tabsEl.querySelectorAll('.tab').forEach(function (t) {
      t.setAttribute('aria-pressed', t === btn ? 'true' : 'false');
    });
    let visibleIdx = 0;
    listEl.querySelectorAll('.item').forEach(function (card) {
      const show = (filter === 'all' || card.dataset.cat === filter);
      card.hidden = !show;
      if (show) card.style.setProperty('--i', visibleIdx++);
    });
    trackEvent('Filter Services', { category: filter });
  });

  portfolioTabs.addEventListener('click', function (e) {
    const btn = e.target.closest('.tab');
    if (!btn) return;
    const filter = btn.dataset.pf;
    portfolioTabs.querySelectorAll('.tab').forEach(function (t) {
      t.setAttribute('aria-pressed', t === btn ? 'true' : 'false');
    });
    let visibleIdx = 0;
    portfolioGrid.querySelectorAll('.work-card').forEach(function (card) {
      const show = (filter === 'all' || card.dataset.pcat === filter);
      card.hidden = !show;
      if (show) card.style.setProperty('--i', visibleIdx++);
    });
    trackEvent('Filter Portfolio', { category: filter });
  });

  /* ===== Localization (English & Bengali only) ===== */
  const BN_H = {
    'Mon – Sat': 'সোম – শনি',
    'Sun – Sat': 'রবি – শনি',
    'Sunday': 'রবিবার',
    'Closed': 'বন্ধ'
  };

  const BN_UI = [
    ['#pkTitle', 'প্যাকেজ ডিল'],
    ['#pkSub', 'একসাথে কয়েকটি সার্ভিস নিয়ে সাশ্রয় করুন।'],
    ['#faqTitle', 'সাধারণ প্রশ্নোত্তর'],
    ['.nav-links a[href="#services"]', 'দামের তালিকা'],
    ['.nav-links a[href="#portfolio"]', 'পোর্টফোলিও'],
    ['.nav-links a[href="#order"]', 'কাস্টম অর্ডার'],
    ['.nav-links a[href="#contact"]', 'যোগাযোগ'],
    ['.nav-cta', 'কোটেশন নিন'],
    ['.mobile-nav a[href="#services"]', 'দামের তালিকা'],
    ['.mobile-nav a[href="#portfolio"]', 'পোর্টফোলিও'],
    ['.mobile-nav a[href="#order"]', 'কাস্টম অর্ডার'],
    ['.mobile-nav a[href="#visit"]', 'আমাদের দোকান'],
    ['.mobile-nav a[href="#contact"]', 'যোগাযোগ'],
    ['h1', 'পেশাদার <b>ডিজাইন সার্ভিস</b>', 1],
    ['.sub', 'মানসম্মত ডিজাইন | সাশ্রয়ী দাম। প্রিন্ট-রেডি ব্যানার, ব্র্যান্ডিং, সোশ্যাল মিডিয়া গ্রাফিক্স ও ওয়েবসাইট।'],
    ['#sampBtn', 'পোর্টফোলিও মকআপ দেখুন'],
    ['.btn-secondary', 'দামের তালিকা দেখুন'],
    ['#services-title', 'স্বচ্ছ দামের তালিকা'],
    ['#services .section-head p', 'ক্যাটাগরি বেছে নিন, বা যেকোনো সার্ভিসে "জানুন" চেপে হোয়াটসঅ্যাপে কোটেশন চান।'],
    ['.tab[data-f="all"]', 'সব'],
    ['.tab[data-f="design"]', 'পোস্টার ও ব্যানার'],
    ['.tab[data-f="social"]', 'সোশ্যাল মিডিয়া'],
    ['.tab[data-f="brand"]', 'ব্র্যান্ডিং'],
    ['.tab[data-f="web"]', 'ওয়েবসাইট'],
    ['.note', 'প্রস্তাবিত দাম। চূড়ান্ত দাম ডিজাইনের মান, জটিলতা ও আপনার প্রয়োজনের উপর নির্ভর করবে।'],
    ['#portfolio-title', 'পোর্টফোলিও ও প্রিন্ট মকআপ'],
    ['#portfolio .section-head p', 'স্থানীয় দোকান, কোচিং সেন্টার ও ব্যবসার জন্য তৈরি ডিজাইন এবং প্রিন্ট মকআপ—যাতে আপনি কাজের মান সহজেই বুঝতে পারেন।'],
    ['.tab[data-pf="all"]', 'সব (৮)'],
    ['.tab[data-pf="banners"]', 'পোস্টার ও ব্যানার'],
    ['.tab[data-pf="social"]', 'সোশ্যাল বিজ্ঞাপন'],
    ['.tab[data-pf="branding"]', 'লোগো ও কার্ড'],
    ['.tab[data-pf="websites"]', 'ওয়েবসাইট'],
    ['#howT', 'কীভাবে কাজ হয়'],
    ['#oTitle', 'কাস্টম অর্ডার'],
    ['#oSub', 'তথ্য পূরণ করুন, সব এক মেসেজে আমাদের হোয়াটসঅ্যাপে পৌঁছে যাবে।'],
    ['#lName', 'আপনার নাম'],
    ['#lPhone', 'আপনার ফোন নম্বর'],
    ['#lSvc', 'সার্ভিস'],
    ['#lDate', 'ডেডলাইন'],
    ['#oSend', 'হোয়াটসঅ্যাপে পাঠান'],
    ['#visit-title', 'আমাদের দোকানে আসুন'],
    ['#hrsTitle', 'খোলার সময়'],
    ['#modalTitle', 'পোর্টফোলিও ও প্রিন্ট মকআপ'],
    ['.tag-badge', 'আইডিয়া • ডিজাইন • ইমপ্যাক্ট'],
    ['.stat-box:nth-child(1) strong', 'দ্রুত'],
    ['.stat-box:nth-child(1) span', '২৪–৪৮ ঘণ্টায় ডেলিভারি'],
    ['.stat-box:nth-child(2) strong', 'এইচডি প্রিন্ট'],
    ['.stat-box:nth-child(2) span', 'CMYK ও ওয়েব-রেডি'],
    ['.loc-link', 'চানবান, উদয়পুর, গোমতী, ত্রিপুরা'],
    ['#lSize', 'সাইজ (ঐচ্ছিক)'],
    ['#lQty', 'পরিমাণ'],
    ['#lPrint', 'প্রিন্ট লাগবে?'],
    ['#areaTxt', 'আমরা উদয়পুর, গোমতী জেলা ও সারা ত্রিপুরার গ্রাহকদের সেবা দিই।'],
    ['.contact-details span:first-child', 'ফোন: '],
    ['.contact-details a[href*="maps"]', 'আসুন: চানবান, উদয়পুর, গোমতী, ত্রিপুরা'],
    ['footer > span:nth-of-type(1)', '© <span id="yr"></span> ডিজিটাল ক্রিয়েটিভ জোন। সর্বস্বত্ব সংরক্ষিত।', 1],
    ['footer > span:nth-of-type(2)', 'ইমপ্যাক্টের জন্য ডিজাইন • উদয়পুর, ত্রিপুরা'],
    ['#contact-title', 'আপনার আইডিয়াকে বাস্তব করুন!'],
    ['.contact-banner > p', 'দ্রুত পরামর্শ ও সঠিক কোটেশনের জন্য হোয়াটসঅ্যাপে আপনার প্রয়োজন জানান।'],
    ['.contact-banner .btn-wa-large', 'হোয়াটসঅ্যাপে চ্যাট করুন'],
    ['#installBtn', 'অ্যাপ ইনস্টল করুন'],
    ['#thanksTitle', 'ধন্যবাদ! আপনার অর্ডারটি প্রস্তুত হয়েছে'],
    ['#thanksSub', 'আমরা আপনার অর্ডারের তথ্যসহ হোয়াটসঅ্যাপ খুলে দিয়েছি। এরপর কী হবে:'],
    ['#ns1', 'হোয়াটসঅ্যাপে Send বাটনে চাপুন যাতে মেসেজটি আমাদের কাছে পৌঁছায়।'],
    ['#ns2', 'আমরা কয়েক মিনিটের মধ্যে সাইজ, দাম ও ডেলিভারির সময় নিশ্চিত করব।'],
    ['#ns3', 'আপনি ২৪–৪৮ ঘণ্টার মধ্যে প্রথম ডিজাইন ড্রাফট পাবেন (অগ্রিম পেমেন্ট ছাড়াই)।'],
    ['#reopenWaBtn', 'আবার হোয়াটসঅ্যাপ খুলুন'],
    ['#newOrderBtn', 'আরেকটি অর্ডার করুন']
  ];

  const BN_WORK = [
    ['পোস্টার ও ব্যানার', 'ক্লায়েন্ট রেডি', 'দোকানের বিজ্ঞাপনের ব্যানার', 'স্থানীয় দোকানের সাইনবোর্ড ও প্রিন্ট-রেডি CMYK হোর্ডিং।', 'একই রকম অর্ডার করুন →'],
    ['পোস্টার ও ব্যানার', 'প্রিন্ট মকআপ', 'উৎসবের ফ্লেক্স ব্যানার', 'পূজা ও উৎসবের অফারের জন্য প্রিন্ট-রেডি ফ্লেক্স ব্যানার মকআপ।', 'একই রকম অর্ডার করুন →'],
    ['পোস্টার ও ব্যানার', 'ক্লায়েন্ট রেডি', 'কোচিং সেন্টার ভর্তি পোস্টার', 'টিউশন ও কোচিং সেন্টারের জন্য আকর্ষণীয় A3/A4 ভর্তি পোস্টার।', 'একই রকম অর্ডার করুন →'],
    ['সোশ্যাল মিডিয়া', 'অ্যাড মকআপ', 'সোশ্যাল মিডিয়া বিজ্ঞাপন', 'ইনস্টাগ্রাম ও ফেসবুকের জন্য ১০৮০×১০৮০ প্রমোশনাল গ্রাফিক্স।', 'একই রকম অর্ডার করুন →'],
    ['লোগো ও কার্ড', 'ব্র্যান্ড কনসেপ্ট', 'পেশাদার লোগো ডিজাইন', 'কালার প্যালেট, ডার্ক/লাইট মোড ও ভেক্টর সোর্স ফাইলসহ লোগো।', 'একই রকম অর্ডার করুন →'],
    ['লোগো ও কার্ড', 'প্রিন্ট মকআপ', 'ডাবল-সাইডেড ভিজিটিং কার্ড', 'QR কোডসহ ৩০০ DPI প্রিন্ট-রেডি বিজনেস কার্ড ডিজাইন।', 'একই রকম অর্ডার করুন →'],
    ['লোগো ও কার্ড', 'প্রিন্ট মকআপ', 'আইডি কার্ড ও ল্যানইয়ার্ড', 'স্কুল, ক্লাব ও অফিসের জন্য উভয় পাশের PVC আইডি কার্ড ও ফিতা।', 'একই রকম অর্ডার করুন →'],
    ['ওয়েবসাইট', 'লাইভ ডেমো', 'ব্যবসায়িক ওয়েবসাইট হোমপেজ', 'হোয়াটসঅ্যাপ অর্ডার, এসইও ও গুগল ম্যাপসহ মোবাইল-ফ্রেন্ডলি ওয়েবসাইট।', 'একই রকম অর্ডার করুন →']
  ];

  const orig = new Map();
  function txtNode(el) {
    const n = Array.from(el.childNodes).filter(function (x) {
      return x.nodeType === 3 && x.textContent.trim();
    }).pop();
    return n || el;
  }

  function updateServiceEstimate() {
    if (!oService || !svcEstimate) return;
    const idx = parseInt(oService.value, 10);
    const item = SERVICES[idx];
    if (!item) {
      svcEstimate.hidden = true;
      return;
    }
    const bn = lang === 'bn';
    const priceTxt = priceRange(item);
    const delivTxt = typicalDelivery(item, bn);
    svcEstimate.innerHTML = bn
      ? '<span>আনুমানিক খরচ: <strong>' + esc(priceTxt) + '</strong></span><span>সম্ভাব্য সময়: <strong>' + esc(delivTxt) + '</strong></span>'
      : '<span>Estimated price: <strong>' + esc(priceTxt) + '</strong></span><span>Typical delivery: <strong>' + esc(delivTxt) + '</strong></span>';
    svcEstimate.hidden = false;
  }

  function fillSelect() {
    const cur = oService.value;
    const chooseTxt = lang === 'bn' ? 'সার্ভিস বেছে নিন' : 'Choose a service';
    oService.innerHTML = '<option value="" disabled selected>' + chooseTxt + '</option>' +
      SERVICES.map(function (it, i) {
        const nm = lang === 'bn' ? (it.bnName || it.name) : it.name;
        return '<option value="' + i + '">' + esc(nm) + ' (' + esc(priceRange(it)) + ')</option>';
      }).join('');
    if (cur !== '' && SERVICES[+cur]) oService.value = cur;
    updateServiceEstimate();

    const p = document.getElementById('oPrint');
    const pc = p.value || 'no';
    const noTxt = lang === 'bn' ? 'না, শুধু ডিজাইন ফাইল' : 'No, design file only';
    const yesTxt = lang === 'bn' ? 'হ্যাঁ, প্রিন্টও লাগবে' : 'Yes, I need printing';
    p.innerHTML = '<option value="no">' + noTxt + '</option><option value="yes">' + yesTxt + '</option>';
    p.value = pc;
  }

  if (oService) {
    oService.addEventListener('change', function () {
      updateServiceEstimate();
      const idx = parseInt(oService.value, 10);
      if (SERVICES[idx]) {
        trackEvent('Order Service Selected', { service: SERVICES[idx].name });
      }
    });
  }

  function renderHours() {
    document.getElementById('hours').innerHTML = HOURS.map(function (r) {
      const t = function (x) { return esc(lang === 'bn' ? (BN_H[x] || x) : x); };
      return '<li><span>' + t(r[0]) + '</span><strong>' + t(r[1]) + '</strong></li>';
    }).join('');
  }

  /* ===== Clone Portfolio Slides for Modal Viewer ===== */
  const viewer = document.getElementById('viewer');
  const vCount = document.getElementById('vCount');
  portfolioGrid.querySelectorAll('.work-card').forEach(function (card) {
    const c = card.cloneNode(true);
    c.removeAttribute('data-pcat');
    c.removeAttribute('style');
    const thumbBtn = c.querySelector('[data-open-modal]');
    if (thumbBtn) {
      const divThumb = document.createElement('div');
      divThumb.className = 'work-thumb';
      divThumb.innerHTML = thumbBtn.innerHTML;
      thumbBtn.replaceWith(divThumb);
    }
    c.classList.add('slide');
    viewer.appendChild(c);
  });

  function applyLang(l, save) {
    lang = l;
    document.documentElement.lang = l;
    BN_UI.forEach(function (r) {
      const el = document.querySelector(r[0]);
      if (!el) return;
      const isHtml = Boolean(r[2]);
      const t = isHtml ? el : txtNode(el);
      if (!orig.has(el)) orig.set(el, isHtml ? el.innerHTML : t.textContent);
      const v = l === 'en' ? orig.get(el) : r[1];
      if (isHtml) el.innerHTML = v;
      else t.textContent = v;
    });
    renderServices();
    fillSelect();
    renderHours();
    renderExtras();
    showRepeat();
    document.getElementById('yr').textContent = new Date().getFullYear();

    document.querySelectorAll('.work-meta').forEach(function (m) {
      const i = Array.prototype.indexOf.call(m.parentNode.parentNode.children, m.parentNode);
      const cat = m.querySelector('.work-cat');
      const bdg = m.querySelector('.work-badge');
      const t = m.querySelector('h3');
      const d = m.querySelector('.work-desc');
      const cta = m.querySelector('.work-cta');
      if (!m._o) {
        m._o = [
          cat ? cat.textContent : '',
          bdg ? bdg.textContent : '',
          t ? t.textContent : '',
          d ? d.textContent : '',
          cta ? cta.textContent : ''
        ];
      }
      const tr = l === 'bn' ? BN_WORK[i] : m._o;
      if (!tr) return;
      if (cat) cat.textContent = tr[0];
      if (bdg) bdg.textContent = tr[1];
      if (t) t.textContent = tr[2];
      if (d) d.textContent = tr[3];
      if (cta) cta.textContent = tr[4];
    });

    document.getElementById('langBtn').textContent = l === 'en' ? 'বাংলা' : 'EN';
    if (save) {
      try { localStorage.setItem('dcz-lang', l); } catch (_) {}
    }
  }

  document.getElementById('langBtn').addEventListener('click', function () {
    const nextLang = lang === 'en' ? 'bn' : 'en';
    applyLang(nextLang, true);
  });

  /* ===== Theme Switcher ===== */
  const themeBtn = document.getElementById('themeBtn');
  let themeTimer = null;
  function applyTheme(t, save) {
    const root = document.documentElement;
    root.classList.add('theme-switching');
    root.dataset.theme = t;
    clearTimeout(themeTimer);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        themeTimer = setTimeout(function () { root.classList.remove('theme-switching'); }, 60);
      });
    });
    document.querySelector('meta[name="theme-color"]').content = t === 'light' ? '#f8fafc' : '#070b14';
    themeBtn.textContent = t === 'light' ? '☾' : '☀';
    if (save) {
      try { localStorage.setItem('dcz-theme', t); } catch (_) {}
    }
  }
  themeBtn.addEventListener('click', function () {
    const current = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    applyTheme(current, true);
  });
  applyTheme(document.documentElement.dataset.theme || 'dark');

  /* ===== Order Form Submission & Post-Submit Confirmation ===== */
  function localDate() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  const oDate = document.getElementById('oDate');
  oDate.min = localDate();
  oDate.addEventListener('click', function () {
    try { if (this.showPicker) this.showPicker(); } catch (_) {}
  });

  function openWA(msg) {
    const a = document.createElement('a');
    a.href = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(msg);
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function showOrderConfirmation(msg) {
    lastWhatsAppMsg = msg;
    showToast(
      lang === 'bn'
        ? 'আপনার অর্ডারের তথ্যসহ হোয়াটসঅ্যাপ খোলা হচ্ছে...'
        : 'Opening WhatsApp with your order details...'
    );
    if (orderThanks) {
      orderThanks.hidden = false;
      orderThanks.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    setTimeout(function () {
      openWA(msg);
    }, 650);
  }

  if (reopenWaBtn) {
    reopenWaBtn.addEventListener('click', function () {
      if (lastWhatsAppMsg) openWA(lastWhatsAppMsg);
    });
  }
  if (newOrderBtn) {
    newOrderBtn.addEventListener('click', function () {
      if (orderThanks) orderThanks.hidden = true;
      document.getElementById('oName').focus();
    });
  }

  function buildMsg(o) {
    const it = SERVICES[o.svc];
    return [
      "Hi Digital Creative Zone, I'd like to place an order.",
      'Name: ' + o.name,
      'Phone: ' + (o.phone || '-'),
      'Service: ' + it.name + ' (' + priceRange(it) + ', Typical delivery: ' + typicalDelivery(it, false) + ')',
      'Size: ' + (o.size || 'Not sure / please suggest'),
      'Quantity: ' + o.qty,
      'Print needed: ' + (o.print === 'yes' ? 'Yes' : 'No (design file only)'),
      'Deadline: ' + (o.date || 'Flexible')
    ].join('\n');
  }

  function getLast() {
    try {
      const o = JSON.parse(localStorage.getItem('dcz-last'));
      if (!o || !SERVICES.length) return null;
      if (o.sn) {
        const k = SERVICES.findIndex(function (s) { return s.name === o.sn; });
        if (k < 0) return null;
        o.svc = k;
      }
      return o;
    } catch (_) {
      return null;
    }
  }

  function showRepeat() {
    const o = getLast();
    const b = document.getElementById('repeatBtn');
    if (!o || !SERVICES[o.svc]) {
      b.hidden = true;
      return;
    }
    b.hidden = false;
    const svcTitle = lang === 'bn' ? (SERVICES[o.svc].bnName || SERVICES[o.svc].name) : SERVICES[o.svc].name;
    const repeatLabel = lang === 'bn'
      ? 'আগের অর্ডারটি আবার পাঠান: ' + svcTitle
      : 'Send the same order again: ' + svcTitle;
    b.textContent = repeatLabel + ' × ' + o.qty;
  }

  document.getElementById('orderForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const o = {
      name: document.getElementById('oName').value.trim(),
      phone: document.getElementById('oPhone').value.trim(),
      svc: +oService.value,
      size: document.getElementById('oSize').value.trim(),
      qty: Math.max(1, parseInt(document.getElementById('oQty').value, 10) || 1),
      print: document.getElementById('oPrint').value,
      date: oDate.value
    };
    if (!o.name || !SERVICES[o.svc]) {
      document.getElementById('oName').focus();
      return;
    }
    try {
      localStorage.setItem('dcz-last', JSON.stringify({
        name: o.name,
        phone: o.phone,
        svc: o.svc,
        sn: SERVICES[o.svc].name,
        size: o.size,
        qty: o.qty,
        print: o.print
      }));
    } catch (_) {}
    showRepeat();
    const msg = buildMsg(o);
    saveOrder(o, msg);
    trackEvent('Order Submitted', { service: SERVICES[o.svc].name, print: o.print });
    showOrderConfirmation(msg);
  });

  document.getElementById('repeatBtn').addEventListener('click', function () {
    const o = getLast();
    if (!o || !SERVICES[o.svc]) return;
    o.date = '';
    if (!o.phone) o.phone = document.getElementById('oPhone').value.trim();
    const msg = buildMsg(o) + '\n(Repeat order: please confirm the deadline with me)';
    saveOrder(o, msg);
    trackEvent('Repeat Order Submitted', { service: SERVICES[o.svc].name });
    showOrderConfirmation(msg);
  });

  /* ===== Portfolio Modal Viewer ===== */
  const total = viewer.children.length;
  function cur() { return Math.round(viewer.scrollLeft / viewer.clientWidth) || 0; }
  function go(i) {
    viewer.scrollTo({
      left: Math.max(0, Math.min(total - 1, i)) * viewer.clientWidth,
      behavior: 'smooth'
    });
  }
  viewer.addEventListener('scroll', function () {
    vCount.textContent = (cur() + 1) + ' / ' + total;
  });
  document.getElementById('vPrev').addEventListener('click', function () { go(cur() - 1); });
  document.getElementById('vNext').addEventListener('click', function () { go(cur() + 1); });

  let lastFocused = null;
  function openModal(i) {
    lastFocused = (document.activeElement && document.activeElement !== document.body) ? document.activeElement : sampBtn;
    modalEl.classList.add('open');
    document.body.style.overflow = 'hidden';
    viewer.scrollLeft = (i || 0) * viewer.clientWidth;
    vCount.textContent = ((i || 0) + 1) + ' / ' + total;
    xBtn.focus();
  }
  function closeModal() {
    if (!modalEl.classList.contains('open')) return;
    modalEl.classList.remove('open');
    document.body.style.overflow = '';
    (lastFocused && document.contains(lastFocused) ? lastFocused : sampBtn).focus();
  }
  sampBtn.addEventListener('click', function () { openModal(0); });
  xBtn.addEventListener('click', closeModal);
  modalEl.addEventListener('click', function (e) { if (e.target === modalEl) closeModal(); });

  portfolioGrid.addEventListener('click', function (e) {
    const thumbBtn = e.target.closest('button[data-open-modal]');
    if (!thumbBtn) return;
    const card = thumbBtn.closest('.work-card');
    const allCards = Array.from(portfolioGrid.querySelectorAll('.work-card'));
    openModal(allCards.indexOf(card));
  });

  document.addEventListener('keydown', function (e) {
    if (!modalEl.classList.contains('open')) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowLeft') go(cur() - 1);
    if (e.key === 'ArrowRight') go(cur() + 1);
  });

  /* ===== PWA Install Button ===== */
  let installEvt = null;
  const installBtn = document.getElementById('installBtn');
  const installHelp = document.getElementById('installHelp');
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); installEvt = e; });
  window.addEventListener('appinstalled', function () { installBtn.hidden = true; installHelp.hidden = true; });
  if ((window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone) {
    installBtn.hidden = true;
  }
  installBtn.addEventListener('click', function () {
    if (installEvt) {
      installEvt.prompt();
      installEvt = null;
      return;
    }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const bn = lang === 'bn';
    installHelp.textContent = ios
      ? (bn ? 'আইফোনে: Share বাটন চেপে "Add to Home Screen" বেছে নিন।' : 'On iPhone/iPad: tap the Share button, then "Add to Home Screen".')
      : (bn ? 'ব্রাউজারের মেনু (⋮) খুলে "Install app" বা "Add to Home screen" বেছে নিন।' : 'Open your browser menu (⋮) and choose "Install app" or "Add to Home screen".');
    installHelp.hidden = false;
  });

  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }

  /* ===== Banner, Packages & FAQ from config.json ===== */
  function safeLink(u) { return /^(https?:\/\/|#|\/)/.test(u || '') ? u : ''; }
  function renderExtras() {
    if (!cfg) return;
    const bn = lang === 'bn';
    const t = function (en, b) { return bn && b ? b : en; };
    const b = cfg.banner || {};
    const txt = t(b.en, b.bn);
    const bar = document.getElementById('offerBar');
    const lk = safeLink(b.link);
    bar.hidden = !(b.on && txt) || offerClosed;
    bar.innerHTML = (lk ? '<a href="' + esc(lk) + '">' + esc(txt) + '</a>' : '<span>' + esc(txt) + '</span>') +
      '<button type="button" id="offerX" aria-label="Close offer">✕</button>';

    const pk = cfg.packages || [];
    document.getElementById('packages').hidden = !pk.length;
    document.getElementById('pkgList').innerHTML = pk.map(function (p, idx) {
      const msg = encodeURIComponent("Hi Digital Creative Zone, I'd like the \"" + p.name + "\" package (" + p.price + ").");
      const ordTxt = bn ? 'অর্ডার করুন →' : 'Order package →';
      return (
        '<article class="pkg" style="--i: ' + idx + '">' +
          '<h3>' + esc(t(p.name, p.bn)) + '</h3>' +
          '<p>' + esc(t(p.desc, p.descBn)) + '</p>' +
          '<div class="pp"><strong>' + esc(p.price) + '</strong>' + (p.was ? '<s>' + esc(p.was) + '</s>' : '') + '</div>' +
          '<a class="item-quote" data-track-service="Package: ' + esc(p.name) + '" href="https://wa.me/' + WA_NUMBER + '?text=' + msg + '" target="_blank" rel="noopener noreferrer" aria-label="Order ' + esc(p.name) + ' package on WhatsApp">' + ordTxt + '</a>' +
        '</article>'
      );
    }).join('');

    const fq = cfg.faq || [];
    document.getElementById('faq').hidden = !fq.length;
    document.getElementById('faqList').innerHTML = fq.map(function (x) {
      return '<details><summary>' + esc(t(x.q, x.qBn)) + '</summary><p>' + esc(t(x.a, x.aBn)) + '</p></details>';
    }).join('');
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('#offerX')) {
      offerClosed = true;
      document.getElementById('offerBar').hidden = true;
    }
  });

  /* ===== Load config.json (Single Source of Truth) ===== */
  function fetchConfig() {
    return fetch('config.json', { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('local config failed');
        return r.json();
      })
      .catch(function () {
        const GH = 'https://api.github.com/repos/digitalcreativezone/creative-zone1/contents/config.json?ref=main';
        return fetch(GH, { cache: 'no-store', headers: { Accept: 'application/vnd.github.raw+json' } })
          .then(function (r) { return r.ok ? r.json() : null; })
          .catch(function () { return null; });
      });
  }

  function applyConfigData(c) {
    if (!c) return;
    const sig = JSON.stringify(c);
    if (sig === lastSig) return;
    lastSig = sig;
    cfg = c;

    if (/^\d{8,15}$/.test(c.wa || '')) {
      WA_NUMBER = c.wa;
      document.querySelectorAll('a[href*="wa.me/"]').forEach(function (a) {
        a.href = a.href.replace(/wa\.me\/\d+/, 'wa.me/' + c.wa);
      });
      document.querySelectorAll('a[href^="tel:"]').forEach(function (a) {
        a.href = 'tel:+' + c.wa;
        a.textContent = c.wa.indexOf('91') === 0 ? '+91 ' + c.wa.slice(2, 7) + ' ' + c.wa.slice(7) : '+' + c.wa;
      });
    }
    if (Array.isArray(c.hours) && c.hours.length) {
      HOURS = c.hours.slice();
    }
    if (Array.isArray(c.services) && c.services.length) {
      SERVICES = c.services.slice();
    }
    renderServices();
    fillSelect();
    renderHours();
    renderExtras();
    showRepeat();
  }

  function loadConfig() {
    if (!window.fetch) return;
    fetchConfig().then(applyConfigData);
  }

  /* ===== Section Reveal & Scroll Spy ===== */
  const secs = Array.from(document.querySelectorAll('main > section'));
  if ('IntersectionObserver' in window) {
    const revObs = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('rv-in');
          revObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.08 });
    secs.slice(1).forEach(function (s) {
      s.classList.add('rv');
      revObs.observe(s);
    });

    const spyObs = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) {
          document.querySelectorAll('.nav-links a[href^="#"]').forEach(function (l) {
            l.classList.toggle('active', l.getAttribute('href') === '#' + e.target.id);
          });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach(function (s) { if (s.id) spyObs.observe(s); });
  }

  const nb = document.querySelector('.navbar');
  let sm = false;
  window.addEventListener('scroll', function () {
    const v = window.scrollY > 40;
    if (v !== sm) {
      sm = v;
      nb.classList.toggle('nav-sm', v);
    }
  }, { passive: true });

  /* ===== Initialize ===== */
  let savedLang = null;
  try { savedLang = localStorage.getItem('dcz-lang'); } catch (_) {}
  applyLang(savedLang === 'bn' ? 'bn' : 'en');
  loadConfig();

  let lastLoad = Date.now();
  function refreshConfig() {
    if (!document.hidden && Date.now() - lastLoad > 60000) {
      lastLoad = Date.now();
      loadConfig();
    }
  }
  setInterval(refreshConfig, 300000);
  document.addEventListener('visibilitychange', refreshConfig);
})();