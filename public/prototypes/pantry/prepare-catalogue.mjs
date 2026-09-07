// Derived preview assets only. Never changes the generated source PNGs.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const root = new URL('.', import.meta.url);
const source = JSON.parse(await readFile(new URL('catalogue-source.json', root), 'utf8'));
await mkdir(new URL('assets/catalogue/',root),{recursive:true});
const images=[];
for(const item of source.images) {
  const {data,info}=await sharp(item.path).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let left=info.width,top=info.height,right=0,bottom=0,transparent=0;
  for(let y=0;y<info.height;y++) for(let x=0;x<info.width;x++) {
    const alpha=data[(y*info.width+x)*4+3];
    if(alpha===0)transparent++;
    if(alpha>24) {left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  }
  if(!transparent || right<=left) throw Error(`Missing alpha or object: ${item.id}`);
  const size= Math.min(128/((right-left+1)/info.width),142/((bottom-top+1)/info.height));
  const offset=-(info.height-1-bottom)/info.height*size;
  await sharp(item.path).resize(512,512,{fit:'inside'}).webp({quality:88,alphaQuality:100}).toFile(fileURLToPath(new URL(`assets/catalogue/${item.id}.webp`,root)));
  images.push({id:item.id,name:item.name,category:item.category,size:Number(size.toFixed(2)),bottom:Number(offset.toFixed(2)),transparentFraction:Number((transparent/(info.width*info.height)).toFixed(3))});
}
await writeFile(new URL('catalogue-assets.js',root),`// Derived by prepare-catalogue.mjs; original alpha is preserved.\nexport const catalogueAssets = ${JSON.stringify(images,null,2)};\n`);
console.log(`Prepared ${images.length} alpha-preserving WebP previews.`);
