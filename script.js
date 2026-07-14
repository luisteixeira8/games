document.documentElement.classList.add('js');

const header = document.querySelector('[data-header]');
const scrollProgress = document.querySelector('[data-scroll-progress]');

const updateHeader = () => {
  header?.classList.toggle('is-scrolled', window.scrollY > 12);
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
  scrollProgress?.style.setProperty('transform', `scaleX(${progress})`);
};

updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });

const reveals = document.querySelectorAll('.reveal');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const gameIds = ['coroa', 'stack-tower', 'tictactoe'];
const collectionKey = 'durius-games-explored';
let exploredGames = new Set();

try {
  const savedGames = JSON.parse(localStorage.getItem(collectionKey) || '[]');
  exploredGames = new Set(savedGames.filter((game) => gameIds.includes(game)));
} catch {
  exploredGames = new Set();
}

const updateCollection = () => {
  const count = exploredGames.size;
  const countElement = document.querySelector('[data-explored-count]');
  if (countElement) countElement.textContent = String(count);

  gameIds.forEach((game) => {
    const isExplored = exploredGames.has(game);
    document.querySelector(`.game-card[data-game="${game}"]`)?.classList.toggle('is-played', isExplored);
    document.querySelector(`[data-progress-segment="${game}"]`)?.classList.toggle('is-complete', isExplored);
  });
};

document.querySelectorAll('a[data-game]').forEach((link) => {
  link.addEventListener('click', () => {
    exploredGames.add(link.dataset.game);
    try {
      localStorage.setItem(collectionKey, JSON.stringify([...exploredGames]));
    } catch {
      // The collection remains available for this visit when storage is blocked.
    }
    updateCollection();
  });
});

updateCollection();

const setActiveSection = (section) => {
  document.querySelectorAll('[data-section-link]').forEach((link) => {
    const isActive = link.dataset.sectionLink === section;
    link.classList.toggle('is-active', isActive);
    if (isActive) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
};

if ('IntersectionObserver' in window) {
  const sectionObserver = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible) setActiveSection(visible.target.dataset.section);
  }, { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.15, 0.5] });

  document.querySelectorAll('[data-section]').forEach((section) => sectionObserver.observe(section));
}

if (!reduceMotion) {
  document.querySelectorAll('.game-card').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const bounds = card.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width) * 100;
      const y = ((event.clientY - bounds.top) / bounds.height) * 100;
      card.style.setProperty('--pointer-x', `${x}%`);
      card.style.setProperty('--pointer-y', `${y}%`);
    });

    card.addEventListener('pointerleave', () => {
      card.style.removeProperty('--pointer-x');
      card.style.removeProperty('--pointer-y');
    });
  });
}

if (reduceMotion || !('IntersectionObserver' in window)) {
  reveals.forEach((element) => element.classList.add('is-visible'));
} else {
  const observer = new IntersectionObserver((entries, activeObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      activeObserver.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  reveals.forEach((element) => observer.observe(element));
}
