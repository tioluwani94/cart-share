import { catalogueAssets } from './catalogue-assets.js';
import { escapeHTML as e } from './data.js';
import { icon } from './shared.js';
const stage=document.getElementById('catalogue-stage');
const groups=['Breakfast','Cupboard','Fruit & veg','Fresh favourites','Your extras'];
const aliases={milk:'milk','whole milk':'milk','semi skimmed milk':'milk','oat milk':'oat-milk','oat drink':'oat-milk',egg:'eggs',eggs:'eggs',bread:'bread',rice:'rice',pasta:'pasta',penne:'pasta','cooking oil':'oil','vegetable oil':'oil',egusi:'egusi','melon seeds':'egusi',chicken:'chicken','chicken breast':'chicken',salmon:'salmon',apple:'apple',apples:'apple',banana:'banana',bananas:'banana',orange:'orange',oranges:'orange',grape:'grapes',grapes:'grapes',tomato:'tomato',tomatoes:'tomato',carrot:'carrot',carrots:'carrot',broccoli:'broccoli',pepper:'pepper',peppers:'pepper','bell pepper':'pepper',onion:'onion',onions:'onion'};
function tile(asset,name=asset.name,note='Catalogue sample') {
  return `<article class="product"><span class="product-photo"><img src="./assets/catalogue/${asset.id}.webp" style="--asset-size:${asset.size}px;--asset-bottom:${asset.bottom}px" width="160" height="160" alt="" /></span><span class="product-name">${e(name)}</span><span class="product-state">${e(note)}</span></article>`;
}
stage.innerHTML=groups.map((name,i)=>{
  const assets=catalogueAssets.filter(a=>a.category===name);
  return `<section class="aisle-section"><div class="aisle-heading"><h2>${e(name)}</h2><button class="icon-button" data-next="${i}" aria-label="See more ${e(name)} images">${icon('next')}</button></div><div class="aisle-track" data-track="${i}" tabindex="0" aria-label="${e(name)} images, swipe to browse">${assets.map(a=>tile(a,a.name,a.id==='fallback'?'Shared fallback':'Catalogue sample')).join('')}</div></section>`;
}).join('');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
document.querySelectorAll('[data-next]').forEach(button=>button.addEventListener('click',()=>{
  const track=stage.querySelector(`[data-track="${button.dataset.next}"]`);
  const end=track.scrollWidth-track.clientWidth;
  track.scrollTo({left:track.scrollLeft>=end-2?0:Math.min(end,track.scrollLeft+156),behavior:reduced.matches?'instant':'smooth'});
}));
document.querySelectorAll('[data-layout]').forEach(button=>button.addEventListener('click',()=>{
  stage.classList.toggle('grid',button.dataset.layout==='grid');
  document.querySelectorAll('[data-layout]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
}));
function showMatch(name) {
  const normalized=name.trim().toLowerCase().replace(/\s+/g,' ');
  const id=Object.hasOwn(aliases,normalized)?aliases[normalized]:'fallback';
  const asset=catalogueAssets.find(a=>a.id===id);
  document.getElementById('matching-result').innerHTML=tile(asset,name.trim()||'Party bits',id==='fallback'?'No match · shared fallback':`Matched to ${asset.name}`);
}
document.getElementById('matching-form').addEventListener('submit',event=>{
  event.preventDefault();const input=document.getElementById('product-name');showMatch(input.value);input.blur();
});
document.addEventListener('pointerdown',event=>{if(event.target.tagName!=='INPUT' && document.activeElement?.tagName==='INPUT')document.activeElement.blur();});
document.addEventListener('touchmove',()=>document.activeElement?.blur(),{passive:true});
document.addEventListener('wheel',()=>document.activeElement?.blur(),{passive:true});
showMatch('Party bits');
