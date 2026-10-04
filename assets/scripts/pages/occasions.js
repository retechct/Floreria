import { refreshIcons, initRevealEffects } from "../components/ui.js";
import { escapeHtml } from "../core/format.js";
import { OCCASIONS } from "../core/store.js";

function renderOccasionsPage() {
  const root = document.querySelector('#occasion-directory');
  if (!root) return;
  root.innerHTML = OCCASIONS.map((occasion) => `
    <article class="occasion-directory-card">
      <a class="occasion-directory-media" href="${escapeHtml(occasion.href)}">
        <img src="${escapeHtml(occasion.image)}" alt="Arreglo floral para ${escapeHtml(occasion.title.toLowerCase())}" width="720" height="620" loading="lazy" decoding="async">
        <span>${occasion.count} ${occasion.count === 1 ? 'diseño' : 'diseños'}</span>
      </a>
      <div class="occasion-directory-copy">
        <p class="eyebrow">El detalle correcto</p>
        <h2><a href="${escapeHtml(occasion.href)}">${escapeHtml(occasion.title)}</a></h2>
        <p>${escapeHtml(occasion.description)}</p>
        <a class="occasion-directory-action" href="${escapeHtml(occasion.href)}">Ver arreglos <span aria-hidden="true">&rarr;</span></a>
      </div>
    </article>
  `).join('');
  refreshIcons();
  initRevealEffects(root);
}

export { renderOccasionsPage };
