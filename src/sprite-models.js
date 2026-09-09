// Original miniature models. Coordinates describe real depth, not painted screen faces.
// They are baked to sprites by sprite-raster.js; no WebGL or external assets are used.
const TAU = Math.PI * 2;
export const MATERIALS = {
  concrete: { color: '#9c9b89', grain: 15, rough: true },
  edge: { color: '#bbbca5', grain: 8 },
  darkConcrete: { color: '#737b72', grain: 15, rough: true },
  steel: { color: '#7e8990', grain: 9, metal: true },
  silver: { color: '#b5bdbb', grain: 6, metal: true },
  darkSteel: { color: '#404b54', grain: 7, metal: true },
  black: { color: '#202830', grain: 5 },
  track: { color: '#363b3e', grain: 12 },
  rubber: { color: '#272c30', grain: 5 },
  yellow: { color: '#d5b352', grain: 7 },
  gold: { color: '#b78944', grain: 8, metal: true },
  rust: { color: '#936550', grain: 12 },
  glass: { color: '#5592a7', grain: 2, metal: true, glow: .14 },
  glassDark: { color: '#243f51', grain: 2, metal: true },
  light: { color: '#ffd58a', grain: 0, glow: .8 },
  redLight: { color: '#ff5334', grain: 0, glow: .85 },
  greenLight: { color: '#9be9b1', grain: 0, glow: .75 },
  wood: { color: '#8b7755', grain: 15, rough: true },
  skin: { color: '#d4af87', grain: 3 },
};
export const FACTIONS = [
  { armor: { color: '#788776', grain: 9, metal: true }, paint: { color: '#b44336', grain: 9, metal: true }, bright: { color: '#f17a55', grain: 5 }, roof: { color: '#835950', grain: 11, metal: true }, cloth: { color: '#9b9271', grain: 8 }, darkPaint: { color: '#633731', grain: 8 } },
  { armor: { color: '#7d929d', grain: 7, metal: true }, paint: { color: '#37769f', grain: 6, metal: true }, bright: { color: '#82d0ed', grain: 5 }, roof: { color: '#677d90', grain: 8, metal: true }, cloth: { color: '#6d8074', grain: 7 }, darkPaint: { color: '#294758', grain: 5 } },
];
const M = MATERIALS;

export class Model {
  constructor() { this.faces = []; }
  face(points, material, normal) { this.faces.push({ points, material, normal }); }
  box(x, y, z, w, d, h, material = M.steel, bevel = 0) {
    if (bevel) return this.prism([[x + bevel, y], [x + w - bevel, y], [x + w, y + bevel], [x + w, y + d - bevel], [x + w - bevel, y + d], [x + bevel, y + d], [x, y + d - bevel], [x, y + bevel]], z, h, material);
    const a = [x,y,z], b = [x+w,y,z], c = [x+w,y+d,z], d0 = [x,y+d,z];
    const up = p => [p[0],p[1],z+h];
    this.face([up(a),up(b),up(c),up(d0)], material, [0,0,1]);
    this.face([a,b,up(b),up(a)], material, [0,-1,0]);
    this.face([b,c,up(c),up(b)], material, [1,0,0]);
    this.face([c,d0,up(d0),up(c)], material, [0,1,0]);
    this.face([d0,a,up(a),up(d0)], material, [-1,0,0]);
  }
  prism(ring, z, h, material, top = material) {
    this.face(ring.map(([x,y])=>[x,y,z+h]), top, [0,0,1]);
    for (let i=0;i<ring.length;i++) { const a=ring[i],b=ring[(i+1)%ring.length],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy); this.face([[...a,z],[...b,z],[...b,z+h],[...a,z+h]],material,[dy/len,-dx/len,0]); }
  }
  loft(rings, material, caps = true) {
    for(let r=0;r<rings.length-1;r++) for(let i=0;i<rings[r].length;i++) { const j=(i+1)%rings[r].length; this.face([rings[r][i],rings[r][j],rings[r+1][j],rings[r+1][i]],material); }
    if(caps) { this.face(rings[0].slice().reverse(),material,[0,0,-1]); this.face(rings.at(-1),material,[0,0,1]); }
  }
  cylinder(x,y,z,r,h,material,segments=16,topRadius=r) {
    const ring=(radius,height)=>Array.from({length:segments},(_,i)=>[x+Math.cos(i/segments*TAU)*radius,y+Math.sin(i/segments*TAU)*radius,height]);
    this.loft([ring(r,z),ring(topRadius,z+h)],material);
  }
  beam(a,b,r,material,segments=8) {
    const delta=b.map((v,i)=>v-a[i]),length=Math.hypot(...delta); if(length<.001)return;
    const axis=delta.map(v=>v/length),ref=Math.abs(axis[2])>.8?[1,0,0]:[0,0,1];
    const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
    let u=cross(axis,ref);const ul=Math.hypot(...u);u=u.map(v=>v/ul);const v=cross(axis,u);
    const ring=p=>Array.from({length:segments},(_,i)=>p.map((n,j)=>n+r*(Math.cos(i/segments*TAU)*u[j]+Math.sin(i/segments*TAU)*v[j])));
    const ar=ring(a),br=ring(b);for(let i=0;i<segments;i++){const j=(i+1)%segments;this.face([ar[i],ar[j],br[j],br[i]],material);}
    this.face(ar.slice().reverse(),material,axis.map(v=>-v));this.face(br,material,axis);
  }
  ring(x,y,z,r,thickness,material) { this.cylinder(x,y,z,r,thickness,material,20); }
  transform(start, angle, origin=[0,0,0]) {
    const co=Math.cos(angle),si=Math.sin(angle);
    for(let i=start;i<this.faces.length;i++) { const f=this.faces[i];f.points=f.points.map(([x,y,z])=>[x*co-y*si+origin[0],x*si+y*co+origin[1],z+origin[2]]);if(f.normal){const[x,y,z]=f.normal;f.normal=[x*co-y*si,x*si+y*co,z];} }
  }
}

