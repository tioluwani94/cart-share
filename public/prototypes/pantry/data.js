export const categories = ['Breakfast', 'Cupboard', 'Fruit & veg', 'Fresh favourites'];
export const initialProducts = [
  { id: 'milk', name: 'Milk', category: 'Breakfast', days: 7, status: 'active', note: 'Usually bought every week', next: 'Check Saturday' },
  { id: 'eggs', name: 'Eggs', category: 'Breakfast', days: 7, status: 'active', note: 'Usually bought every week', next: 'Check Saturday' },
  { id: 'honey-jar', name: 'Honey', category: 'Breakfast', days: 30, status: 'active', note: 'Usually bought every month', next: 'Check in 3 weeks' },
  { id: 'rice', name: 'Rice', category: 'Cupboard', days: 28, status: 'active', note: 'Usually bought every 4 weeks', next: 'Check in 2 weeks' },
  { id: 'cooking-oil', name: 'Olive oil', category: 'Cupboard', days: 30, status: 'active', note: 'Usually bought every month', next: 'Check in 3 weeks' },
  { id: 'nescafe-coffee', name: 'Coffee', category: 'Cupboard', days: 21, status: 'paused', note: 'Reminders are paused', next: 'Paused' },
  { id: 'apple', name: 'Apples', category: 'Fruit & veg', days: 7, status: 'active', note: 'Usually bought every week', next: 'Check Saturday' },
  { id: 'lemon', name: 'Lemons', category: 'Fruit & veg', days: 14, status: 'active', note: 'Usually bought every 2 weeks', next: 'Check next week' },
  { id: 'cucumber', name: 'Cucumber', category: 'Fruit & veg', days: 7, status: 'active', note: 'Usually bought every week', next: 'Check Saturday' },
  { id: 'strawberry', name: 'Strawberries', category: 'Fresh favourites', days: 7, status: 'learning', note: 'Bought twice · still learning', next: 'Learning' },
  { id: 'juice', name: 'Orange juice', category: 'Fresh favourites', days: 7, status: 'learning', note: 'Bought once · still learning', next: 'Learning' },
  { id: 'potatoes', name: 'Potatoes', category: 'Fresh favourites', days: 14, status: 'active', note: 'Usually bought every 2 weeks', next: 'Check next week' },
];
export const extraProduct = { id: 'red-onions', name: 'Red onions', category: 'Fruit & veg', days: 14, status: 'active', note: 'Usually bought every 2 weeks', next: 'Check in 14 days' };
export function visibleProducts(products, status, search) {
  return products.filter(p => (status === 'all' || p.status === status) && p.name.toLowerCase().includes(search.trim().toLowerCase()));
}
export function grouped(products) {
  return categories.map(name => ({ name, products: products.filter(p => p.category === name) })).filter(g => g.products.length);
}
export function variantIndex(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 5 ? number - 1 : 0;
}
export const escapeHTML = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
