document.addEventListener('DOMContentLoaded', () => {
  // ---------- Page loader (hides once everything has loaded) ----------
  const loader = document.getElementById('page-loader');
  if (loader) {
    window.addEventListener('load', () => {
      loader.classList.add('loader-hidden');
      setTimeout(() => loader.remove(), 500);
    });
  }

  // ---------- Mobile nav toggle ----------
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('nav-open');
      navToggle.classList.toggle('active', isOpen);
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  // ---------- Scroll reveal animation ----------
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach((el) => observer.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('active'));
  }

  // ---------- Terminal typewriter (automatic ambient animation) ----------
  const typewriterEl = document.getElementById('typewriter');
  if (typewriterEl && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const phrases = [
      'bcrypt · 12 rounds',
      'cookie: httpOnly, sameSite=lax',
      '5 failed attempts -> locked 15m',
      'role: admin required',
    ];
    let phraseIndex = 0;
    let charIndex = 0;
    let deleting = false;

    function tick() {
      const current = phrases[phraseIndex];
      if (!deleting) {
        charIndex++;
        typewriterEl.textContent = current.slice(0, charIndex);
        if (charIndex === current.length) {
          deleting = true;
          setTimeout(tick, 1600);
          return;
        }
      } else {
        charIndex--;
        typewriterEl.textContent = current.slice(0, charIndex);
        if (charIndex === 0) {
          deleting = false;
          phraseIndex = (phraseIndex + 1) % phrases.length;
        }
      }
      setTimeout(tick, deleting ? 35 : 75);
    }
    tick();
  } else if (typewriterEl) {
    typewriterEl.textContent = 'bcrypt · 12 rounds';
  }
});
