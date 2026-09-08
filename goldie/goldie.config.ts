import { existsSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

// Run Goldie from the repository root. No app dependencies or auth overrides
// are needed: captures use the signed-in development demo account.
const appRoot = process.cwd();
const derivedData = join(homedir(), 'Library/Developer/Xcode/DerivedData');
const builds = existsSync(derivedData)
  ? readdirSync(derivedData)
      .filter((name) => /^(CartShare|OurPantry)-/.test(name))
      .map((name) => join(derivedData, name, 'Build/Products/Release-iphonesimulator/OurPantry.app'))
      .filter((path) => existsSync(path))
      .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
  : [];

export default {
  appRoot,
  appPath: builds[0] ?? resolve(appRoot, 'build/Release-iphonesimulator/OurPantry.app'),
  bundleId: 'app.ourpantry',
  devices: ['iphone-6.9'],
  locales: ['en-US'],
  appearance: 'light',
  frame: { variant: '17-pro-silver' },
  theme: {
    background: 'linear-gradient(155deg, #FFF5EE 0%, #FAF8F3 55%, #F0F7F5 100%)',
    headlineColor: '#1D1D1B',
    subheadColor: '#5F6059',
    fontFamily: '"DM Sans", system-ui, sans-serif',
    copyHeightRatio: 0.23,
    deviceWidthRatio: 0.86,
    template: ['hero', 'classic', 'offset', 'classic'],
    layout: 'classic',
  },
  store: {
    name: 'OurPantry: Family Groceries',
    subtitle: { 'en-US': 'Shared lists. Fewer forgotten.' },
    developer: 'Tioluwani Kolawole',
    category: 'Shopping',
    // Studio placeholders only, not claims of public reviews or approved rating.
    rating: 0,
    ratingCount: 'Not yet rated',
    ageRating: '4+',
    price: 'Free',
    description: {
      'en-US': 'Keep grocery shopping together. Share your household list, give your regulars a quick kitchen check, and plan the next shop.\n\nOurPantry remembers shopping patterns without pretending to know what is left in your kitchen. Review suggestions, choose what to add, and see grocery spending against your monthly budget.',
    },
  },
  scenes: [
    {
      kind: 'screenshot', id: 'shared-shop', flow: 'store-01-shop',
      headline: { 'en-US': 'One list, together' },
      subhead: { 'en-US': 'Keep your household’s groceries in sync.' },
    },
    {
      kind: 'screenshot', id: 'quick-check', flow: 'store-02-quick-check',
      layout: 'classic',
      headline: { 'en-US': 'Remember your regulars' },
      subhead: { 'en-US': 'A quick kitchen check before your next shop.' },
    },
    {
      kind: 'screenshot', id: 'pantry', flow: 'store-03-pantry',
      layout: 'classic',
      headline: { 'en-US': 'Your household’s pantry' },
      subhead: { 'en-US': 'Keep everyday favourites easy to find.' },
    },
    {
      kind: 'screenshot', id: 'spending', flow: 'store-04-spending',
      headline: { 'en-US': 'Know where it goes' },
      subhead: { 'en-US': 'See grocery trips, totals and your monthly budget.' },
    },
    {
      kind: 'preview', id: 'preview',
      segments: [
        { id: 'check', flow: 'store-preview-01-check', holdSeconds: 1 },
        { id: 'shop', flow: 'store-preview-02-shop', holdSeconds: 1 },
        { id: 'pantry', flow: 'store-preview-03-pantry', holdSeconds: 1 },
      ],
    },
  ],
};
