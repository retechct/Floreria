const carousel = document.querySelector('[data-hero-carousel]');

if (carousel) {
  const slides = [...carousel.querySelectorAll('[data-hero-slide]')];
  const dots = [...carousel.querySelectorAll('[data-hero-dot]')];
  const status = carousel.querySelector('[data-hero-status]');
  const names = ['Inmersivo', 'Atelier', 'Elegante', 'Floral izquierda', 'Floral derecha', 'Editorial'];
  let current = Number(sessionStorage.getItem('hero-design') || 0);

  function setFocusable(slide, enabled) {
    slide.querySelectorAll('a, button').forEach(element => {
      if (enabled) element.removeAttribute('tabindex');
      else element.setAttribute('tabindex', '-1');
    });
  }

  function show(index, announce = true) {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      const active = slideIndex === current;
      slide.classList.toggle('is-active', active);
      slide.setAttribute('aria-hidden', String(!active));
      setFocusable(slide, active);
    });
    dots.forEach((dot, dotIndex) => {
      const active = dotIndex === current;
      dot.setAttribute('aria-selected', String(active));
      dot.tabIndex = active ? 0 : -1;
    });
    sessionStorage.setItem('hero-design', String(current));
    carousel.querySelectorAll('.demo-menu-toggle[aria-expanded="true"]').forEach(toggle => {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Abrir menú');
      document.getElementById(toggle.getAttribute('aria-controls'))?.classList.remove('is-open');
      toggle.closest('.demo-nav, .hero-frame-menu')?.classList.remove('is-menu-open');
    });
    if (announce) status.textContent = `Encabezado ${current + 1} de ${slides.length}: ${names[current]}`;
  }

  dots.forEach((dot, index) => dot.addEventListener('click', () => show(index)));
  carousel.querySelector('[role="tablist"]')?.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') current = 0;
    else if (event.key === 'End') current = slides.length - 1;
    else current = (current + (event.key === 'ArrowRight' ? 1 : -1) + slides.length) % slides.length;
    show(current);
    dots[current].focus();
  });

  show(Number.isInteger(current) && current >= 0 && current < slides.length ? current : 0, false);

  const closeMobileMenus = except => {
    carousel.querySelectorAll('.demo-menu-toggle').forEach(toggle => {
      if (toggle === except) return;
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Abrir menú');
      document.getElementById(toggle.getAttribute('aria-controls'))?.classList.remove('is-open');
      toggle.closest('.demo-nav, .hero-frame-menu')?.classList.remove('is-menu-open');
    });
  };

  carousel.querySelectorAll('.demo-menu-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const willOpen = toggle.getAttribute('aria-expanded') !== 'true';
      closeMobileMenus(toggle);
      toggle.setAttribute('aria-expanded', String(willOpen));
      toggle.setAttribute('aria-label', willOpen ? 'Cerrar menú' : 'Abrir menú');
      document.getElementById(toggle.getAttribute('aria-controls'))?.classList.toggle('is-open', willOpen);
      toggle.closest('.demo-nav, .hero-frame-menu')?.classList.toggle('is-menu-open', willOpen);
    });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMobileMenus();
  });

  const scrollAwareNavs = [...carousel.querySelectorAll('.demo-nav, .hero-frame-header')];
  const flowerCarousel = carousel.querySelector('[data-flower-carousel]');
  if (flowerCarousel) {
    const copy = flowerCarousel.querySelector('.hero-option-copy');
    const photo = flowerCarousel.querySelector('.hero-media img');
    const title = copy.querySelector('.hero-option-title');
    const script = copy.querySelector('.hero-script');
    const description = copy.querySelector('p');
    const link = copy.querySelector('a');
    const flowerDots = [...flowerCarousel.querySelectorAll('[data-flower-dot]')];
    const items = [
      { title: 'Flower Shop', script: 'un ramo, una historia', text: description.textContent, image: photo.getAttribute('src'), alt: photo.alt, href: 'catalogo.html', cta: 'Comprar ahora' },
      { title: 'Rosas', script: 'para decirlo con el corazón', text: 'Rosas que convierten un momento especial en un recuerdo inolvidable.', image: '/public/assets/generated/hero/rosas-rojas-cutout.webp', alt: 'Arreglo de rosas rojas de La Casa de las Flores Atelier', href: 'catalogo.html?categoria=Ramos', cta: 'Descubrir rosas' },
      { title: 'Tulipanes', script: 'pequeños gestos, grandes emociones', text: 'Color y delicadeza para sorprender a esa persona que ilumina tus días.', image: '/public/assets/generated/hero/tulipanes-cutout.webp', alt: 'Arreglo de tulipanes de colores', href: 'catalogo.html?categoria=Tulipanes', cta: 'Ver tulipanes' },
      { title: 'Girasoles', script: 'un poquito de sol para regalar', text: 'Flores llenas de alegría para celebrar, agradecer y regalar una sonrisa.', image: '/public/assets/generated/hero/girasoles-cutout.webp', alt: 'Arreglo de girasoles de estilo bohemio', href: 'catalogo.html?categoria=Girasoles', cta: 'Ver girasoles' }
    ];
    let index = 0;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let timer;
    const render = next => {
      index = (next + items.length) % items.length;
      const item = items[index];
      title.textContent = item.title;
      script.textContent = item.script;
      description.textContent = item.text;
      link.textContent = item.cta;
      link.href = item.href;
      photo.src = item.image;
      photo.alt = item.alt;
      flowerCarousel.classList.toggle('has-flower-photo', index > 0);
      flowerCarousel.dataset.flowerIndex = String(index);
      flowerDots.forEach((dot, dotIndex) => {
        if (dotIndex === index) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      });
    };
    const restart = () => {
      clearInterval(timer);
      if (reducedMotion) return;
      timer = setInterval(() => {
        if (!document.hidden && flowerCarousel.classList.contains('is-active') &&
            window.scrollY < carousel.offsetHeight / 2) render(index + 1);
      }, 5500);
    };
    flowerDots.forEach((dot, dotIndex) => dot.addEventListener('click', () => {
      render(dotIndex);
      restart();
    }));
    restart();
  }
  const syncNavBackground = () => {
    const scrolled = window.scrollY > 24;
    scrollAwareNavs.forEach(nav => nav.classList.toggle('is-scrolled', scrolled));
  };
  window.addEventListener('scroll', syncNavBackground, { passive: true });
  syncNavBackground();
}