// Raised insignia and hardware stay legible when sprites are reduced to map size.
function insignia(m,x,y,z,r,team,front=false) {
  const point=(u,v)=>front?[x+u,y,z+v]:[x+u,y+v,z];
  const ring=Array.from({length:team===0?10:4},(_,i)=>{
    const a=i/(team===0?10:4)*TAU-Math.PI/2;
    const radius=team===0&&i%2?r*.44:r;
    return point(Math.cos(a)*radius,Math.sin(a)*radius);
  });
  // Fan triangles also handle the concave star without overlapping its notches.
  for(let i=0;i<ring.length;i++)m.face([point(0,0),ring[i],ring[(i+1)%ring.length]],M.edge,front?[0,1,0]:[0,0,1]);
}
function railing(m,x,y,z,w,d) {
  for(const yy of [y,y+d]){
    m.beam([x,yy,z+3],[x+w,yy,z+3],.3,M.silver,5);
    for(let u=0;u<=w;u+=w/4)m.beam([x+u,yy,z],[x+u,yy,z+3],.3,M.darkSteel,5);
  }
  for(const xx of [x,x+w])m.beam([xx,y,z+3],[xx,y+d,z+3],.3,M.silver,5);
}
function foundation(m,w,d) {
  m.box(-w/2,-d/2,-1,w,d,3,M.darkConcrete,3);
  m.box(-w/2+1,-d/2+1,2,w-2,d-2,1,M.concrete,2);
  for(const x of [-w/2+2,w/2-5])for(const y of [-d/2+2,d/2-5]){
    m.box(x,y,3,3,3,.65,M.steel);
    m.cylinder(x+1.5,y+1.5,3.65,.6,.45,M.silver,6);
  }
  for(let x=-w/2+8;x<w/2-3;x+=10)m.box(x,-d/2+1,3,.35,d-2,.13,M.darkConcrete);
  for(let y=-d/2+8;y<d/2-3;y+=10)m.box(-w/2+1,y,3,w-2,.35,.13,M.darkConcrete);
}
function hazard(m,x,y,z,w,d) {
  m.box(x,y,z,w,d,.5,M.black);
  for(let u=1;u<w;u+=5)m.face([[x+u,y,z+.6],[x+Math.min(w,u+2.5),y,z+.6],[x+Math.min(w,u+4.5),y+d,z+.6],[x+Math.min(w,u+2),y+d,z+.6]],M.yellow,[0,0,1]);
}
function windows(m,x,y,z,n,spacing=6,side='front') {
  for(let i=0;i<n;i++)if(side==='front') {
    m.box(x+i*spacing,y,z,4.3,.6,5.7,M.black);m.box(x+i*spacing+.5,y+.65,z+.7,3.3,.2,4.3,i%4===1?M.glassDark:M.glass);m.box(x+i*spacing+2,y+.9,z+.5,.35,.15,4.8,M.steel);
    m.box(x+i*spacing-.3,y+.8,z-.4,4.9,1,.5,M.silver);
  }else{
    m.box(x,y+i*spacing,z,.6,4.3,5.7,M.black);m.box(x+.65,y+i*spacing+.5,z+.7,.2,3.3,4.3,i%4===1?M.glassDark:M.glass);
    m.box(x+.8,y+i*spacing-.3,z-.4,1,4.9,.5,M.silver);
  }
}
function vent(m,x,y,z,w=9,d=8) {
  m.box(x,y,z,w,d,1.2,M.silver);m.box(x+1,y+1,z+1.2,w-2,d-2,.4,M.black);
  for(let k=2;k<d-1;k+=1.5)m.box(x+1,y+k,z+1.7,w-2,.5,.3,M.steel);
}
function wallPanels(m,x,y,z,w,h,mat,front=true) {
  for(let k=0;k<w;k+=6)if(front){m.box(x+k,y,z,.55,.5,h,M.darkSteel);m.box(x+k+.7,y+.3,z+.5,.35,.3,h-1,mat);}else{m.box(x,y+k,z,.5,.55,h,M.darkSteel);m.box(x+.3,y+k+.7,z+.5,.3,.35,h-1,mat);}
}
function flag(m,x,y,z,paint,frame) {
  m.beam([x,y,z],[x,y,z+26],.45,M.silver,6);
  const wave=Math.sin(frame*Math.PI/2)*1.3;
  m.face([[x,y,z+26],[x+5,y+.7,z+25.5],[x+12,y+wave,z+24],[x+12,y+wave,z+16],[x+5,y+.7,z+17],[x,y,z+18]],paint,[0,1,.05]);
  m.face([[x+3,y+.9,z+23],[x+6,y+1,z+21],[x+3,y+1,z+20]],M.yellow,[0,1,0]);
}
function lamp(m,x,y,z,frame,mat=M.light) { m.cylinder(x,y,z,1.5,2,M.darkSteel,8);m.cylinder(x,y,z+2,1,1.7,frame%2?mat:M.gold,8); }
function ladder(m,x,y,z,height,front=true) {
  const p=(u,h)=>front?[x+u,y,z+h]:[x,y+u,z+h];
  for(const u of [0,4])m.beam(p(u,0),p(u,height),.35,M.silver,5);
  for(let h=2;h<height;h+=3)m.beam(p(0,h),p(4,h),.3,M.silver,5);
}
function barrelRoof(m,x,y,z,w,d,rise,mat,segments=16) {
  const profile=Array.from({length:segments+1},(_,i)=>[x+w/2-Math.cos(i/segments*Math.PI)*w/2,z+Math.sin(i/segments*Math.PI)*rise]);
  for(let i=0;i<segments;i++){
    const a=profile[i],b=profile[i+1],norm=[-(b[1]-a[1]),0,b[0]-a[0]],len=Math.hypot(...norm);
    m.face([[a[0],y,a[1]],[b[0],y,b[1]],[b[0],y+d,b[1]],[a[0],y+d,a[1]]],i%3===0?M.steel:mat,norm.map(v=>v/len));
  }
  m.face(profile.map(([px,pz])=>[px,y+d,pz]),mat,[0,1,0]);
  m.face(profile.map(([px,pz])=>[px,y,pz]),mat,[0,-1,0]);
  for(let u=0;u<=d;u+=5)for(let i=0;i<segments;i++)m.beam([profile[i][0],y+u,profile[i][1]+.25],[profile[i+1][0],y+u,profile[i+1][1]+.25],.28,M.silver,4);
}
function door(m,x,y,z,w,h,frame=0) {
  m.box(x-1,y,z,w+2,1,h+1.5,M.silver);m.box(x,y+1.1,z,w,.5,h,M.black);
  const open=frame===2?3:frame===3?1.5:0;
  for(let u=open;u<h;u+=2){m.box(x+.5,y+1.7,z+u,w-1,.5,1.5,M.darkSteel);m.box(x+.5,y+2.25,z+u+1.15,w-1,.15,.3,M.steel);}
  hazard(m,x-1,y+1,z+.1,w+2,5);
}
function pipes(m,points,r=1.2,mat=M.gold) { for(let i=0;i<points.length-1;i++)m.beam(points[i],points[i+1],r,mat,10); }
function crates(m,x,y,z,n=3) { for(let i=0;i<n;i++){m.box(x+i*5.2,y,z,4.5,4.5,4.5,M.wood);m.box(x+i*5.2+.6,y-.1,z+.3,.6,4.7,4.6,M.darkSteel);m.box(x+i*5.2+3.2,y-.1,z+.3,.6,4.7,4.6,M.darkSteel);} }
function coolingTower(m,x,y,z,h,paint) {
  const levels=[[0,9],[5,10],[h*.48,6.4],[h*.75,6.1],[h,8.5]];
  const rings=levels.map(([height,r])=>Array.from({length:20},(_,i)=>[x+Math.cos(i/20*TAU)*r,y+Math.sin(i/20*TAU)*r,z+height]));
  m.loft(rings,M.concrete,false);m.cylinder(x,y,z+h-.2,7.7,.3,M.black,20);m.ring(x,y,z+h,8.5,1.2,M.silver);
  m.ring(x,y,z+5,10,3,paint);m.ring(x,y,z+h*.7,6.7,2,paint);
  for(let a=0;a<16;a++){const t=a/16*TAU;m.beam([x+Math.cos(t)*9.3,y+Math.sin(t)*9.3,z+2],[x+Math.cos(t)*6.5,y+Math.sin(t)*6.5,z+h*.5],.32,M.darkConcrete,5);}
}
function storageTank(m,x,y,z,r,h,paint) {
  m.cylinder(x,y,z,r,h,M.silver,20);m.cylinder(x,y,z+h,r,3,M.steel,20,r*.7);
  m.cylinder(x,y,z+h+3,r*.7,.5,M.silver,20);
  for(const k of [2,h*.5,h-3])m.ring(x,y,z+k,r+.3,.7,paint);
  m.cylinder(x,y,z+h+3.6,1.3,2,M.black,8);
}

