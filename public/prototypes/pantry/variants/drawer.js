import { grouped, escapeHTML as e } from '../data.js';
import { tile, photo, add, footer, empty, icon } from '../shared.js';
export function render(ctx) {
  if (!ctx.products.length) return empty();
  return `<div class="variant drawer"><p class="drawer-intro">Open a drawer. Find your familiar things.</p><div class="drawer-stack">
    ${grouped(ctx.products).map((g, i) => `<section class="drawer-unit ${ctx.openDrawer === g.name ? 'is-open' : ''}">
      <button class="drawer-front" data-drawer="${e(g.name)}" aria-expanded="${ctx.openDrawer === g.name}" aria-controls="drawer-${i}"><span class="drawer-objects" aria-hidden="true">${g.products.slice(0, 3).map(photo).join('')}</span><span class="drawer-label"><span><strong>${e(g.name)}</strong><small>${g.products.length} familiar favourites</small></span>${icon('down')}</span><span class="drawer-pull" aria-hidden="true"></span></button>
      ${ctx.openDrawer === g.name ? `<div class="drawer-content" id="drawer-${i}">${g.products.map(p => tile(p, ctx)).join('')}</div>` : `<div id="drawer-${i}" hidden></div>`}</section>`).join('')}
    </div>${add()}${footer()}</div>`;
}
