// src/ui/site-nav.js
// Simple top navigation with dropdown to jump across demo screens.
(function () {
  const PAGES = [
    { group: 'Tổng quan', items: [
      { label: 'Trang chủ', href: 'index.html' },
    ]},
    { group: 'Thị trường', items: [
      { label: 'Bảng giá (VCBS)', href: 'price-board.html' },
      { label: 'CafeF Realtime', href: 'cafef-realtime.html' },
      { label: 'FireAnt Quotes', href: 'fireant-quotes.html' },
      { label: 'Screener', href: 'screener.html' },
      { label: 'Industry Demo', href: 'industry-demo.html' },
    ]},
    { group: 'Công ty', items: [
      { label: 'Hồ sơ công ty', href: 'company-profile.html' },
      { label: 'Danh bạ công ty', href: 'company-directory.html' },
    ]},
    { group: 'Công cụ/Chiến lược', items: [
      { label: 'API Demo', href: 'api-demo.html' },
      { label: 'Danh sách thuật toán', href: 'algo-list.html' },
      { label: 'Chi tiết thuật toán', href: 'algo-detail.html' },
      { label: 'Strategy Builder (demo)', href: 'strategy-builder-component.html' },
    ]},
  ];

  const cssHref = 'css/site-nav.css';
  // Ensure CSS loaded once
  if (!document.querySelector('link[href="' + cssHref + '"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssHref;
    document.head.appendChild(link);
  }

  function currentPath() {
    try {
      return location.pathname.split('/').pop() || 'index.html';
    } catch { return ''; }
  }

  function buildNav() {
    const nav = document.createElement('nav');
    nav.className = 'site-nav';

    const left = document.createElement('div');
    left.className = 'site-nav-left';
    const brand = document.createElement('a');
    brand.className = 'brand';
    brand.href = 'index.html';
    brand.textContent = 'AlgoDash';
    left.appendChild(brand);

    const center = document.createElement('div');
    center.className = 'site-nav-center';

    // Build dropdowns per group
    const curr = currentPath();
    for (const section of PAGES) {
      const wrap = document.createElement('div');
      wrap.className = 'menu-group';
      const btn = document.createElement('button');
      btn.className = 'menu-btn';
      btn.type = 'button';
      btn.textContent = section.group;
      const dd = document.createElement('div');
      dd.className = 'dropdown';
      for (const it of section.items) {
        const a = document.createElement('a');
        a.href = it.href;
        a.textContent = it.label;
        if (it.href === curr) a.classList.add('active');
        dd.appendChild(a);
      }
      wrap.appendChild(btn);
      wrap.appendChild(dd);
      // Toggle behavior
      btn.addEventListener('click', () => {
        const open = wrap.classList.contains('open');
        document.querySelectorAll('.menu-group.open').forEach(el => el.classList.remove('open'));
        if (!open) wrap.classList.add('open');
      });
      center.appendChild(wrap);
    }

    const right = document.createElement('div');
    right.className = 'site-nav-right';
    const theme = document.createElement('button');
    theme.className = 'theme-toggle';
    theme.type = 'button';
    theme.textContent = 'Theme';
    theme.addEventListener('click', () => {
      document.body.classList.toggle('light');
      try { localStorage.setItem('theme', document.body.classList.contains('light') ? 'light' : 'dark'); } catch {}
    });
    right.appendChild(theme);

    nav.appendChild(left);
    nav.appendChild(center);
    nav.appendChild(right);

    // Insert at top
    document.body.insertBefore(nav, document.body.firstChild);

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      const isInside = e.composedPath().some(el => el && el.classList && el.classList.contains('menu-group'));
      if (!isInside) document.querySelectorAll('.menu-group.open').forEach(el => el.classList.remove('open'));
    });
  }

  // Apply saved theme
  (function applyTheme() {
    try {
      const t = (localStorage.getItem('theme') || '').toLowerCase();
      if (t === 'light') document.body.classList.add('light');
    } catch {}
  })();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildNav);
  } else {
    buildNav();
  }
})();

