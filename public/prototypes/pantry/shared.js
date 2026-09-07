import { escapeHTML as e } from './data.js';

const paths = {
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="m6 6 12 12M6 18 12-12"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  next: '<path d="m9 5 7 7-7 7"/>',
  down: '<path d="m5 9 7 7 7-7"/>',
  spark: '<path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4Z"/>',
  pantry: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M4 12h16M10 8h4M10 17h4"/>',
  plan: '<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4M16 3v4M4 11h16M8 15h2M14 15h2"/>',
  shop: '<path d="m4 8 2 12h12l2-12ZM8 8l4-5 4 5M9 12v4M15 12v4"/>',
  spending: '<path d="M4 3v18h17M9 15V9M14 15V5M19 15v-4"/>',
  pause: '<path d="M9 5v14M15 5v14"/>',
};
export const icon = name => `<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.pantry}</svg>`;
// Align the photographed object's base, not the transparent source canvas.
// Original images remain untouched; these are measured alpha-padding fractions.
const imageBottomPadding = { milk:.089, eggs:.267, 'honey-jar':.113, rice:.075, 'cooking-oil':.059, 'nescafe-coffee':.086, apple:.257, lemon:.238, cucumber:.157, strawberry:.266, juice:.061, potatoes:.263, 'red-onions':.250 };
export const photo = p => `<img src="./assets/${e(p.id)}.webp" style="--image-trim:${imageBottomPadding[p.id] || 0}" alt="" draggable="false" width="160" height="160" />`;
export function tile(p, ctx, extra = '') {
  const isAdded = ctx.shop.has(p.id);
  return `<button class="product ${extra} ${p.status}" data-product="${e(p.id)}" aria-label="${e(p.name)}, ${e(p.next)}${isAdded ? ', on shopping list' : ''}">
    <span class="product-photo">${photo(p)}${isAdded ? `<span class="added-marker">${icon('check')}</span>` : ''}</span>
    <span class="product-name">${e(p.name)}</span>
    <span class="product-state">${p.status === 'learning' ? icon('spark') : p.status === 'paused' ? icon('pause') : '<i></i>'}${e(p.status === 'active' ? `${p.days} day rhythm` : p.next)}</span>
  </button>`;
}
export const footer = () => `<div class="pantry-note">${icon('spark')}<p>Your shopping helps this pantry learn.<br><span>Reminders, not a live stock count.</span></p></div>`;
export const add = () => `<button class="add-product" data-add>${icon('plus')} Track something else</button>`;
export const empty = () => `<section class="empty"><span>${icon('search')}</span><h2>No products here</h2><p>Try another name or show all your shelves.</p><button class="secondary" data-clear>Show everything</button></section>`;
export const heading = (title, subtitle) => `<div class="section-heading"><div><h2>${e(title)}</h2><p>${e(subtitle)}</p></div></div>`;