function building(m,type,p,team,frame,turretAngle) {
  const big=['yard','refinery','factory','shipyard'].includes(type), w=big?68:48;
  if(type!=='shipyard')foundation(m,w,w-4);
  if(type==='yard') {
    // A low assembly shed paired with a tall exposed crane: recognizable at a glance.
    m.box(-29,-23,3,46,43,28,M.concrete,2);wallPanels(m,-28,20.2,5,44,24,M.edge);
    barrelRoof(m,-29,-23,31,46,43,15,p.roof);
    for(let y=-20;y<17;y+=9)vent(m,-12,y,47,10,6);
    door(m,-23,20,3,25,23,frame);windows(m,5,20,17,2,6);
    m.box(18,-22,3,12,24,43,M.darkConcrete,1);m.box(17,-23,45,14,26,2,p.paint);
    windows(m,30,-18,32,3,7,'side');vent(m,19,-19,47,9,12);railing(m,18,-22,47,12,24);
    m.box(3,21,6,12,.8,9,p.paint);insignia(m,9,21.9,10.5,3.6,team,true);
    // Riveted yellow lifting gantry, diagonal braces, animated suspended hook.
    for(const y of [-25,22]){
      m.box(-33,y,3,5,5,64,p.paint);m.box(-34,y-1,3,7,7,5,M.darkSteel);
      m.beam([-31,y+2,26],[-13,y+2,63],1.2,M.yellow,6);
    }
    m.box(-32,-25,65,5,52,5,M.yellow);
    m.box(-32,0,65,57,5,4,M.yellow);
    for(let x=-29;x<24;x+=8){m.beam([x,0,66],[x+7,0,74],.65,M.darkSteel,5);m.beam([x+7,0,74],[x+7,0,66],.6,M.yellow,5);}
    m.beam([-31,0,74],[26,0,74],.9,M.yellow,6);
    const hook=11+frame*2;m.box(hook,-1,67,6,7,4,M.darkSteel);m.beam([hook+3,3,66],[hook+3,3,43+frame],.4,M.black,5);m.beam([hook+3,3,43+frame],[hook+5,3,40+frame],1.2,M.steel,6);
    crates(m,-26,27,3,3);flag(m,25,-18,47,p.paint,frame);lamp(m,-26,23,28,frame);
  }else if(type==='power') {
    m.box(-21,-18,3,40,32,15,M.darkConcrete,2);m.box(-21,9,3,20,11,12,p.paint,1);
    windows(m,-18,20,7,3,5.5);vent(m,-20,11,15,17,8);
    if(team===0){
      // Compact generator core with copper-wound vertical reactors.
      for(const [x,y,h]of[[-12,-8,42],[9,-8,52]]){
        m.cylinder(x,y,17,8,5,M.darkSteel,16);m.cylinder(x,y,22,5.7,h-10,M.silver,16);
        for(let z=24;z<17+h-7;z+=3.3)m.ring(x,y,z,7.2,1.7,M.gold);
        m.cylinder(x,y,17+h-7,8,3,p.paint,16);m.cylinder(x,y,17+h-4,5,6,M.steel,16,2);
        lamp(m,x,y,17+h+2,frame,M.redLight);
      }
      pipes(m,[[-13,8,18],[-13,8,30],[8,8,30],[8,-5,30]],1.3,M.gold);
      m.box(14,8,3,7,13,24,p.armor);vent(m,14,9,27,7,10);
    }else{
      coolingTower(m,-10,-7,18,41,p.paint);coolingTower(m,12,-4,18,48,p.paint);
      pipes(m,[[-12,10,17],[-12,12,24],[12,12,24],[12,5,24]],1.4,M.silver);
    }
    m.box(1,14.3,6,15,1,9,p.paint);insignia(m,8.5,15.4,10.5,3.4,team,true);
    hazard(m,-18,22,3,34,3);ladder(m,20,-15,4,16,false);lamp(m,-18,19,15,frame);
  }else if(type==='refinery') {
    m.box(-30,-25,3,23,32,33,M.darkConcrete,2);m.box(-31,-26,36,25,34,3,p.paint,1);
    windows(m,-27,7,22,3,6);wallPanels(m,-29,7.8,6,21,13,M.edge);
    for(const [x,y,h]of[[-24,-18,37],[-14,-18,47]]){
      m.cylinder(x,y,39,3.1,h,M.darkSteel,12);m.ring(x,y,39+h-9,3.5,4,p.paint);m.ring(x,y,39+h,3.7,1.5,M.silver);m.cylinder(x,y,40+h,2.5,.1,M.black,12);
      for(let z=43;z<39+h;z+=8)m.ring(x,y,z,3.2,.6,M.rust);
    }
    storageTank(m,10,-17,3,11,30,p.paint);storageTank(m,24,3,3,8,25,p.paint);
    pipes(m,[[10,-17,34],[10,-7,39],[-5,-7,39],[-5,-7,25]],1.5,M.gold);
    pipes(m,[[24,3,29],[24,14,29],[6,14,29],[6,14,10]],1.1,M.silver);
    m.box(-26,12,3,35,17,7,M.darkSteel,2);m.box(-25,13,10,33,14,1.2,M.black);
    for(let x=-24;x<8;x+=3)m.beam([x,13,12],[x,27,12],.65,M.steel,6);
    for(let x=-21;x<7;x+=6)m.box(x+(frame%3),17,12.3,2,3,1,M.gold);
    hazard(m,-26,28,3,35,4);m.box(-8,8,12,16,3,11,p.paint);windows(m,-6,11,15,2,6);
    railing(m,-30,-25,39,23,32);insignia(m,-17,8.4,14,5,team,true);
    ladder(m,-5,-23,4,34,false);crates(m,13,23,3,3);lamp(m,-24,12,12,frame,M.greenLight);
  }else if(type==='barracks') {
    m.box(-19,-16,3,37,30,22,M.concrete,2);m.box(-20,-17,25,39,32,2,p.paint);
    // Angular roof, skylight, entrance tower, and drill-yard steps.
    m.face([[-20,-17,27],[0,-17,40],[0,15,40],[-20,15,27]],p.roof,[-.55,0,.83]);
    m.face([[0,-17,40],[19,-17,27],[19,15,27],[0,15,40]],p.paint,[.55,0,.83]);
    m.face([[-20,15,27],[0,15,40],[19,15,27]],M.edge,[0,1,0]);
    for(let y=-14;y<15;y+=5){m.beam([-20,y,27],[0,y,40],.35,M.silver,5);m.beam([0,y,40],[19,y,27],.35,M.rust,5);}
    windows(m,-16,14.5,12,5,6);windows(m,18,-13,13,4,6,'side');
    m.box(-5,14,3,13,7,28,M.darkConcrete,1);m.box(-5.5,13.5,31,14,8,2,p.paint);
    insignia(m,0,15.2,32,4.5,team,true);
    door(m,-2,21,3,7,16);m.box(-2,21.5,22,7,.5,4,p.paint);
    for(let i=0;i<4;i++)m.box(-7,22+i*1.5,1.5,17,1.5,3-i*.7,M.edge);
    flag(m,-20,18,4,p.paint,frame);m.beam([16,-12,27],[16,-12,58],.5,M.steel,5);lamp(m,16,-12,58,frame);
    crates(m,-19,-23,3,4);
  }else if(type==='factory') {
    m.box(-31,-27,3,62,45,30,M.darkConcrete,2);
    for(let k=0;k<3;k++){
      const x=-31+k*20;
      m.face([[x,-27,33],[x+13,-27,47],[x+13,18,47],[x,18,33]],p.roof,[-.73,0,.68]);
      m.face([[x+13,-27,47],[x+20,-27,33],[x+20,18,33],[x+13,18,47]],M.glass,[.88,0,.47]);
      m.face([[x,18,33],[x+13,18,47],[x+20,18,33]],p.paint,[0,1,0]);
      for(let y=-25;y<18;y+=5){m.beam([x,y,33],[x+13,y,47],.3,M.silver,4);m.beam([x+13,y,47],[x+20,y,33],.4,M.darkSteel,5);}
    }
    door(m,-23,18,3,31,25,frame);windows(m,13,18.5,18,2,6);wallPanels(m,31,-23,6,39,21,M.silver,false);
    m.box(-32,17,29,64,4,3,p.paint);
    m.box(12,19,5,16,1,9,p.paint);insignia(m,20,20.1,9.5,3.5,team,true);
    for(const x of [-28,10,28]){m.box(x,18.5,3,2,3,26,M.edge);lamp(m,x,21,31,frame);}
    m.box(19,-25,33,9,11,21,p.armor);vent(m,19,-25,54,9,11);
    m.cylinder(24,-19,54,2.5,16,M.darkSteel,10);m.ring(24,-19,65,3,3,p.paint);
    hazard(m,-24,24,3,35,7);crates(m,17,25,3,3);ladder(m,31,-10,4,28,false);
    // Parked production tooling gives the assembly door depth.
    m.box(-19,24,4,22,7,1.5,M.steel);m.box(-11,25,5.5,6,5,2.5,p.armor);
  }else if(type==='shipyard') {
    // Twin concrete piers, fenders and a real lattice gantry above an open slipway.
    for(const x of [-32,21]){
      m.box(x,-29,-3,11,62,8,M.darkConcrete,2);m.box(x-1,-30,5,13,64,1.3,M.concrete,2);
      for(let y=-25;y<=28;y+=9){m.cylinder(x+5,y,6.3,1.8,2,M.black,8);hazard(m,x,y,6.3,3,5);}
      for(let y=-22;y<=28;y+=12)m.box(x+(x<0?10:-2),y,0,3,5,4,M.rubber,1);
    }
    m.box(-23,-30,0,46,13,9,M.darkConcrete);m.box(-22,-29,9,19,12,20,p.armor,1);m.box(-23,-30,29,21,14,2,p.paint);windows(m,-20,-16.8,19,3,5.5);
    for(const x of [-28,27]){
      m.box(x-2,-12,6,4,6,53,p.paint);
      m.beam([x,-12,7],[x,11,58],1.2,M.steel,7);m.beam([x,-12,58],[x,11,58],1.2,M.steel,7);
    }
    m.box(-30,-13,59,60,7,4,p.paint);
    for(let x=-28;x<28;x+=7){m.beam([x,-13,62],[x+7,-13,72],.65,M.yellow,5);m.beam([x,-13,72],[x+7,-13,62],.65,M.yellow,5);}
    m.beam([-30,-13,72],[31,-13,72],1.1,M.steel,8);
    const trolley=-5+frame*3;m.box(trolley,-14,60,9,9,7,M.yellow);m.beam([trolley+4,-8,60],[trolley+4,-8,24],.4,M.black,5);m.box(trolley+1,-11,21,6,6,4,M.steel);
    railing(m,-22,-29,31,19,12);insignia(m,16,-5.8,61,3,team,true);
    vent(m,-20,-27,31,14,8);flag(m,-25,28,6,p.paint,frame);lamp(m,27,25,7,frame);crates(m,22,-27,7,1);
  }else if(type==='gun') {
    m.cylinder(0,0,3,21,4,M.darkConcrete,16);m.cylinder(0,0,7,18,6,M.concrete,16,15);
    for(let i=0;i<8;i++){const a=i/8*TAU;m.box(Math.cos(a)*18-1,Math.sin(a)*18-1,7,2,2,1,M.darkSteel);}
    const start=m.faces.length;turret(m,p,team,0,0,15,27,2);m.transform(start,turretAngle);
    for(const x of [-20,14])for(let y=10;y<22;y+=4)m.box(x,y,3,7,3,3,M.wood,1);
    crates(m,-20,-20,3,2);
  }
}

