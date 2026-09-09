// Orthographic software rasterizer: depth-buffered, directionally lit, textured pixels.
// Sprite generation is cached; the main game still renders inexpensive 2D images.
export const SPRITE_W=256, SPRITE_H=224, ORIGIN_X=128, ORIGIN_Y=168, DIRECTIONS=16;
const LIGHT=[-.52,.38,.765], VIEW=[.577,.577,.577];
const colorCache=new Map();
const rgb=color=>{if(!colorCache.has(color))colorCache.set(color,[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)));return colorCache.get(color);};
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const normalize=v=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l);};
const noise=(x,y,z)=>{let h=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,2147483647);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;};
const project=([x,y,z])=>[ORIGIN_X+x-y,ORIGIN_Y+(x+y)*.5-z,x+y+z];
const edge=(a,b,x,y)=>(x-a[0])*(b[1]-a[1])-(y-a[1])*(b[0]-a[0]);

export function rasterize(model) {
  const pixels=new Uint8ClampedArray(SPRITE_W*SPRITE_H*4),depth=new Float32Array(SPRITE_W*SPRITE_H).fill(-Infinity),shadow=new Uint8Array(SPRITE_W*SPRITE_H);
  const renderTriangle=(vertices,world,mat,normal,isShadow=false)=>{
    let [a,b,c]=vertices;const area=edge(a,b,c[0],c[1]);if(Math.abs(area)<.02)return;
    const minX=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),maxX=Math.min(SPRITE_W-1,Math.ceil(Math.max(a[0],b[0],c[0])));
    const minY=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),maxY=Math.min(SPRITE_H-1,Math.ceil(Math.max(a[1],b[1],c[1])));
    const base=isShadow?null:rgb(mat.color),diffuse=isShadow?0:Math.max(0,dot(normal,LIGHT));
    const halfway=normalize(LIGHT.map((v,i)=>v+VIEW[i]));
    const spec=mat?.metal?Math.pow(Math.max(0,dot(normal,halfway)),18)*.2:0;
    for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
      const u=edge(b,c,x+.5,y+.5)/area,v=edge(c,a,x+.5,y+.5)/area,w=1-u-v;
      if(u<-.001||v<-.001||w<-.001)continue;
      const index=y*SPRITE_W+x;
      if(isShadow){shadow[index]=1;continue;}
      const d=a[2]*u+b[2]*v+c[2]*w;if(d<depth[index]-.001)continue;
      depth[index]=d;
      const wx=world[0][0]*u+world[1][0]*v+world[2][0]*w,wy=world[0][1]*u+world[1][1]*v+world[2][1]*w,wz=world[0][2]*u+world[1][2]*v+world[2][2]*w;
      const grain=(noise(Math.floor(wx*1.7),Math.floor(wy*1.7),Math.floor(wz*1.7))-.5)*(mat.grain||0);
      const mottling=mat.rough?(noise(Math.floor(wx/3),Math.floor(wy/3),Math.floor(wz/3))-.5)*9:0;
      const ao=.79+.21*Math.min(1,Math.max(0,wz)/20);
      const light=Math.max(mat.glow||0,(.53+diffuse*.66)*ao)+spec;
      const n=index*4;
      for(let k=0;k<3;k++){const temperature=k===0?1.035:k===2?.965:1;pixels[n+k]=Math.min(255,Math.max(0,Math.round((base[k]*light+grain+mottling)*temperature/3)*3));}
      pixels[n+3]=255;
    }
  };
  for(const f of model.faces){
    const normal=f.normal||normalize(cross(f.points[1].map((v,i)=>v-f.points[0][i]),f.points[2].map((v,i)=>v-f.points[0][i])));
    // Flatten the complete volume along the sun direction onto the ground.
    const projectedShadow=f.points.map(([x,y,z])=>project([x-LIGHT[0]/LIGHT[2]*Math.max(0,z),y-LIGHT[1]/LIGHT[2]*Math.max(0,z),0]));
    if(dot(normal,LIGHT)>.1)for(let i=1;i<f.points.length-1;i++)renderTriangle([projectedShadow[0],projectedShadow[i],projectedShadow[i+1]],null,null,null,true);
    if(dot(normal,VIEW)<-.03)continue;
    const projected=f.points.map(project);
    for(let i=1;i<f.points.length-1;i++)renderTriangle([projected[0],projected[i],projected[i+1]],[f.points[0],f.points[i],f.points[i+1]],f.material,normal);
  }
  // Single-pixel silhouette definition and small contact shadows replace thick outlines.
  const snapshot=pixels.slice();
  for(let y=1;y<SPRITE_H-1;y++)for(let x=1;x<SPRITE_W-1;x++){
    const i=y*SPRITE_W+x,n=i*4;
    if(snapshot[n+3]){
      const exposed=!snapshot[(i-1)*4+3]||!snapshot[(i+1)*4+3]||!snapshot[(i-SPRITE_W)*4+3]||!snapshot[(i+SPRITE_W)*4+3];
      if(exposed)for(let k=0;k<3;k++)pixels[n+k]*=.78;
      // Narrow upper-edge glints describe roof lips and armor plates; darker
      // depth discontinuities below them separate overlapping machinery.
      else if(depth[i]-depth[i-SPRITE_W]>3&&depth[i]-depth[i-SPRITE_W]<24)
        for(let k=0;k<3;k++)pixels[n+k]=Math.min(255,pixels[n+k]*1.12+5);
      else if(depth[i-SPRITE_W]-depth[i]>4&&depth[i-SPRITE_W]-depth[i]<30)for(let k=0;k<3;k++)pixels[n+k]*=.73;
    }else{
      const amount=(shadow[i]*4+shadow[i-1]+shadow[i+1]+shadow[i-SPRITE_W]+shadow[i+SPRITE_W])/8;
      if(amount){pixels[n]=12;pixels[n+1]=20;pixels[n+2]=24;pixels[n+3]=amount*78;}
    }
  }
  const canvas=document.createElement('canvas');canvas.width=SPRITE_W;canvas.height=SPRITE_H;
  canvas.getContext('2d').putImageData(new ImageData(pixels,SPRITE_W,SPRITE_H),0,0);
  let left=SPRITE_W,top=SPRITE_H,right=0,bottom=0;
  for(let y=0;y<SPRITE_H;y++)for(let x=0;x<SPRITE_W;x++)if(pixels[(y*SPRITE_W+x)*4+3]>100){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
  return {canvas,pixels,bounds:{x:left,y:top,w:right-left+1,h:bottom-top+1}};
}
