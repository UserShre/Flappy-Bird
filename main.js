// Flappy Bird - simple canvas implementation
// Drop your sprite sheet at assets/sprites.png
// Configure sprite coordinates below if needed.

(() => {
  // Config
  const CANVAS_W = 480, CANVAS_H = 640;
  const GROUND_Y = CANVAS_H - 112;
  const BIRD_X = 80;
  const GRAVITY = 0.5;
  const FLAP_V = -8.5;
  const PIPE_SPEED = 2.2;
  const PIPE_GAP = 150; // change difficulty
  const PIPE_INTERVAL = 1500; // ms
  const STORAGE_KEY = 'flappy_bird_scores_v1';

  // Sprite configuration (default guesses). If your sheet differs, update these.
  const SPRITE_PATH = 'flappy bird sprites.png';
  const SPRITES = {
    // bird frames (x,y,w,h) in sheet
    birdFrames: [{x:156,y:115,w:34,h:24},{x:156,y:139,w:34,h:24},{x:156,y:163,w:34,h:24}],
    pipeTop: {x:112,y:646,w:52,h:320},
    pipeBottom: {x:168,y:646,w:52,h:320},
    ground: {x:0,y:610,w:336,h:112}
  };

  // Simple DOM
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  canvas.width = CANVAS_W; canvas.height = CANVAS_H;
  const scoreEl = document.getElementById('score');
  const highEl = document.getElementById('highscore');

  // Game state
  let bird = {x:BIRD_X,y:CANVAS_H/2,vy:0,frame:0,frameTimer:0};
  let pipes = [];
  let lastPipe = 0;
  let lastTime = 0;
  let running = false;
  let score = 0;
  let best = 0;
  let worldRecord = null; // if fetched from remote
  let spritesImg = new Image();
  spritesImg.src = SPRITE_PATH;

  // Load saved scores
  function loadScores(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if(raw) {
        const obj = JSON.parse(raw);
        best = obj.best||0;
      }
    } catch(e){}
    highEl.textContent = 'Best: ' + best;
  }
  function saveScores(){
    const obj = {best};
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  }

  // Reset
  function reset(){
    bird.y = CANVAS_H/2; bird.vy = 0; bird.frame = 0; bird.frameTimer = 0;
    pipes = []; lastPipe = performance.now();
    score = 0; running = true;
    scoreEl.textContent = score;
  }

  // Input
  function flap(){
    if(!running) {
      reset();
      return;
    }
    bird.vy = FLAP_V;
  }
  window.addEventListener('keydown', e => {
    if(e.code === 'Space') { e.preventDefault(); flap(); }
  });
  canvas.addEventListener('pointerdown', e => { flap(); });

  // Pipe creation
  function spawnPipe(){
    const top = 80 + Math.random() * (GROUND_Y - PIPE_GAP - 160);
    pipes.push({x:CANVAS_W, topY: top, passed:false});
  }

  // Collision detection (AABB)
  function intersectsRect(ax,ay,aw,ah,bx,by,bw,bh){
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function update(dt, now) {
    // Bird physics
    bird.vy += GRAVITY;
    bird.y += bird.vy;
    bird.frameTimer += dt;
    if(bird.frameTimer > 100){ bird.frame = (bird.frame+1)%3; bird.frameTimer = 0; }

    // Pipes
    if(now - lastPipe > PIPE_INTERVAL){
      spawnPipe(); lastPipe = now;
    }
    for(let p of pipes){
      p.x -= PIPE_SPEED;
      // scoring when bird passes pipe
      if(!p.passed && p.x + 52 < bird.x){
        p.passed = true; score++; scoreEl.textContent = score;
        if(score > best){ best = score; highEl.textContent = 'Best: ' + best; saveScores(); }
      }
    }
    // remove offscreen
    pipes = pipes.filter(p => p.x + 52 > -50);

    // ground collision
    if(bird.y + 12 >= GROUND_Y){
      running = false;
      bird.y = GROUND_Y - 12;
    }
    // top collision
    if(bird.y < -20) { bird.y = -20; bird.vy = 0; }

    // collisions with pipes
    for(let p of pipes){
      // top pipe rect
      const pipeW = 52, pipeH = 320;
      const topRect = {x:p.x, y: p.topY - pipeH, w: pipeW, h: pipeH};
      const botRect = {x:p.x, y: p.topY + PIPE_GAP, w: pipeW, h: pipeH};
      const birdRect = {x: bird.x - 6, y: bird.y - 12, w: 34, h: 24};
      if(intersectsRect(birdRect.x,birdRect.y,birdRect.w,birdRect.h, topRect.x, topRect.y, topRect.w, topRect.h) ||
         intersectsRect(birdRect.x,birdRect.y,birdRect.w,birdRect.h, botRect.x, botRect.y, botRect.w, botRect.h)) {
        running = false;
      }
    }
  }

  function draw(){
    // clear
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // background (simple)
    ctx.fillStyle = '#70c5ce';
    ctx.fillRect(0,0,canvas.width,canvas.height);

    // pipes
    ctx.save();
    for(let p of pipes){
      // top pipe
      if(spritesImg.complete){
        const s = SPRITES.pipeTop;
        // draw top (flipped vertically)
        ctx.drawImage(spritesImg, s.x, s.y, s.w, s.h,
          p.x, p.topY - s.h, s.w, s.h);
        // bottom
        const sb = SPRITES.pipeBottom;
        ctx.drawImage(spritesImg, sb.x, sb.y, sb.w, sb.h,
          p.x, p.topY + PIPE_GAP, sb.w, sb.h);
      } else {
        ctx.fillStyle = '#48b36b';
        ctx.fillRect(p.x, p.topY - 320, 52, 320);
        ctx.fillRect(p.x, p.topY + PIPE_GAP, 52, 320);
      }
    }
    ctx.restore();

    // ground (repeat)
    if(spritesImg.complete){
      const g = SPRITES.ground;
      // draw ground at bottom tiled
      for(let x=0;x<canvas.width;x+=g.w){
        ctx.drawImage(spritesImg, g.x, g.y, g.w, g.h, x, GROUND_Y, g.w, g.h);
      }
    } else {
      ctx.fillStyle = '#ded895';
      ctx.fillRect(0,GROUND_Y,canvas.width,canvas.height-GROUND_Y);
    }

    // bird
    if(spritesImg.complete){
      const bf = SPRITES.birdFrames[bird.frame];
      ctx.drawImage(spritesImg, bf.x, bf.y, bf.w, bf.h, bird.x - bf.w/2, bird.y - bf.h/2, bf.w, bf.h);
    } else {
      ctx.fillStyle = '#ff0';
      ctx.fillRect(bird.x-12, bird.y-12, 24, 24);
    }

    // small overlay messages
    if(!running){
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(40, 180, canvas.width-80, 160);
      ctx.fillStyle = '#fff';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Click or press Space to Start', canvas.width/2, 240);
      ctx.fillText('Score: ' + score, canvas.width/2, 280);
      ctx.fillText('Best: ' + best, canvas.width/2, 310);
    }
  }

  function loop(now){
    if(!lastTime) lastTime = now;
    const dt = now - lastTime;
    lastTime = now;
    if(running) update(dt, now);
    draw();
    requestAnimationFrame(loop);
  }

  // Leaderboard / World record (optional)
  // This demo stores best locally. To add a world-record/leaderboard you need a remote endpoint.
  // Example endpoints you'll need:
  // GET  /top -> returns {worldRecord: number}
  // POST /submit {score:int, name:string} -> stores score
  // The code to call those endpoints is left commented below for your backend integration.

  /*
  async function fetchWorldRecord(){
    try {
      const res = await fetch('https://your-server.example.com/top');
      const data = await res.json();
      worldRecord = data.worldRecord;
      // show it somewhere
    } catch(e){}
  }
  async function submitScoreToWorld(name, score){
    await fetch('https://your-server.example.com/submit', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({name, score})
    });
  }
  */

  // init
  loadScores();
  spritesImg.onload = () => { draw(); };
  requestAnimationFrame(loop);
})();
