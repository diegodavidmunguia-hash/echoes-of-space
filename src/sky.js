const hash = (x,y) => {
  const n = Math.imul(x+31,374761393) + Math.imul(y+734,668265263);
  return ((Math.imul(n^(n>>>13),1274126177)^(n>>>16))>>>0)/4294967295;
};
const mix = (a,b,t) => a+(b-a)*t;
const clamp = (x,a=0,b=1) => Math.min(b,Math.max(a,x));
function noise(x,y) {
  const ix=Math.floor(x), iy=Math.floor(y);
  const ux=x-ix, uy=y-iy, sx=ux*ux*(3-2*ux), sy=uy*uy*(3-2*uy);
  return mix(mix(hash(ix,iy),hash(ix+1,iy),sx),mix(hash(ix,iy+1),hash(ix+1,iy+1),sx),sy);
}
function clouds(x,y) {
  return noise(x,y)*.59+noise(x*2.3+11,y*2.3+4)*.25+noise(x*6+6,y*6-7)*.11+noise(x*15,y*15)*.05;
}
const palettes={
  mercury:[[64,60,62],[177,156,145]], venus:[[109,74,42],[243,192,113]], earth:[[15,54,112],[82,161,218]],
  mars:[[92,43,36],[231,138,78]], jupiter:[[130,74,57],[245,200,152]], saturn:[[128,93,63],[240,210,150]],
  uranus:[[54,127,146],[158,218,215]], neptune:[[39,62,145],[114,156,238]], moon:[[58,61,67],[182,180,173]]
};
const planetTiles=new Map();

export function paintPlanet(canvas,id) {
  if(!palettes[id]) return;
  if(!planetTiles.has(id)) {
    const tile=document.createElement('canvas');
    tile.width=tile.height=192;
    const ctx=tile.getContext('2d'), frame=ctx.createImageData(192,192);
    const [low,high]=palettes[id];
    for(let i=0;i<192;i++) for(let j=0;j<192;j++) {
      const x=(j+.5)/96-1,y=(i+.5)/96-1,r=x*x+y*y;
      if(r>=1) continue;
      const z=Math.sqrt(1-r), lon=Math.atan2(x,z), lat=Math.asin(y);
      const topo=clouds(lon*5+4,lat*5+2);
      const gas=['jupiter','saturn','venus','uranus','neptune'].includes(id);
      const ripples=Math.sin(lat*(id==='saturn'?35:21)+clouds(lon*3,lat*7)*3);
      const banding=gas?(ripples*.19+Math.sin(lat*58+topo*5)*.075):0;
      const w=clamp(.23+topo*.56+banding);
      const light=clamp((-.59*x-.44*y+.77*z)*.89+.13,.11,1.12);
      let rgb=low.map((a,k)=>mix(a,high[k],w));
      if(id==='earth') {
        const land=clouds(lon*4.4-3,lat*4.6+8);
        if(land>.51) rgb=[mix(53,124,topo),mix(107,149,topo),mix(70,89,topo)];
        const cloud=clouds(lon*10+topo*3,lat*10+lon+27);
        const cover=clamp((cloud-.52)*2.6+Math.max(0,Math.abs(y)-.82)*5);
        rgb=rgb.map((a,k)=>mix(a,[227,239,250][k],cover));
      }
      if(id==='jupiter') {
        const oval=((x-.25)/.26)**2+((y-.28)/.115)**2;
        if(oval<1) rgb=rgb.map((a,k)=>mix(a,[192,102,80][k],(1-oval)*.62));
      }
      const edge=(1-z)**3;
      const o=(i*192+j)*4;
      rgb.forEach((a,k)=>{frame.data[o+k]=a*light+edge*[12,25,39][k];});
      frame.data[o+3]=Math.min(255,(1-r)*18500);
    }
    ctx.putImageData(frame,0,0);
    planetTiles.set(id,tile);
  }
  canvas.width=canvas.height=192;
  canvas.getContext('2d').drawImage(planetTiles.get(id),0,0);
}

export function paintStars(canvas) {
  const {width,height}=canvas.getBoundingClientRect();
  if(!width||!height) return;
  canvas.width=Math.round(width);
  canvas.height=Math.round(height);
  const ctx=canvas.getContext('2d');
  const mist=document.createElement('canvas');
  mist.width=340;mist.height=165;
  const mc=mist.getContext('2d'), image=mc.createImageData(mist.width,mist.height);
  for(let y=0;y<mist.height;y++) for(let x=0;x<mist.width;x++){
    const u=x/mist.width,v=y/mist.height;
    const diagonal=v-(.89-.71*u);
    const fog=clouds(u*13,v*12);
    const glow=Math.exp(-(((diagonal+(fog-.5)*.20)/.16)**2));
    const ink=clamp((fog-.28)*1.9)*glow;
    const i=(y*mist.width+x)*4;
    image.data[i]=mix(31,96,fog);
    image.data[i+1]=mix(52,75,clamp(1-u*.85));
    image.data[i+2]=mix(102,142,fog);
    image.data[i+3]=ink*135;
  }
  mc.putImageData(image,0,0);
  ctx.drawImage(mist,0,0,width,height);
  for(let i=0;i<950;i++) {
    const x=hash(i,779)*width,y=hash(i,17)*height,chance=hash(i,86);
    const radius=chance>.966?1.75:chance>.85?1.03:.55;
    ctx.fillStyle=i%7===0?'#a6b8ff':'#dcecff';
    ctx.globalAlpha=.13+chance*.64;
    if(chance>.975){ctx.shadowBlur=10;ctx.shadowColor='#a9d6ff'}else ctx.shadowBlur=0;
    ctx.beginPath();
    ctx.arc(x,y,radius,0,Math.PI*2);
    ctx.fill();
    if(chance>.99){
      ctx.globalAlpha=.36;ctx.fillRect(x-3,y-.3,6,.6);ctx.fillRect(x-.3,y-3,.6,6);
    }
  }
  ctx.globalAlpha=1;
}
