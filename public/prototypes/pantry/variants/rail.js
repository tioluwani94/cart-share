import { tile, add, footer, empty } from '../shared.js';
export function render(ctx) {
  if (!ctx.products.length) return empty();
  const rows = [];
  for (let i = 0; i < ctx.products.length; i += 4) rows.push(ctx.products.slice(i, i + 4));
  return `<div class="variant rail"><div class="rail-title"><span>Everything in its place</span><span>${ctx.products.length} products</span></div>
    ${rows.map((row, i) => `<section class="rail-shelf" aria-label="Shelf ${i + 1}"><span class="shelf-number">0${i + 1}</span><div class="shelf-products">${row.map(p => tile(p, ctx)).join('')}<div class="floating-ledge" aria-hidden="true"></div></div></section>`).join('')}
    ${add()}${footer()}</div>`;
}
