import { TYPES } from './engine.js';
import { createModel } from './sprite-models.js';
import { rasterize, DIRECTIONS } from './sprite-raster.js';
export { DIRECTIONS } from './sprite-raster.js';

export class SpriteAtlas {
  constructor(){this.cache=new Map();this.metadata=new WeakMap();}
  get(type,team=0,frame=0,dir=0,turretDir=dir){
    const building=TYPES[type].kind==='building',armed=['tank','cruiser','destroyer','gun'].includes(type);
    if(building)dir=0;
    if(!armed)turretDir=dir;
    const key=`${type}:${team}:${frame%4}:${dir}:${turretDir}`;
    if(this.cache.has(key))return this.cache.get(key);
    const model=createModel(type,team,frame,dir,turretDir,DIRECTIONS),result=rasterize(model);
    // Bound memory when many combinations of hull and turret heading are seen.
    if(this.cache.size>=640)for(const old of [...this.cache.keys()].slice(0,128))this.cache.delete(old);
    this.cache.set(key,result.canvas);this.metadata.set(result.canvas,result);return result.canvas;
  }
  icon(target,type,team=0){
    const ctx=target.getContext('2d');ctx.clearRect(0,0,target.width,target.height);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    const image=this.get(type,team,0,0),b=this.metadata.get(image).bounds,pad=5;
    const scale=Math.min((target.width-pad*2)/b.w,(target.height-pad*2)/b.h);
    ctx.drawImage(image,b.x,b.y,b.w,b.h,Math.round((target.width-b.w*scale)/2),Math.round((target.height-b.h*scale)/2),b.w*scale,b.h*scale);
  }
  opaque(sprite,x,y){
    x=Math.floor(x);y=Math.floor(y);if(x<0||y<0||x>=sprite.width||y>=sprite.height)return false;
    return this.metadata.get(sprite).pixels[(y*sprite.width+x)*4+3]>45;
  }
}
