// (19/11) tira do mapa ilustrado as 9 voltas de vinil e as 3 torres pro jogo (app/linha/estrada/vinil.json).
// Uso: salve a linha 'const D=...' do mapa (public/mapa-ilustrado/index.html) em scripts/D.js e rode:
//   node scripts/vinil-extrai.js app/linha/estrada/vinil.json
// tira do mapa ilustrado (cartografia-neon.html) as 9 faixas de vinil e as 3 torres, em metros do mundo
const fs=require("fs");eval(fs.readFileSync(__dirname+"/D.js","utf8").replace("const D=","globalThis.D="));
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const U=100,CR=D.cr,ES=1.22,CX=CR.cx,CZ=CR.cz,RI=2450;
const TOR=D.T.filter((t,i)=>i===0||!(t.x===D.T[0].x&&t.z===D.T[0].z));
const abre=(x,z,max)=>{let dx=(x-CX)*ES,dz=(z-CZ)*ES;const d=Math.hypot(dx,dz);if(d>max){dx*=max/d;dz*=max/d}return{x:CX+dx,z:CZ+dz}};
const tun=abre(D.lug.tuneis.x,D.lug.tuneis.z,RI-170);
const coneR=f=>RI*Math.pow(1-f,1.3);
const DESC=D.sal.find(s=>s.n==="A DESCIDA");
const rmaxT=Math.max(...D.rios.flatMap(r=>{const o=[];for(let k=0;k<r.p.length;k+=2)o.push(Math.hypot(r.p[k],r.p[k+1]));return o}),...D.sal.map(s=>Math.hypot(s.x,s.z)));
const FASE=Math.atan2(tun.z-CZ,tun.x-CX)-Math.atan2(DESC.z,DESC.x);
const TUBO=.32;
const naCasca=(x,z)=>{const a=Math.atan2(z,x)+FASE,f=.05+(1-Math.hypot(x,z)/rmaxT)*.78,r=coneR(f)*1.03/U+TUBO*.9;return{x:CX/U+Math.cos(a)*r,z:CZ/U+Math.sin(a)*r}};
const outras=TOR.slice(1);
const SALT=outras.map((t,i)=>{const s=D.sal.find(q=>q.n.startsWith("TORRE "+(i+1)));return naCasca(s.x,s.z)});
const ang=i=>Math.atan2(SALT[i].z-CZ/U,SALT[i].x-CX/U);
const Rk=k=>RI*(.93-k*.072);
const MET=D.L.map(l=>{const p=(D.V.filter(v=>v.c===l.c&&!v.a)[2]).p,n=p.length/3;let len=0,turn=0,pa=null,h0=1e9,h1=-1e9;for(let k=1;k<n;k++){const dx=p[k*3]-p[k*3-3],dz=p[k*3+1]-p[k*3-2];len+=Math.hypot(dx,dz);const a=Math.atan2(dz,dx);if(pa!==null){let d=a-pa;d=Math.atan2(Math.sin(d),Math.cos(d));turn+=Math.abs(d)}pa=a;h0=Math.min(h0,p[k*3+2]);h1=Math.max(h1,p[k*3+2])}return{sin:len/Math.hypot(p[p.length-3]-p[0],p[p.length-2]-p[1]),vira:turn/len*1000,alt:h1-h0}});
const nrm=key=>{const v=MET.map(m=>m[key]),a=Math.min(...v),b=Math.max(...v);return MET.map(m=>(m[key]-a)/((b-a)||1))};
const nS=nrm("sin"),nV=nrm("vira"),nA=nrm("alt");
const JEITO=MET.map((m,i)=>{const rad=clamp(.45*nS[i]+.3*nV[i]+.25*nA[i],0,1),vel=1-nS[i];return{rad,vel,tipo:vel>.7?"velocidade":nV[i]>.6||rad>.6?"manobra":"curtir o som"}});
const faixas=[];
D.L.forEach((l,k)=>{const sg=D.V.filter(v=>v.c===l.c&&!v.a);const ida=sg[2]||sg[0],volta=sg[3]||sg[1]||sg[0];
  const hs=[],ls=[];[ida,volta].forEach((v,iv)=>{const p=v.p,ax=p[0],az=p[1],dx=p[p.length-3]-ax,dz=p[p.length-2]-az,L=Math.hypot(dx,dz)||1;for(let i=0;i<p.length;i+=3){hs.push(p[i+2]);ls.push(((p[i]-ax)*dz-(p[i+1]-az)*dx)/L*(iv?-1:1))}});
  const suave=(arr,fr)=>{const n=arr.length,w=Math.max(2,Math.round(n*fr)),o=arr.slice();for(let i=0;i<n;i++){let a=0;for(let j=-w;j<=w;j++)a+=o[((i+j)%n+n)%n];arr[i]=a/(2*w+1)}};const J=JEITO[k];suave(hs,.004+.02*(1-J.rad));suave(ls,.006+.03*(1-J.rad));const hm=hs.reduce((a,b)=>a+b,0)/hs.length;for(let i=0;i<hs.length;i++)hs[i]=hm+(hs[i]-hm)*(1+1.3*J.rad);
  const GRUPOS=[["Nectar","Sexta-Feira","Ojalá"],["Rollercoaster","Swav","DopaminA"],["Copo Americano","CHUVA","Sabe Ontem?"]];const ti=GRUPOS.findIndex(g=>g.includes(l.n)); // (19/11) o grupo do jogo (mundoDisco.ts GRUPOS)
  const th=ang(ti),R=Rk(k),N=360;
  const lerpA=arr=>u=>{const f=u*(arr.length-1),i=Math.floor(f),w=f-i;return arr[i]*(1-w)+arr[Math.min(arr.length-1,i+1)]*w};const hAt=lerpA(hs),lAt=lerpA(ls);
  const rg=rng(k*131+7),fq=[2+Math.floor(rg()*3),5+Math.floor(rg()*4),9+Math.floor(rg()*5)],fs=fq.map(()=>rg()*6.28),am=[90,60,35].map(v=>v*(.4+1.6*J.rad));
  const forma=(u,a)=>R*(1+.16*J.vel*Math.cos(2*(a-th)))+lAt(u)*(.1+.3*J.rad)+fq.reduce((s,f,j)=>s+am[j]*Math.sin(f*u*6.283+fs[j]),0),ecc=180+300*J.rad;
  const pts=[],alt=[];
  // (no jogo) a volta começa e acaba na torre: u=0 e u=1 ficam no rumo dela (no mapa, u=.5)
  for(let i=0;i<=N;i++){const u0=i/N,u=(u0+.5)%1,a=th+(u-.5)*Math.PI*2+(u0>=.5?0:0),rr=forma(u,a);pts.push([+(CX+Math.cos(a)*rr+Math.cos(th)*ecc).toFixed(1),+(CZ+Math.sin(a)*rr+Math.sin(th)*ecc).toFixed(1)]);alt.push(+hAt(u).toFixed(1))}
  faixas.push({nome:l.n,cor:l.c,ordem:k+1,torre:ti+1,tipo:J.tipo,rad:+J.rad.toFixed(3),vel:+J.vel.toFixed(3),pts,alt});
});
const torres=SALT.map((p,i)=>({n:i+1,x:+(p.x*U).toFixed(1),z:+(p.z*U).toFixed(1)}));
fs.writeFileSync(process.argv[2],JSON.stringify({fonte:"mapa ilustrado (cartografia-neon.html), 18/11",centro:{x:CX,z:CZ},torres,faixas}));
console.log(torres, faixas.map(f=>f.nome+" t"+f.torre+" "+f.tipo+" rad"+f.rad+" p0 "+f.pts[0]+" alt "+Math.min(...f.alt).toFixed(0)+".."+Math.max(...f.alt).toFixed(0)).join("\n"));
