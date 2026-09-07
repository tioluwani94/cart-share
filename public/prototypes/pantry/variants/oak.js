import { grouped, escapeHTML as e } from '../data.js';
import { tile, add, footer, empty } from '../shared.js';
export function render(ctx) {
  if (!ctx.products.length) return empty();
  return `<div class="variant oak"><div class="cabinet-cap"><span>THE EVERYDAY CUPBOARD</span><span>${ctx.products.length} essentials</span></div><div class="cabinet">
    ${grouped(ctx.products).map(g => `<section class="oak-shelf"><div class="shelf-caption"><h2>${e(g.name)}</h2><span>${g.products.length}</span></div>${Array.from({length:Math.ceil(g.products.length / 3)},(_,i) => `<div class="shelf-products">${g.products.slice(i*3,i*3+3).map(p => tile(p, ctx)).join('')}<div class="wood-ledge" aria-hidden="true"></div></div>`).join('')}</section>`).join('')}
    </div>${add()}${footer()}</div>`;
}