function turret(m,p,team,x=0,y=0,z=0,length=22,barrels=1) {
  m.cylinder(x,y,z,7,2.3,M.darkSteel,12);
  m.loft([
    [[x-8,y-6,z+2],[x+6,y-6,z+2],[x+10,y-3,z+2],[x+10,y+3,z+2],[x+6,y+6,z+2],[x-8,y+6,z+2]],
    [[x-6,y-4.5,z+9],[x+5,y-4.5,z+9],[x+7,y-2.5,z+8],[x+7,y+2.5,z+8],[x+5,y+4.5,z+9],[x-6,y+4.5,z+9]],
  ],p.armor);
  m.box(x-6,y-5,z+7,3,10,2,p.paint);
  m.cylinder(x-2,y,z+9,3,1.2,M.darkSteel,12);m.cylinder(x-2,y,z+10.2,2.5,.6,p.armor,12);
  m.box(x+1,y-2,z+10,2,3,1.2,M.glassDark);
  m.box(x+1.3,y-1.8,z+11.2,1.4,2.6,.35,M.glass);
  insignia(m,x+3,y+2,z+9.5,2.2,team);
  for(const by of [-6,5]){
    m.box(x-7,y+by,z+3,6,1,3,p.paint,.35);
    for(const bx of [-6,-2])m.cylinder(x+bx,y+by+.5,z+6,.45,.4,M.silver,6);
  }
  for(let i=0;i<barrels;i++){
    const by=y+(i-(barrels-1)/2)*3.2;
    m.beam([x+6,by,z+6],[x+12,by,z+6],2,M.darkSteel,10);
    m.beam([x+10,by,z+6],[x+length,by,z+6.4],1.1,M.steel,10);
    m.beam([x+length-3,by,z+6.4],[x+length,by,z+6.4],1.5,M.darkSteel,8);
    m.beam([x+length+.02,by,z+6.4],[x+length+.15,by,z+6.4],.75,M.black,8);
  }
  for(const by of [-5,5])for(let u=0;u<3;u++)m.beam([x-2+u*2,y+by,z+5],[x-1+u*2,y+by*1.25,z+7],.6,M.darkSteel,7);
  m.beam([x-5,y+3,z+10],[x-5,y+3,z+21],.22,M.black,5);
}

