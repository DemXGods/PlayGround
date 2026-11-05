(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const frame = document.querySelector('.game-frame');
  const startScreen = document.getElementById('startScreen');
  const winScreen = document.getElementById('winScreen');
  const keys = new Set();
  const W = 1800, H = 1350;
  const player = {x:425,y:730,face:'down',hp:3,walk:0,attack:0,invuln:0};
  const shrine = {x:1390,y:330};
  const shards = [
    {x:290,y:360,got:false,phase:0},
    {x:1060,y:580,got:false,phase:1.9},
    {x:1415,y:1035,got:false,phase:3.6}
  ];
  const enemies = [
    {x:730,y:492,hp:2,t:0,dir:1,hit:0},
    {x:1120,y:900,hp:2,t:2,dir:-1,hit:0},
    {x:520,y:1060,hp:2,t:4,dir:1,hit:0}
  ];
  const trees=[]; let seed=81231;
  const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  for(let i=0;i<130;i++){
    const x=35+rand()*(W-70), y=35+rand()*(H-70);
    if(Math.hypot(x-425,y-730)<175||Math.hypot(x-shrine.x,y-shrine.y)<145||Math.hypot(x-290,y-360)<70||Math.hypot(x-1060,y-580)<75||Math.hypot(x-1415,y-1035)<75)continue;
    trees.push({x,y,r:22+rand()*22,hue:Math.floor(rand()*3),scale:.72+rand()*.65});
  }
  const flowers=[];
  for(let i=0;i<260;i++){const x=rand()*W,y=rand()*H;if(Math.abs(y-(740+(x-425)*.23))<85||Math.abs(y-(550+(x-1000)*.62))<55)continue;flowers.push({x,y,c:rand()})}
  let vw=960,vh=600,dpr=1,playing=false,won=false,toastTimer=0,elapsed=0,muted=true,audio;
  let camera={x:0,y:0};
  function resize(){const r=canvas.getBoundingClientRect();dpr=Math.min(devicePixelRatio||1,2);vw=r.width;vh=r.height;canvas.width=Math.round(vw*dpr);canvas.height=Math.round(vh*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
  new ResizeObserver(resize).observe(canvas); resize();
  function sound(freq=420,dur=.1,type='sine'){if(muted)return;try{audio??=new AudioContext();const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.055,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+dur);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+dur)}catch(e){}}
  function notify(text){const el=document.getElementById('toast');el.textContent=text;el.classList.add('show');toastTimer=2.3}
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function updateHud(){const n=shards.filter(s=>s.got).length;document.getElementById('shardCount').textContent=`${n} / 3`;document.getElementById('progressFill').style.width=`${n/3*100}%`;document.getElementById('questProgress').textContent=n===3?'Return to the old shrine':'Find the three lost embers';document.getElementById('questTitle').textContent=n===3?'The shrine is waiting':'Wake the old shrine';document.getElementById('hearts').textContent=Array.from({length:3},(_,i)=>i<player.hp?'♥':'♡').join(' ');document.getElementById('hearts').setAttribute('aria-label',`${player.hp} hearts`)}
  function start(){playing=true;startScreen.classList.add('hidden');if(!muted){audio?.resume?.()}notify('The woods are listening.');sound(392,.18)}
  document.getElementById('startButton').addEventListener('click',start);
  document.getElementById('playAgain').addEventListener('click',()=>location.reload());
  document.getElementById('soundToggle').addEventListener('click',()=>{muted=!muted;document.getElementById('soundIcon').textContent=muted?'♫':'♪';document.getElementById('soundToggle').classList.toggle('active',!muted);if(!muted)sound(520,.12)});
  function attack(){if(!playing||won||player.attack>0)return;player.attack=.31;sound(220,.08,'triangle');for(const e of enemies){if(e.hp<=0)continue;const dx=e.x-player.x,dy=e.y-player.y,dist=Math.hypot(dx,dy);let forward=player.face==='right'?dx:player.face==='left'?-dx:player.face==='down'?dy:-dy;let cross=player.face==='left'||player.face==='right'?Math.abs(dy):Math.abs(dx);if(dist<89&&forward>0&&cross<63){e.hp--;e.hit=.28;e.x+=dx/(dist||1)*28;sound(170,.1,'square');if(e.hp<=0)notify('A little peace returns.')}}}
  function interact(){if(!playing||won)return;const n=shards.filter(s=>s.got).length;if(Math.hypot(player.x-shrine.x,player.y-shrine.y)<135){if(n<3){notify(`The shrine stirs… ${3-n} ember${3-n===1?'':'s'} still missing.`);sound(270,.22)}else{won=true;winScreen.classList.remove('hidden');sound(660,.25);setTimeout(()=>sound(880,.3),180)}return}if(Math.hypot(player.x-425,player.y-730)<120)notify('“Follow the warm lights. The wood will show you the way.”');else notify('Only leaves answer.');}
  window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();keys.add(k);if(k===' '||k==='j')attack();if(k==='e'||k==='enter')interact();if(k==='escape'&&playing)notify('Take your time. The valley is safe.');});
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>keys.clear());
  document.querySelectorAll('.dpad button').forEach(b=>{const dir=b.dataset.dir;const down=e=>{e.preventDefault();keys.add(dir)};const up=e=>{e.preventDefault();keys.delete(dir)};b.addEventListener('pointerdown',down);['pointerup','pointercancel','pointerleave'].forEach(ev=>b.addEventListener(ev,up))});
  const bindPress=(id,fn)=>{const b=document.getElementById(id);b.addEventListener('pointerdown',e=>{e.preventDefault();fn()})};bindPress('touchAttack',attack);bindPress('touchInteract',interact);
  const DIRS={up:[0,-1,'up'],down:[0,1,'down'],left:[-1,0,'left'],right:[1,0,'right']};
  function update(dt){elapsed+=dt;if(toastTimer>0&&(toastTimer-=dt)<=0)document.getElementById('toast').classList.remove('show');if(!playing||won)return;
    if(player.attack>0)player.attack=Math.max(0,player.attack-dt);if(player.invuln>0)player.invuln-=dt;
    let dx=0,dy=0;if(keys.has('w')||keys.has('arrowup')||keys.has('up'))dy--;if(keys.has('s')||keys.has('arrowdown')||keys.has('down'))dy++;if(keys.has('a')||keys.has('arrowleft')||keys.has('left'))dx--;if(keys.has('d')||keys.has('arrowright')||keys.has('right'))dx++;
    if(dx||dy){const m=Math.hypot(dx,dy);dx/=m;dy/=m;player.x+=dx*177*dt;player.y+=dy*177*dt;player.face=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');player.walk+=dt*12}
    player.x=clamp(player.x,32,W-32);player.y=clamp(player.y,35,H-35);
    // Trees have solid trunks, while their canopies remain decorative and walk-under-able.
    for(const t of trees){const dx=player.x-t.x,dy=player.y-(t.y+5),min=17;if(dx*dx+dy*dy<min*min){const d=Math.hypot(dx,dy)||1;player.x=t.x+dx/d*min;player.y=t.y+5+dy/d*min}}
    for(const s of shards){if(!s.got&&Math.hypot(player.x-s.x,player.y-s.y)<38){s.got=true;updateHud();sound(720,.28);notify('Ember found — a fragment of dawn.')}}
    for(const e of enemies){if(e.hp<=0)continue;e.t+=dt;e.hit=Math.max(0,e.hit-dt);const d=Math.hypot(player.x-e.x,player.y-e.y);if(d<210&&d>46){e.x+=(player.x-e.x)/d*48*dt;e.y+=(player.y-e.y)/d*48*dt}else if(d>=210){e.x+=Math.sin(e.t*1.1)*12*dt;e.y+=Math.cos(e.t*.8)*9*dt}if(d<38&&player.invuln<=0){player.hp--;player.invuln=1.2;frame.classList.remove('shake');void frame.offsetWidth;frame.classList.add('shake');setTimeout(()=>frame.classList.remove('shake'),240);sound(110,.2,'sawtooth');updateHud();if(player.hp<=0){player.hp=3;player.x=425;player.y=730;updateHud();notify('The glade gently brings you home.')}}}
    camera.x=clamp(player.x-vw/2,0,W-vw);camera.y=clamp(player.y-vh/2,0,H-vh);
  }
  function poly(points,fill,stroke=null){ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}}
  function path(points,color,width){ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke()}
  function drawGround(){ctx.fillStyle='#477350';ctx.fillRect(0,0,W,H);
    // broad tonal clearings
    const grad=ctx.createRadialGradient(690,620,100,690,620,1000);grad.addColorStop(0,'#698456');grad.addColorStop(.58,'#50784e');grad.addColorStop(1,'#294c43');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
    // mossy pools of light
    for(let i=0;i<26;i++){const x=(i*347+93)%W,y=(i*229+110)%H;ctx.fillStyle=i%2?'#9a9b5b13':'#d7c47410';ctx.beginPath();ctx.ellipse(x,y,70+i%4*22,28+i%3*13,-.45,0,Math.PI*2);ctx.fill()}
    // worn winding trail with edges
    const p=[[380,1350],[430,1210],[395,1090],[470,965],[440,850],[520,730],[600,640],[730,610],[850,660],[960,620],[1000,525],[1060,445],[1200,420],[1310,350],[1390,330]];
    path(p,'#435f4a',166);path(p,'#a99a69',151);path(p,'#b5a775',138);
    // trail texture dapple
    for(let i=0;i<65;i++){const x=365+(i*113)%900,y=1350-i*15;ctx.fillStyle=i%2?'#64785333':'#d5c28a24';ctx.beginPath();ctx.ellipse(x,y,9+(i%5),3,-.4,0,Math.PI*2);ctx.fill()}
    // tiny grass details
    for(let i=0;i<flowers.length;i++){const f=flowers[i];if(f.x<camera.x-10||f.x>camera.x+vw+10||f.y<camera.y-10||f.y>camera.y+vh+10)continue;const x=f.x,y=f.y;ctx.strokeStyle='#c9d28a55';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y+3);ctx.lineTo(x-1,y-2);ctx.moveTo(x,y+2);ctx.lineTo(x+2,y-2);ctx.stroke();if(f.c>.72){ctx.fillStyle=f.c>.87?'#f2df9d':'#e6c1a0';ctx.beginPath();ctx.arc(x,y-2,1.7,0,Math.PI*2);ctx.fill()}}
    // boundaries
    ctx.strokeStyle='#182f2c';ctx.lineWidth=38;ctx.strokeRect(-18,-18,W+36,H+36);ctx.strokeStyle='#66815a';ctx.lineWidth=4;ctx.strokeRect(10,10,W-20,H-20);
  }
  function drawTree(t){const {x,y}=t,r=t.r*t.scale;if(x<camera.x-70||x>camera.x+vw+70||y<camera.y-90||y>camera.y+vh+30)return;
    ctx.fillStyle='#152a2568';ctx.beginPath();ctx.ellipse(x+5,y+10,r*.78,r*.3,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#594d36';ctx.fillRect(x-5,y-r*.26,10,r*.48);ctx.fillStyle='#776444';ctx.fillRect(x-4,y-r*.24,3,r*.38);
    const colors=[['#345641','#557a4a','#729052'],['#3c5a45','#647d4e','#829257'],['#2d5042','#4f7350','#688554']][t.hue];
    // Asymmetric, scalloped foliage reads like a little canopy rather than a stack of balls.
    ctx.fillStyle=colors[0];ctx.beginPath();ctx.moveTo(x-r*.9,y-r*.34);ctx.quadraticCurveTo(x-r*1.12,y-r*.83,x-r*.62,y-r*1.03);ctx.quadraticCurveTo(x-r*.4,y-r*1.35,x-r*.08,y-r*1.08);ctx.quadraticCurveTo(x+r*.27,y-r*1.3,x+r*.46,y-r*.98);ctx.quadraticCurveTo(x+r*1.08,y-r*.93,x+r*.85,y-r*.35);ctx.quadraticCurveTo(x+r*.67,y-r*.02,x+r*.16,y-r*.09);ctx.quadraticCurveTo(x-r*.45,y+r*.02,x-r*.9,y-r*.34);ctx.closePath();ctx.fill();
    ctx.fillStyle=colors[1];ctx.beginPath();ctx.ellipse(x-r*.22,y-r*.69,r*.53,r*.35,-.4,0,Math.PI*2);ctx.fill();ctx.fillStyle=colors[2];ctx.beginPath();ctx.ellipse(x-r*.16,y-r*.91,r*.31,r*.21,-.5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#bdc78320';ctx.beginPath();ctx.ellipse(x-r*.2,y-r*1.04,r*.23,r*.075,-.5,0,Math.PI*2);ctx.fill();
  }
  function drawShrine(){const x=shrine.x,y=shrine.y;const lit=shards.every(s=>s.got);ctx.save();ctx.translate(x,y);
    ctx.fillStyle='#192e2a77';ctx.beginPath();ctx.ellipse(0,27,105,47,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#76765c';ctx.beginPath();ctx.ellipse(0,16,96,39,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#92906d';ctx.beginPath();ctx.ellipse(0,10,89,34,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#a5a17b';ctx.beginPath();ctx.ellipse(0,8,66,23,0,0,Math.PI*2);ctx.fill();
    poly([[-61,2],[-50,-64],[-36,-82],[-21,-60],[-17,0]],'#716e58','#a29b70');poly([[18,0],[22,-60],[38,-83],[53,-63],[64,2]],'#716e58','#a29b70');
    poly([[-70,-64],[-37,-99],[0,-110],[37,-99],[70,-64],[54,-56],[0,-83],[-53,-54]],'#716d55','#aaa27a');
    poly([[-52,-65],[-39,-92],[-33,-69]],'#b2a57a');poly([[31,-70],[43,-92],[52,-65]],'#a59d75');
    ctx.fillStyle='#182c28';ctx.beginPath();ctx.ellipse(0,-19,24,30,0,Math.PI,0);ctx.lineTo(24,7);ctx.lineTo(-24,7);ctx.fill();
    ctx.strokeStyle=lit?'#ffdc81':'#817d5a';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-22,14,0,Math.PI*2);ctx.stroke();ctx.fillStyle=lit?'#f3d16f':'#9a9364';ctx.beginPath();ctx.arc(0,-22,5,0,Math.PI*2);ctx.fill();
    if(lit){const glow=ctx.createRadialGradient(0,-22,3,0,-22,42);glow.addColorStop(0,`rgba(255,225,138,${.2+Math.sin(elapsed*3)*.035})`);glow.addColorStop(1,'rgba(255,225,138,0)');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,-22,42,0,Math.PI*2);ctx.fill()}
    ctx.restore();
  }
  function drawShard(s){if(s.got)return;const bob=Math.sin(elapsed*2.7+s.phase)*6,x=s.x,y=s.y+bob;ctx.save();ctx.translate(x,y);ctx.shadowColor='#f6d582';ctx.shadowBlur=22;ctx.fillStyle='#f6d77c';ctx.beginPath();ctx.moveTo(0,-15);ctx.lineTo(9,-2);ctx.lineTo(5,12);ctx.lineTo(-5,12);ctx.lineTo(-9,-2);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#fff0bd';ctx.beginPath();ctx.moveTo(0,-11);ctx.lineTo(2,-1);ctx.lineTo(-2,4);ctx.closePath();ctx.fill();ctx.globalAlpha=.35;ctx.strokeStyle='#ffe9a7';ctx.beginPath();ctx.ellipse(0,15,15,4,0,0,Math.PI*2);ctx.stroke();ctx.restore()}
  function drawEnemy(e){if(e.hp<=0)return;const bob=Math.sin(elapsed*5+e.t)*3;ctx.save();ctx.translate(e.x,e.y+bob);ctx.fillStyle='#20302e77';ctx.beginPath();ctx.ellipse(0,10,22,10,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=e.hit?'#e79b75':'#80a889';ctx.beginPath();ctx.moveTo(-20,4);ctx.quadraticCurveTo(-25,-14,-13,-19);ctx.quadraticCurveTo(0,-29,14,-18);ctx.quadraticCurveTo(26,-8,19,4);ctx.quadraticCurveTo(0,13,-20,4);ctx.fill();ctx.fillStyle='#d3e2b4';ctx.beginPath();ctx.arc(-7,-8,2.4,0,Math.PI*2);ctx.arc(7,-8,2.4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#263a33';ctx.beginPath();ctx.arc(-7,-8,1,0,Math.PI*2);ctx.arc(7,-8,1,0,Math.PI*2);ctx.fill();ctx.restore()}
  function drawPlayer(){ctx.save();ctx.translate(player.x,player.y);const moving=keys.size>0,step=moving?Math.sin(player.walk)*3:0;ctx.fillStyle='#162c29aa';ctx.beginPath();ctx.ellipse(0,10,14,7,0,0,Math.PI*2);ctx.fill();if(player.invuln>0&&Math.floor(elapsed*14)%2===0)ctx.globalAlpha=.5;
    ctx.fillStyle='#695840';ctx.fillRect(-8,0+step,6,9);ctx.fillRect(2,0-step,6,9);ctx.fillStyle='#d6b879';ctx.fillRect(-8,6+step,7,4);ctx.fillRect(2,6-step,7,4);
    ctx.fillStyle='#557d60';ctx.beginPath();ctx.moveTo(-11,-9);ctx.lineTo(10,-9);ctx.lineTo(12,2);ctx.lineTo(0,7);ctx.lineTo(-12,2);ctx.closePath();ctx.fill();ctx.fillStyle='#74926a';ctx.fillRect(-7,-8,5,10);ctx.fillStyle='#c9a56d';ctx.fillRect(-3,-8,3,7);
    ctx.fillStyle='#edc89b';ctx.beginPath();ctx.arc(0,-15,8,0,Math.PI*2);ctx.fill();ctx.fillStyle='#a66f4d';ctx.fillRect(-7,-22,13,4);ctx.fillStyle='#dbb775';ctx.beginPath();ctx.moveTo(-8,-20);ctx.lineTo(-2,-30);ctx.lineTo(8,-21);ctx.closePath();ctx.fill();ctx.fillStyle='#576e55';ctx.fillRect(-5,-19,8,3);
    if(player.attack>0){const f=player.face;ctx.save();ctx.rotate(f==='right'?0:f==='down'?Math.PI/2:f==='left'?Math.PI:-Math.PI/2);ctx.strokeStyle='#f5e5bb';ctx.lineWidth=3;ctx.beginPath();ctx.arc(14,-3,27,-.8,.8);ctx.stroke();ctx.strokeStyle='#e2bb70';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(35,0);ctx.stroke();ctx.restore()}
    ctx.restore()}
  function draw(){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,vw,vh);ctx.save();ctx.translate(-camera.x,-camera.y);drawGround();drawShrine();shards.forEach(drawShard);
    const drawables=[...trees.map(t=>({y:t.y,draw:()=>drawTree(t)})),...enemies.map(e=>({y:e.y,draw:()=>drawEnemy(e)})),{y:player.y,draw:drawPlayer}].sort((a,b)=>a.y-b.y);drawables.forEach(o=>o.draw());
    // landmark wisps and woodland stones
    for(let i=0;i<14;i++){const x=(i*137+170)%W,y=(i*191+110)%H;if(x<camera.x-20||x>camera.x+vw+20||y<camera.y-20||y>camera.y+vh+20)continue;ctx.fillStyle='#a5a17a';ctx.beginPath();ctx.ellipse(x,y,8,5,.3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d2c995';ctx.beginPath();ctx.ellipse(x-2,y-2,4,2,.3,0,Math.PI*2);ctx.fill()}
    ctx.restore();
    const nearShrine=Math.hypot(player.x-shrine.x,player.y-shrine.y)<170;document.getElementById('zoneName').textContent=nearShrine?'OLD SHRINE':player.y>900?'FERN HOLLOW':player.x>900?'MOSSY CROSSING':'SUNLIT GLADE';
    // hint prompt near interactable
    if(playing&&!won&&(nearShrine||Math.hypot(player.x-425,player.y-730)<120)){ctx.fillStyle='#101b18cf';ctx.fillRect(vw/2-80,vh-63,160,24);ctx.fillStyle='#eee4c6';ctx.font='10px DM Sans';ctx.textAlign='center';ctx.fillText('E  ·  LISTEN',vw/2,vh-47)}
  }
  let last=performance.now();function loop(now){const dt=Math.min(.04,(now-last)/1000);last=now;update(dt);draw();requestAnimationFrame(loop)}requestAnimationFrame(loop);
})();
