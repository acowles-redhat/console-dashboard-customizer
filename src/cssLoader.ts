import { useEffect } from 'react';

type SetFeatureFlag = (flag: string, value: boolean) => void;

const STORAGE_KEY = 'dashboard-customizer-heights';
let resizeObserver: ResizeObserver | null = null;
const initialized = new WeakSet<Element>();

function getCardId(card: Element): string {
  const title = card.querySelector('.pf-v6-c-card__title-text');
  return title?.textContent?.trim() || '';
}

function setupCards() {
  const cards = document.querySelectorAll('.co-dashboard-grid .pf-v6-c-card');
  if (cards.length === 0) return;

  let hasNew = false;
  cards.forEach(c => { if (!initialized.has(c)) hasNew = true; });
  if (!hasNew) return;

  let savedHeights: Record<string, number> = {};
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) savedHeights = JSON.parse(s);
  } catch (_) { /* ignore */ }

  let maxHeight = 0;
  cards.forEach(c => {
    if (!c.querySelector('.co-activity-card__body')) {
      maxHeight = Math.max(maxHeight, (c as HTMLElement).offsetHeight);
    }
  });

  cards.forEach(card => {
    if (initialized.has(card)) return;
    const el = card as HTMLElement;
    const id = getCardId(el);
    if (!id) return;

    if (savedHeights[id]) {
      el.style.height = `${savedHeights[id]}px`;
    } else if (el.querySelector('.co-activity-card__body') && maxHeight > el.offsetHeight) {
      el.style.height = `${maxHeight}px`;
    }
    initialized.add(card);
  });

  if (resizeObserver) resizeObserver.disconnect();
  resizeObserver = new ResizeObserver(() => {
    const heights: Record<string, number> = {};
    document.querySelectorAll('.co-dashboard-grid .pf-v6-c-card').forEach(c => {
      const id = getCardId(c);
      if (id) heights[id] = (c as HTMLElement).offsetHeight;
    });
    if (Object.keys(heights).length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(heights));
    }
  });
  cards.forEach(card => resizeObserver!.observe(card));
}

function initDashboardCustomizer() {
  const cssId = 'dashboard-customizer-css';
  if (!document.getElementById(cssId)) {
    const link = document.createElement('link');
    link.id = cssId;
    link.rel = 'stylesheet';
    link.href = '/api/plugins/dashboard-customizer/custom-styles.css';
    document.head.appendChild(link);
  }

  setupCards();

  let debounce: ReturnType<typeof setTimeout> | null = null;
  new MutationObserver(() => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(setupCards, 400);
  }).observe(document.body, { childList: true, subtree: true });
}

export const handler = (setFlag: SetFeatureFlag) => {
  useEffect(() => {
    setFlag('DASHBOARD_CUSTOMIZER', true);
    initDashboardCustomizer();
  }, []);
};