function tracks(m,length,width,frame) {
  for(const y of [-width,width-4]){
    const ring=[[-length+3,y], [length-3,y],[length,y+1],[length,y+3],[length-3,y+4],[-length+3,y+4],[-length,y+3],[-length,y+1]];
    m.prism(ring,0,5,M.track);
    for(let x=-length+4;x<length-1;x+=5)m.beam([x,y-.2,2.4],[x,y+4.2,2.4],2,M.steel,12);
    for(let x=-length+1;x<length;x+=2.4)m.box(x+(frame%3)*.55,y-.1,5.1,1.1,4.2,.6,M.darkSteel);
    m.box(-length+1,y-.4,6,length*2-2,4.8,.8,M.steel,1);
  }
}
function vehicle(m,type,p,team,frame,bodyAngle,turretAngle) {
  const start=m.faces.length;
  if(type==='tank') {
    const length=team===0?18:16,width=team===0?12:11;
    tracks(m,length,width,frame);
    m.loft([
      [[-length,-width+3,4],[length-1,-width+3,4],[length+1,-width+5,4],[length+1,width-5,4],[length-1,width-3,4],[-length,width-3,4]],
      [[-length+2,-width+4,11],[length-5,-width+4,11],[length-1,-width+6,8],[length-1,width-6,8],[length-5,width-4,11],[-length+2,width-4,11]],
    ],p.armor);
    for(const y of [-width-.4,width-2])m.box(-11,y,6.8,20,2.4,2.2,p.paint,1);
    for(const y of [-width-.5,width-2])for(let x=-10;x<10;x+=5){
      m.box(x,y,9,4.3,2.6,1.7,p.armor,.4);
      m.box(x+.5,y+.3,10.7,3.3,.5,.3,M.silver);
    }
    m.box(length-8,-6,10,2,12,.5,p.paint);
    for(const y of [-6,4])m.box(length-8,y,10.5,2,2,.2,M.edge);
    vent(m,-15,-5,11,9,10);m.box(-14,-6,11.2,1.2,12,.8,M.silver);
    for(const y of [-6,5]){m.box(length-3,y,8.4,1.2,2,1,M.light);m.box(-length-1,y,5,1.2,2,1,M.redLight);}
    for(const y of [-8,8])m.beam([-17,y,8],[-9,y,8],1.4,M.darkSteel,8);
    m.transform(start,bodyAngle);
    const ts=m.faces.length;turret(m,p,team,0,0,11,team===0?24:21,1);m.transform(ts,turretAngle);
    return;
  }
  const isMcv=type==='mcv',length=isMcv?24:21,width=isMcv?14:12;
  tracks(m,length,width,frame);m.box(-length,-width+3,6,length*2,width*2-6,5,p.armor,2);
  if(isMcv){
    m.box(-21,-10,11,28,20,16,M.darkSteel,2);m.box(-20,-9,12,26,18,16,p.armor,2);
    m.box(-21,-11,17,29,2,5,p.paint);m.box(-21,9,17,29,2,5,p.paint);
    for(let x=-18;x<6;x+=6){m.box(x,-10.5,12,.7,1,14,M.silver);m.box(x,9.5,12,.7,1,14,M.silver);}
    insignia(m,-8,11.1,19.5,3.5,team,true);
    vent(m,-18,-7,28,13,14);m.box(-1,-7,28,5,14,1.5,M.darkSteel);
    m.loft([[[9,-10,11],[24,-10,11],[24,10,11],[9,10,11]],[[10,-9,25],[20,-9,25],[20,9,25],[10,9,25]]],p.armor);
    m.box(20.1,-7,19,.5,14,5,M.glass);m.box(12,-10.2,19,7,.5,5,M.glassDark);m.box(12,9.7,19,7,.5,5,M.glass);
    m.box(24,-11,8,2,22,3,M.darkSteel);for(const y of [-9,7])m.box(24.3,y,12,1,2,2,M.light);
    // Folded hydraulic outriggers and gantry identify the deployable construction truck.
    for(const y of [-13,13]){m.beam([-20,y,9],[3,y,9],1.3,M.darkSteel,8);m.box(-21,y-2,6,4,4,2,M.yellow);}
    m.beam([-17,0,29],[3,0,33],1.4,M.yellow,8);m.beam([-17,0,29],[-17,0,41],.4,M.steel,5);lamp(m,14,0,26,frame);
  }else{
    // Open ore hopper, a heavy cab and a front cutter; not another tank silhouette.
    m.box(-19,-9,10,25,18,10,M.darkSteel,1);m.box(-18,-8,20,23,16,.6,M.black);
    for(const y of [-9,7])m.box(-19,y,16,25,2,7,p.paint,1);
    m.box(-19,-9,17,2,18,7,p.armor);
    for(let x=-16;x<5;x+=5)m.box(x,9.1,12,1,1,10,M.silver);
    insignia(m,-6,9.2,19.5,2.6,team,true);
    for(let i=0;i<23;i++){const x=-16+(i*7%19),y=-6+(i*5%12);m.cylinder(x,y,21,1.3+(i%3)*.4,1.5,M.gold,5,.4);}
    m.box(8,-9,10,12,18,13,p.armor,2);m.box(20,-7,17,.7,14,5,M.glass);m.box(10,9,16,7,.5,5,M.glass);
    m.beam([23,-12,5],[23,12,5],3,M.darkSteel,12);for(let y=-11;y<12;y+=3)m.beam([23,y,5],[26,y,7+frame%2],1,M.silver,6);
    m.beam([5,-6,12],[5,-6,29],1.1,M.black,8);m.ring(5,-6,26,1.5,1.4,M.steel);lamp(m,14,0,24,frame);
  }
  m.transform(start,bodyAngle);
}

