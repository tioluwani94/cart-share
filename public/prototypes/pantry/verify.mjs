import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
const source = await readFile(new URL('./data.js',import.meta.url),'utf8');
const data = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

test('demo data has distinct products, real local assets, and no stock quantities', async () => {
  const products = [...data.initialProducts,data.extraProduct];
  assert.equal(new Set(products.map(p => p.id)).size,13);
  const files = await readdir(new URL('./assets/',import.meta.url));
  for (const p of products) {
    assert.ok(files.includes(p.id + '.webp'));
    assert.ok(['learning','active','paused'].includes(p.status));
    assert.ok(!('stock' in p));
    assert.ok(p.days > 0);
  }
});
test('search and status filters keep learning opt-in separate', () => {
  assert.equal(data.visibleProducts(data.initialProducts,'learning','').length,2);
  assert.equal(data.visibleProducts(data.initialProducts,'paused','').length,1);
  assert.equal(data.visibleProducts(data.initialProducts,'all',' MILK ')[0].id,'milk');
  assert.equal(data.visibleProducts(data.initialProducts,'learning','milk').length,0);
  assert.equal(data.visibleProducts(data.initialProducts,'all','unknown').length,0);
});
test('grouping includes new products and removes empty categories', () => {
  assert.equal(data.grouped(data.initialProducts).length,4);
  assert.equal(data.grouped([data.extraProduct])[0].name,'Fruit & veg');
  assert.equal(data.grouped([...data.initialProducts,data.extraProduct])[2].products.length,4);
  assert.deepEqual(data.grouped([]),[]);
});
test('five URL variants resolve deterministically with safe fallback', () => {
  for (const v of [null,undefined,0,6,-1,'bad','2.5']) assert.equal(data.variantIndex(v),0);
  for(let i=1;i<=5;i++) assert.equal(data.variantIndex(i),i-1);
});
test('product-shaped copy is HTML escaped', () => {
  assert.equal(data.escapeHTML('<script>'), '&lt;script&gt;');
  assert.equal(data.escapeHTML('Fruit & veg'), 'Fruit &amp; veg');
});
