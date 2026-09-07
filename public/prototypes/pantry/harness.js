import { initialProducts, extraProduct, visibleProducts, grouped, variantIndex, escapeHTML as e } from './data.js';
import { icon, photo } from './shared.js';
import { render as oak } from './variants/oak.js';
import { render as rail } from './variants/rail.js';
import { render as aisle } from './variants/aisle.js';
import { render as drawer } from './variants/drawer.js';
import { render as focus } from './variants/focus.js';

const variants = [oak, rail, aisle, drawer, focus];
const stage = document.getElementById('stage');
const reviewMode = document.body.dataset.review === 'aisle';
const scroller = document.getElementById('review-scroll') || stage;
const picker = document.querySelector('.proto-picker');
const highlight = picker?.querySelector('.proto-picker-highlight');
const items = [...(picker?.querySelectorAll('.proto-picker-item:not(.proto-picker-replay)') || [])];
const dialog = document.getElementById('detail');
const body = document.getElementById('detail-body');
const search = document.getElementById('search');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
let products = structuredClone(initialProducts);
let shop = new Set();
let status = 'all';
let current = 0;
let focusIndex = 0;
let openDrawer = '';
let toastTimer;
let lastProduct;

function context() {
  return { products: visibleProducts(products, status, search.value), shop, focus: focusIndex, openDrawer };
}
function moveHighlight() {
  const el = items[current];
  if (!el || !highlight) return;
  highlight.style.width = el.offsetWidth + 'px';
  highlight.style.transform = `translateX(${el.offsetLeft}px)`;
}
function renderFilters() {
  document.getElementById('filters').innerHTML = ['all', 'learning', 'paused'].map(value => {
    const count = value === 'all' ? products.length : products.filter(p => p.status === value).length;
    return `<button class="filter" data-status="${value}" aria-pressed="${status === value}">${value === 'all' ? 'All shelves' : value === 'learning' ? 'Learning' : 'Paused'} <small>${count}</small></button>`;
  }).join('');
}
function mount({ resetScroll = false, replay = false } = {}) {
  const scroll = resetScroll ? 0 : scroller.scrollTop;
  stage.innerHTML = variants[current](context());
  scroller.scrollTop = scroll;
  renderFilters();
  if (replay && !reduceMotion.matches) {
    stage.firstElementChild?.animate([{ opacity: .4, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 240, easing: 'cubic-bezier(.23,1,.32,1)' });
  }
  const badge = document.getElementById('shop-count');
  if (badge) { badge.textContent = shop.size; badge.hidden = shop.size === 0; }
  document.getElementById('shop-open')?.setAttribute('aria-label', `View demo shopping list, ${shop.size} items`);
}
function setActive(i) {
  if (i < 0 || i >= variants.length) return;
  current = reviewMode ? 2 : i;
  items.forEach((el, j) => {
    el.toggleAttribute('data-active', j === i);
    if (j === i) el.setAttribute('aria-current', 'true');
    else el.removeAttribute('aria-current');
  });
  moveHighlight();
  const url = new URL(location);
  url.searchParams.set('v', current + 1);
  history.replaceState(null, '', url);
  openDrawer = '';
  focusIndex = 0;
  mount({ resetScroll: true });
}
function toast(message) {
  const el = document.querySelector('.toast');
  clearTimeout(toastTimer);
  el.textContent = message;
  el.classList.add('visible');
  toastTimer = setTimeout(() => el.classList.remove('visible'), 2400);
}
function show(html) {
  body.innerHTML = html;
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
}
function close() {
  document.activeElement?.blur();
  dialog.close();
  if (lastProduct) stage.querySelector(`[data-product="${lastProduct}"]`)?.focus({ preventScroll: true });
}
const detailTop = label => `<div class="detail-top"><span class="eyebrow">${label}</span><button class="icon-button" data-close aria-label="Close">${icon('close')}</button></div>`;
const demoNotice = '<p class="demo-notice">Local prototype · your real pantry is unchanged.</p>';
function showProduct(id) {
  const p = products.find(product => product.id === id);
  if (!p) return;
  lastProduct = id;
  show(`<div class="detail-inner">${detailTop(e(p.category))}<div class="detail-photo">${photo(p)}</div><h2 id="detail-title">${e(p.name)}</h2>
    <p class="detail-copy">${p.status === 'learning' ? 'OurPantry noticed this in your shopping. Choose to track it when you’re ready.' : p.status === 'paused' ? 'Still on your shelf, with reminders paused. Resume whenever it feels right.' : 'A gentle reminder to check, not a claim that you’ve run out.'}</p>
    <div class="rhythm-field"><label for="cadence">Usually buy every</label><select id="cadence">${[7,14,21,28,30].map(days => `<option value="${days}" ${p.days === days ? 'selected' : ''}>${days} days</option>`).join('')}</select></div>
    <div class="detail-actions"><button class="primary" data-shop-add="${p.id}">${shop.has(p.id) ? 'On your next shop · remove' : 'Add to next shop'}</button>
    <button class="secondary" data-save="${p.id}">${p.status === 'learning' ? 'Start tracking' : p.status === 'paused' ? 'Resume reminders' : 'Save reminder rhythm'}</button>
    ${p.status === 'active' ? `<button class="quiet-action" data-pause="${p.id}">Pause reminders</button>` : ''}</div>${demoNotice}</div>`);
}
function showShop() {
  const list = products.filter(p => shop.has(p.id));
  show(`<div class="detail-inner">${detailTop('YOUR NEXT SHOP')}<h2 id="detail-title">${list.length ? `${list.length} thing${list.length === 1 ? '' : 's'} to pick up` : 'Your list is ready for you'}</h2><p class="detail-copy">Tap a product on your shelves to add it here.</p><div class="shop-list">${list.map(p => `<div class="shop-row">${photo(p)}<span>${e(p.name)}</span><button class="icon-button" data-shop-remove="${p.id}" aria-label="Remove ${e(p.name)} from demo shopping list">${icon('close')}</button></div>`).join('')}</div><button class="primary" data-close>Back to the pantry</button>${demoNotice}</div>`);
}
function showAdd() {
  if (products.some(p => p.id === extraProduct.id)) {
    toast('Red onions are already on your shelf');
    return;
  }
  show(`<div class="detail-inner">${detailTop('MAKE ROOM FOR A FAVOURITE')}<div class="detail-photo">${photo(extraProduct)}</div><h2 id="detail-title">Red onions</h2><p class="detail-copy">Try adding a new product to see how this pantry grows.</p><div class="rhythm-field"><label for="new-cadence">Usually buy every</label><select id="new-cadence"><option value="7">7 days</option><option value="14" selected>14 days</option><option value="28">28 days</option></select></div><button class="primary" data-confirm-add>Add to pantry</button>${demoNotice}</div>`);
}
const searchToggle = document.getElementById('search-toggle');
const shopIcon = document.getElementById('shop-icon');
if (searchToggle) searchToggle.innerHTML = icon('search');
if (shopIcon) shopIcon.innerHTML = icon('shop');
const searchSymbol = document.querySelector('.search-symbol');
if (searchSymbol) searchSymbol.innerHTML = icon('search');
document.querySelectorAll('[data-tab]').forEach(el => { const name = el.dataset.tab; el.innerHTML = `${icon(name)}${name[0].toUpperCase() + name.slice(1)}`; });
searchToggle?.addEventListener('click', () => {
  const wrap = document.querySelector('.search-wrap');
  wrap.hidden = !wrap.hidden;
  document.getElementById('search-toggle').setAttribute('aria-expanded', !wrap.hidden);
  if (!wrap.hidden) search.focus();
  else { search.value = ''; search.blur(); mount({ resetScroll:true }); }
});
search.addEventListener('input', () => { focusIndex = 0; mount({ resetScroll:!reviewMode }); });
search.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === 'Escape') search.blur(); });
scroller.addEventListener('touchmove', () => { if (document.activeElement === search) search.blur(); }, { passive:true });
scroller.addEventListener('wheel', () => { if (document.activeElement === search) search.blur(); }, { passive:true });
document.addEventListener('pointerdown', event => { if (!event.target.closest('input,select,textarea,.search-wrap')) document.activeElement?.blur(); });
document.getElementById('shop-open')?.addEventListener('click', showShop);
document.getElementById('demo-shop-tab')?.addEventListener('click', showShop);
if (reviewMode) {
  const phone = document.querySelector('.phone');
  let scheduled = false;
  scroller.addEventListener('scroll', () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      const offset = Math.max(0,scroller.scrollTop);
      phone.style.setProperty('--chrome-opacity',Math.min(1,offset / 16));
      phone.style.setProperty('--title-opacity',Math.max(0,Math.min(1,(offset - 20) / 36)));
      phone.style.setProperty('--large-title-opacity',1 - Math.max(0,Math.min(1,(offset - 8) / 48)));
      scheduled = false;
    });
  }, { passive:true });
}
document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  const d = button.dataset;
  if ('status' in d) { status = d.status; focusIndex = 0; mount({ resetScroll:true }); }
  if ('product' in d) showProduct(d.product);
  if ('clear' in d) { status = 'all'; search.value = ''; mount({ resetScroll:true }); }
  if ('add' in d) showAdd();
  if ('close' in d) close();
  if ('profile' in d) show(`<div class="detail-inner">${detailTop('EXISTING APP NAVIGATION')}<h2 id="detail-title">Your household settings</h2><p class="detail-copy">Your profile and settings stay in the app’s existing header. Search belongs to the Pantry content below it.</p><div class="detail-actions"><button class="primary" data-close>Back to the design</button></div>${demoNotice}</div>`);
  if ('drawer' in d) { openDrawer = openDrawer === d.drawer ? '' : d.drawer; mount(); stage.querySelector(`[data-drawer="${d.drawer}"]`)?.focus({ preventScroll:true }); }
  if ('focus' in d) { focusIndex = Number(d.focus); mount(); }
  if ('scrollShelf' in d) {
    const rail = stage.querySelector(`[data-shelf="${d.scrollShelf}"]`);
    const end = rail.scrollWidth - rail.clientWidth;
    rail.scrollTo({ left:rail.scrollLeft >= end - 5 ? 0 : Math.min(rail.scrollLeft + 160,end), behavior:reduceMotion.matches ? 'instant' : 'smooth' });
  }
  if ('shopAdd' in d) {
    const id = d.shopAdd;
    const added = !shop.has(id);
    if (added) shop.add(id); else shop.delete(id);
    mount(); close(); toast(added ? 'Added to your demo shopping list' : 'Removed from your demo shopping list');
  }
  if ('shopRemove' in d) { shop.delete(d.shopRemove); mount(); showShop(); }
  if ('save' in d) {
    const p = products.find(p => p.id === d.save);
    p.days = Number(document.getElementById('cadence').value);
    p.status = 'active'; p.note = `Usually bought every ${p.days} days`; p.next = `Check in ${p.days} days`;
    mount(); close(); toast(`${p.name} · ${p.days} day rhythm saved`);
  }
  if ('pause' in d) {
    const p = products.find(p => p.id === d.pause);
    p.status = 'paused'; p.next = 'Paused'; mount(); close(); toast(`${p.name} reminders paused`);
  }
  if ('confirmAdd' in d) {
    const days = Number(document.getElementById('new-cadence').value);
    products.push({ ...extraProduct, days, next:`Check in ${days} days` });
    status = 'all'; search.value = ''; mount(); close(); toast('Made room for red onions');
  }
});
dialog.addEventListener('click', event => {
  if (event.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (event.clientY < r.top || event.clientX < r.left || event.clientX > r.right) close();
  }
});
items.forEach((el, i) => el.addEventListener('click', () => setActive(i)));
picker?.querySelector('.proto-picker-replay')?.addEventListener('click', () => mount({ replay:true }));
window.addEventListener('resize', moveHighlight);
document.addEventListener('keydown', event => {
  if (reviewMode) return;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable || dialog.open) return;
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const num = parseInt(event.key,10);
  if (num >= 1 && num <= variants.length) setActive(num - 1);
  else if (event.key === 'ArrowRight') { event.preventDefault(); setActive((current + 1) % variants.length); }
  else if (event.key === 'ArrowLeft') { event.preventDefault(); setActive((current - 1 + variants.length) % variants.length); }
  else if (event.key.toLowerCase() === 'r') mount({ replay:true });
});
let touchStart;
stage.addEventListener('touchstart', event => {
  if (current === 4 && event.target.closest('.focus-cabinet')) touchStart = [event.touches[0].clientX,event.touches[0].clientY];
}, { passive:true });
stage.addEventListener('touchend', event => {
  if (!touchStart) return;
  const dx = event.changedTouches[0].clientX - touchStart[0];
  const dy = event.changedTouches[0].clientY - touchStart[1];
  touchStart = undefined;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    const count = grouped(context().products).length;
    if (count) { focusIndex = (focusIndex + (dx < 0 ? 1 : -1) + count) % count; mount(); }
  }
}, { passive:true });
window.addEventListener('popstate', () => setActive(variantIndex(new URLSearchParams(location.search).get('v'))));
setActive(variantIndex(new URLSearchParams(location.search).get('v')));
document.fonts.ready.then(() => {
  moveHighlight();
  // Local readiness signal only: no identity, household data, or external service.
  // Lets the developer verify that Safari executed the harness on the device.
  Promise.all([...stage.querySelectorAll('img')].map(img => img.decode().catch(() => {})))
    .then(() => fetch(`/__ready?v=${current + 1}`, { cache:'no-store' }).catch(() => {}));
});
requestAnimationFrame(() => requestAnimationFrame(() => picker?.setAttribute('data-ready','')));
