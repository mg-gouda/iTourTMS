/* ── Navbar scroll state ── */
(function () {
  const nav = document.querySelector(".navbar");
  if (!nav) return;
  window.addEventListener("scroll", () => {
    nav.classList.toggle("scrolled", window.scrollY > 40);
  });
})();

/* ── Mobile hamburger ── */
(function () {
  const btn   = document.getElementById("hamburger");
  const links = document.querySelector(".nav-links");
  if (!btn || !links) return;
  btn.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    btn.setAttribute("aria-expanded", open);
    // animate spans
    btn.classList.toggle("is-open", open);
  });
  links.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => {
      links.classList.remove("open");
      btn.classList.remove("is-open");
      btn.setAttribute("aria-expanded", false);
    });
  });
})();

/* ── Scroll Reveal ── */
(function () {
  const els = document.querySelectorAll(".reveal");
  if (!els.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  els.forEach(el => io.observe(el));
})();

/* ── Counter animation ── */
(function () {
  const stats = document.querySelectorAll(".stat-num[data-target]");
  if (!stats.length) return;
  function animateCounter(el) {
    const target = parseFloat(el.dataset.target);
    const suffix = el.dataset.suffix || "";
    const isFloat = el.dataset.float === "1";
    const dur = 1800, start = performance.now();
    function step(now) {
      const p = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      el.textContent = (isFloat ? (target * ease).toFixed(1) : Math.round(target * ease)) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { animateCounter(e.target); io.unobserve(e.target); } });
  }, { threshold: 0.5 });
  stats.forEach(el => io.observe(el));
})();

/* ── Language switcher ── */
(function () {
  if (typeof I18N === "undefined") return;

  const LANG_META = {
    en: { flag: '🇬🇧', code: 'EN' },
    ar: { flag: '🇸🇦', code: 'AR' },
    fr: { flag: '🇫🇷', code: 'FR' },
    it: { flag: '🇮🇹', code: 'IT' },
    de: { flag: '🇩🇪', code: 'DE' },
    ru: { flag: '🇷🇺', code: 'RU' },
    tr: { flag: '🇹🇷', code: 'TR' },
    es: { flag: '🇪🇸', code: 'ES' },
    zh: { flag: '🇨🇳', code: 'ZH' },
  };

  const dropdown    = document.getElementById("lang-dropdown");
  const dropBtn     = document.getElementById("lang-dropdown-btn");
  const dropMenu    = document.getElementById("lang-menu");
  const flagEl      = document.getElementById("lang-flag");
  const codeEl      = document.getElementById("lang-code");

  /* toggle dropdown */
  if (dropBtn) {
    dropBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = dropdown.classList.toggle("open");
      dropBtn.setAttribute("aria-expanded", open);
    });
    document.addEventListener("click", () => {
      dropdown.classList.remove("open");
      dropBtn.setAttribute("aria-expanded", false);
    });
    dropMenu && dropMenu.addEventListener("click", e => e.stopPropagation());
  }

  function applyLang(lang) {
    const dict = I18N[lang];
    if (!dict) return;

    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.dataset.i18n;
      if (dict[key] !== undefined) el.textContent = dict[key];
    });
    document.querySelectorAll("[data-i18n-ph]").forEach(el => {
      const key = el.dataset.i18nPh;
      if (dict[key] !== undefined) el.placeholder = dict[key];
    });
    document.querySelectorAll("[data-i18n-html]").forEach(el => {
      const key = el.dataset.i18nHtml;
      if (dict[key] !== undefined) el.innerHTML = dict[key];
    });

    const isRTL = lang === "ar";
    document.documentElement.dir  = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    document.body.classList.toggle("rtl", isRTL);

    /* update dropdown button */
    const meta = LANG_META[lang] || { flag: '🌐', code: lang.toUpperCase() };
    if (flagEl) flagEl.textContent = meta.flag;
    if (codeEl) codeEl.textContent = meta.code;

    /* mark active option */
    document.querySelectorAll("[data-lang]").forEach(b => {
      b.classList.toggle("active", b.dataset.lang === lang);
    });

    /* close dropdown */
    if (dropdown) { dropdown.classList.remove("open"); }
    if (dropBtn)  { dropBtn.setAttribute("aria-expanded", false); }

    try { localStorage.setItem("itour-lang", lang); } catch (_) {}
  }

  /* wire all [data-lang] buttons (navbar dropdown + footer) */
  document.querySelectorAll("[data-lang]").forEach(btn => {
    btn.addEventListener("click", () => applyLang(btn.dataset.lang));
  });

  /* restore saved lang */
  let saved = "en";
  try { saved = localStorage.getItem("itour-lang") || "en"; } catch (_) {}
  if (!I18N[saved]) saved = "en";
  applyLang(saved);
})();

/* ── Smooth anchor scroll ── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener("click", e => {
    const id = a.getAttribute("href").slice(1);
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});
