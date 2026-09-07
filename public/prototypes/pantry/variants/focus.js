import { grouped, escapeHTML as e } from '../data.js';
import { tile, add, footer, empty, icon } from '../shared.js';
export function render(ctx) {
  if (!ctx.products.length) return empty();
  const groups = grouped(ctx.products);
  const selected = Math.min(ctx.focus, groups.length - 1);
  const g = groups[selected];
  return `<div class="variant focus"><div class="focus-tabs" aria-label="Choose a shelf">${groups.map((group, i) => `<button data-focus="${i}" aria-pressed="${i === selected}">${e(group.name)}</button>`).join('')}</div>
    <div class="focus-cabinet"><div class="focus-heading"><span class="eyebrow">YOUR ${e(g.name.toUpperCase())} SHELF</span><h2>${selected === 0 ? 'Good mornings<br>start here.' : e(g.name === 'Cupboard' ? 'The kitchen regulars.' : g.name === 'Fruit & veg' ? 'A little daily goodness.' : 'Fresh favourites.')}</h2><span>${g.products.length} things worth remembering</span></div>
    <div class="focus-grid">${Array.from({length:Math.ceil(g.products.length / 2)},(_,i) => `<div class="focus-row">${g.products.slice(i*2,i*2+2).map(p => tile(p,ctx)).join('')}<div class="focus-plinth" aria-hidden="true"></div></div>`).join('')}</div></div>
    <div class="focus-pagination"><button class="icon-button" data-focus="${(selected - 1 + groups.length) % groups.length}" aria-label="Previous shelf"><span class="reverse">${icon('next')}</span></button><span>${groups.map((group, i) => `<button data-focus="${i}" aria-label="${e(group.name)} shelf" aria-pressed="${i === selected}"><i></i></button>`).join('')}</span><button class="icon-button" data-focus="${(selected + 1) % groups.length}" aria-label="Next shelf">${icon('next')}</button></div>${add()}${footer()}</div>`;
}
