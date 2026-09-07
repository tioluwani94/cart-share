import { grouped, escapeHTML as e } from '../data.js';
import { tile, add, footer, empty, icon } from '../shared.js';
export function render(ctx) {
  if (!ctx.products.length) return empty();
  return `<div class="variant aisle">${grouped(ctx.products).map((g, i) => `<section class="aisle-section"><div class="aisle-heading"><h2>${e(g.name)}</h2><button class="icon-button" data-scroll-shelf="${i}" aria-label="See more ${e(g.name)} products">${icon('next')}</button></div>
      <div class="aisle-track" data-shelf="${i}" tabindex="0" aria-label="${e(g.name)}, swipe to browse">${g.products.map(p => tile(p, ctx)).join('')}</div><div class="aisle-ledge" aria-hidden="true"></div></section>`).join('')}${add()}${footer()}</div>`;
}