function hull(m,length,width,z,mat) {
  const outline=[[-length,-width*.65],[-length+5,-width],[length-13,-width],[length-3,-width*.45],[length+3,0],[length-3,width*.45],[length-13,width],[-length+5,width],[-length,width*.65]];
  const lower=outline.map(([x,y])=>[x*.96,y*.74,z-4]);const upper=outline.map(([x,y])=>[x,y,z+3]);
  m.loft([lower,upper],mat);m.prism(outline,z+3,.8,M.steel,M.silver);
  return outline;
}
function boat(m,type,p,team,frame,bodyAngle,turretAngle) {
  const start=m.faces.length;
  if(type==='sub'){
    const levels=[[-42,1],[-36,5],[-27,7],[-10,7.5],[18,7.2],[32,5.7],[40,2],[42,.4]];
    const rings=levels.map(([x,r])=>Array.from({length:16},(_,i)=>[x,Math.cos(i/16*TAU)*r,Math.sin(i/16*TAU)*r*.65+1]));
    for(let j=0;j<rings.length-1;j++)for(let i=0;i<16;i++){const k=(i+1)%16;m.face([rings[j][i],rings[j][k],rings[j+1][k],rings[j+1][i]],M.darkSteel);}
    m.box(-8,-3,4,13,6,10,p.armor,2);m.box(-6,-3.2,10,5,6.4,2,p.paint);
    m.beam([-2,0,14],[-2,0,22],.5,M.steel,7);m.beam([-2,0,22],[1,0,22],.7,M.steel,7);
    m.beam([-6,1,14],[-6,1,19],.35,M.darkSteel,6);
    m.box(-36,-11,-.3,9,22,1.2,M.darkSteel,2);m.box(-38,-1,0,7,2,7,M.darkSteel);
    for(const x of [-25,17,27])m.beam([x,-6,2],[x,6,2],.25,M.silver,5);
    m.cylinder(18,0,5,2,.4,M.black,10);
  }else if(type==='transport'){
    hull(m,31,14,1,M.darkSteel);
    m.box(-22,-11,5,45,22,1,M.black);
    for(let x=-20;x<24;x+=3)m.box(x,-10,6,1,20,.5,M.steel);
    for(const y of [-15,12]){m.box(-25,y,5,49,3,5,p.armor,1);m.box(-19,y-.1,9,39,3.2,1.7,p.paint);}
    m.box(-30,-12,5,9,24,13,p.armor,1);m.box(-29,-11,18,7,22,1.5,M.steel);
    windows(m,-29,12.2,11,1);m.box(-20.5,-9,12,.4,18,4,M.glass);
    m.box(25,-12,5,6,24,1.4,M.darkSteel);hazard(m,26,-11,6.5,4,22);
    for(const y of [-10,10]){m.cylinder(-26,y,19.5,2,1,M.black,12);m.beam([-26,y,20],[-26,y,26],.35,M.steel,5);}
    m.box(-8,-7,7,12,14,.5,p.darkPaint);
    for(const y of [-7,7])m.box(-27,y,15,1.5,1.5,1,M.light);
  }else{
    const length=type==='cruiser'?48:38,width=type==='cruiser'?11:9;
    hull(m,length,width,0,M.darkSteel);
    m.box(-28,-width+1,4,49,width*2-2,2,p.armor,2);
    // Raised bridge, wraparound glazing, funnel cap, radar mast and lifeboats.
    m.box(-13,-6,6,18,12,8,p.armor,2);m.box(-11,-5,14,12,10,6,M.steel,1);
    m.box(-10,-5.3,17,10,.5,2.8,M.glass);m.box(-10,4.8,17,10,.5,2.8,M.glass);m.box(.9,-4.5,17,.4,9,2.8,M.glass);
    m.box(-12,-6,20,14,12,1,M.silver);insignia(m,-6,0,21.1,3.5,team);m.box(-10,-5.3,14,11,.6,2,p.paint);m.box(-10,4.8,14,11,.6,2,p.paint);
    m.beam([-5,0,21],[-5,0,39],.6,M.steel,7);m.beam([-11,0,32],[2,0,32],.4,M.silver,5);
    m.beam([-12,0,21],[-5,0,35],.3,M.darkSteel,5);m.beam([1,0,21],[-5,0,35],.3,M.darkSteel,5);
    const scan=frame*Math.PI/2;m.beam([-5-Math.cos(scan)*5,-Math.sin(scan)*5,36],[-5+Math.cos(scan)*5,Math.sin(scan)*5,36],.7,M.darkSteel,6);
    m.box(-24,-4,6,8,8,10,p.armor,1);m.box(-24.5,-4.5,16,9,9,2,M.black,1);m.box(-24,-4,13,8,8,2,p.paint);
    vent(m,-34,-5,4,8,10);
    for(const y of [-width+1,width-4]){m.box(-15,y,5,11,3,2,M.wood,1);m.box(-15,y,7,11,3,.5,M.edge);}
    for(let x=-length+4;x<length-10;x+=5)for(const y of [-width+.2,width-.2]){m.beam([x,y,4],[x,y,6],.22,M.silver,4);}
    for(const y of [-width+.2,width-.2])m.beam([-length+4,y,6],[length-12,y,6],.22,M.silver,4);
    m.box(length-15,-2,4,5,4,1,M.darkSteel);m.cylinder(length-6,0,4.1,1.4,.7,M.black,8);
    m.transform(start,bodyAngle);
    for(const x of type==='cruiser'?[23,-36]:[17]){
      const ts=m.faces.length;turret(m,p,team,0,0,6,type==='cruiser'?18:14,type==='cruiser'?2:1);
      m.transform(ts,turretAngle,[x*Math.cos(bodyAngle),x*Math.sin(bodyAngle),0]);
    }
    return;
  }
  m.transform(start,bodyAngle);
}

function infantry(m,p,team,frame,angle) {
  const start=m.faces.length,step=[-1,0,1,0][frame%4]*2;
  for(const [y,s]of[[-2,-1],[2,1]]){
    m.beam([0,y,12],[step*s,y,6],1.35,p.cloth,7);m.beam([step*s,y,6],[-step*s,y,1.5],1.15,p.cloth,7);
    m.box(-step*s-1,y-1.3,0,4,2.6,2,M.rubber,1);
  }
  m.box(-2.5,-3,12,5,6,9,p.cloth,1);m.box(-3,-3.2,14,2,6.4,4,p.paint);m.box(-3.2,-3.3,12,6,6.6,1.2,M.darkSteel);
  m.box(-4,-2.5,15,2,5,5,M.wood,1);
  m.box(2,-2.6,14,1,5.2,6,p.armor,.4);
  for(const y of [-2.6,.7])m.box(3,y,14,1.2,1.9,2.5,M.wood,.3);
  for(const y of [-3.7,2.7])m.box(-1,y,18,3,1,2.4,p.bright,.3);
  m.box(-4.6,-2,16,.7,4,1,M.darkSteel);
  m.cylinder(0,0,21,2.3,3,M.skin,10);m.cylinder(-.2,0,24,3,2.4,p.armor,12,2.2);m.cylinder(.4,0,24,3.3,.7,p.armor,12);
  m.beam([0,-3,19],[4,-4,15],1.15,p.cloth,7);m.beam([4,-4,15],[7,-2,16],.8,M.skin,7);
  m.beam([0,3,19],[3,4,15],1.15,p.cloth,7);m.beam([3,4,15],[6,1,16],.8,M.skin,7);
  m.beam([2,0,16],[13,0,17],.7,M.black,7);m.box(3,-.8,15,4,1.6,2,M.wood);m.box(6,-.5,12,1.3,1,3,M.darkSteel);
  m.transform(start,angle);
}

export function createModel(type,team=0,frame=0,bodyDir=0,turretDir=bodyDir,directions=16) {
  const m=new Model(),p=FACTIONS[team],bodyAngle=bodyDir/directions*TAU,turretAngle=turretDir/directions*TAU;
  if(['yard','power','refinery','barracks','factory','shipyard','gun'].includes(type))building(m,type,p,team,frame,turretAngle);
  else if(['cruiser','destroyer','transport','sub'].includes(type))boat(m,type,p,team,frame,bodyAngle,turretAngle);
  else if(type==='infantry')infantry(m,p,team,frame,bodyAngle);
  else vehicle(m,type,p,team,frame,bodyAngle,turretAngle);
  return m;
}
