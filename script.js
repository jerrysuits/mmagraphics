const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const W = canvas.width;
const H = canvas.height;

// APPLICATION STAGE GAME STATE
// Stores all world simulation data.



let terrain = [];
let tanks = [];
let projectile = null;
let particles = [];
let currentPlayer = 0;
let gameOver = false;
let wind = 0;
let animRunning = false;

const GRAVITY = 0.13;

// TERRAIN GENERATION

// GEOMETRY STAGE

function generateTerrain() {
  terrain = new Float32Array(W);

  const base = H * 0.54;

  for (let x = 0; x < W; x++) {
    terrain[x] =
      base
      + Math.sin(x * 0.007 + 0.3) * 55
      + Math.sin(x * 0.021 + 1.7) * 28
      + Math.sin(x * 0.051 + 0.9) * 14
      + Math.sin(x * 0.11 + 2.1) * 7;
  }
}

// TANK PLACEMENT


function placeTanks() {
  const x1 = Math.floor(W * 0.14);
  const x2 = Math.floor(W * 0.86);

  tanks = [
    {
      x: x1,
      y: terrain[x1],
      hp: 100,
      color: '#f5a83a',
      name: 'P1'
    },
    {
      x: x2,
      y: terrain[x2],
      hp: 100,
      color: '#4fc3f7',
      name: 'P2'
    }
  ];
}

// INITIALISE


function init() {
  generateTerrain();
  placeTanks();
  newWindValue();

  projectile = null;
  particles = [];
  currentPlayer = 0;
  gameOver = false;
  animRunning = false;

  document.getElementById('fireBtn').disabled = false;

  setMessage('PLAYER 1 — AIM AND FIRE');

  updateUI();
  render();
}

// WIND


function newWindValue() {
  wind = (Math.random() * 2 - 1) * 0.038;
}


// INPUT


const angleInput = document.getElementById('angle');
const powerInput = document.getElementById('power');

angleInput.addEventListener('input', () => {
  document.getElementById('angleVal').textContent =
    angleInput.value + '°';

  if (!projectile && !gameOver) render();
});

powerInput.addEventListener('input', () => {
  document.getElementById('powerVal').textContent =
    powerInput.value;

  if (!projectile && !gameOver) render();
});

document.getElementById('fireBtn').addEventListener('click', fire);
document.getElementById('resetBtn').addEventListener('click', init);


// FIRE


function fire() {
  if (gameOver || projectile) return;

  document.getElementById('fireBtn').disabled = true;

  const angleDeg = parseFloat(angleInput.value);
  const power = parseFloat(powerInput.value);

  const dir = currentPlayer === 0 ? 1 : -1;

  const rad = angleDeg * Math.PI / 180;
  const speed = power * 0.17;

  const vx = dir * Math.cos(rad) * speed;
  const vy = -1 * Math.sin(rad) * speed;

  projectile = {
    x: tanks[currentPlayer].x + dir * 13,
    y: tanks[currentPlayer].y - 10,
    vx,
    vy
  };

  if (!animRunning) {
    animRunning = true;
    requestAnimationFrame(loop);
  }
}


// PROJECTILE UPDATE

function updateProjectile() {
  if (!projectile) return;

  projectile.vy += GRAVITY;
  projectile.vx += wind;

  projectile.x += projectile.vx;
  projectile.y += projectile.vy;

  if (projectile.x < 0 || projectile.x > W) {
    projectile = null;
    nextTurn();
    return;
  }

  const px = Math.round(projectile.x);
  const py = projectile.y;

  if (px >= 0 && px < W && py >= terrain[px]) {
    spawnParticles(projectile.x, terrain[px], '#f5a83a');

    deformTerrain(px, 32);

    projectile = null;

    nextTurn();
    return;
  }

  for (let i = 0; i < 2; i++) {
    const t = tanks[i];

    const dx = projectile.x - t.x;
    const dy = projectile.y - (t.y - 8);

    if (Math.hypot(dx, dy) < 20) {
      t.hp = Math.max(0, t.hp - 38);

      spawnParticles(
        t.x,
        t.y - 8,
        i === 0 ? '#f5a83a' : '#4fc3f7'
      );

      projectile = null;

      updateUI();

      if (t.hp <= 0) {
        endGame(currentPlayer);
        return;
      }

      nextTurn();
      return;
    }
  }
}


// TERRAIN DEFORMATION
// RASTERISATION STAGE


function deformTerrain(cx, radius) {
  const r2 = radius * radius;

  for (let x = cx - radius; x <= cx + radius; x++) {
    if (x < 0 || x >= W) continue;

    const d = x - cx;

    const dip =
      Math.sqrt(Math.max(0, r2 - d * d)) * 0.55;

    terrain[x] += dip;
  }

  for (const t of tanks) {
    const tx =
      Math.min(W - 1, Math.max(0, Math.round(t.x)));

    t.y = terrain[tx];
  }
}


// PARTICLES


function spawnParticles(x, y, accentColor) {
  for (let i = 0; i < 32; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = Math.random() * 3.5 + 0.5;

    particles.push({
      x,
      y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - 2.2,
      life: 1.0,
      size: Math.random() * 3.5 + 1,
      hot: accentColor
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1;
    p.life -= 0.038;

    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}


// TURN MANAGEMENT


function nextTurn() {
  currentPlayer = 1 - currentPlayer;

  newWindValue();

  updateUI();

  setMessage(
    `PLAYER ${currentPlayer + 1} — AIM AND FIRE`
  );

  document.getElementById('fireBtn').disabled = false;
}

function endGame(winner) {
  gameOver = true;

  updateUI();

  setMessage(
    `PLAYER ${winner + 1} WINS — PRESS RESET`
  );
}

function updateUI() {
  document.getElementById('hp1').textContent =
    tanks[0]?.hp ?? 100;

  document.getElementById('hp2').textContent =
    tanks[1]?.hp ?? 100;

  const p1 = document.getElementById('p1-info');
  const p2 = document.getElementById('p2-info');

  p1.className =
    'player-info ' +
    (currentPlayer === 0 ? 'active' : 'inactive');

  p2.className =
    'player-info ' +
    (currentPlayer === 1 ? 'active' : 'inactive');
}

function setMessage(m) {
  document.getElementById('message').textContent = m;
}


// DRAWING


function drawBackground() {
  const bg = ctx.createLinearGradient(0, 0, 0, H);

  bg.addColorStop(0, '#03070a');
  bg.addColorStop(1, '#010503');

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#b5f54228';

  for (let i = 0; i < 90; i++) {
    const sx = (i * 139 + 23) % W;
    const sy = (i * 101 + 7) % (H * 0.48);

    ctx.fillRect(sx, sy, 1, 1);
  }
}

function drawTerrain() {
  ctx.beginPath();

  ctx.moveTo(0, terrain[0]);

  for (let x = 1; x < W; x++) {
    ctx.lineTo(x, terrain[x]);
  }

  ctx.lineTo(W, H);
  ctx.lineTo(0, H);

  ctx.closePath();

  const g =
    ctx.createLinearGradient(0, H * 0.35, 0, H);

  g.addColorStop(0, '#1e3d1e');
  g.addColorStop(1, '#081208');

  ctx.fillStyle = g;
  ctx.fill();

  ctx.beginPath();

  ctx.moveTo(0, terrain[0]);

  for (let x = 1; x < W; x++) {
    ctx.lineTo(x, terrain[x]);
  }

  ctx.strokeStyle = '#3d9e3d';
  ctx.lineWidth = 1.5;

  ctx.stroke();
}

function drawTank(tank, idx) {
  const { x, y, color } = tank;

  const isActive =
    currentPlayer === idx &&
    !gameOver &&
    !projectile;

  const dir = idx === 0 ? 1 : -1;

  const deg =
    isActive ? parseFloat(angleInput.value) : 45;

  const rad = deg * Math.PI / 180;

  ctx.shadowBlur = 10;
  ctx.shadowColor = color;

  ctx.fillStyle = color;
  ctx.fillRect(x - 14, y - 16, 28, 12);

  ctx.fillStyle = '#2a2a2a';
  ctx.shadowBlur = 0;
  ctx.fillRect(x - 16, y - 6, 32, 6);

  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(x - 16, y - 5, 4, 4);
  ctx.fillRect(x - 4, y - 5, 4, 4);
  ctx.fillRect(x + 8, y - 5, 4, 4);

  const barLen = 22;

  const bx =
    x + dir * Math.cos(rad) * barLen;

  const by =
    (y - 12) + (-Math.sin(rad)) * barLen;

  ctx.beginPath();

  ctx.moveTo(x, y - 12);
  ctx.lineTo(bx, by);

  ctx.strokeStyle = color;
  ctx.lineWidth = 5;

  ctx.shadowBlur = 8;
  ctx.shadowColor = color;

  ctx.stroke();

  ctx.shadowBlur = 0;

  const barW = 44;
  const frac = tank.hp / 100;

  const barX = x - barW / 2;
  const barY = y - 30;

  ctx.fillStyle = '#111';
  ctx.fillRect(barX, barY, barW, 4);

  const hpColor =
    frac > 0.5
      ? '#b5f542'
      : frac > 0.25
      ? '#f5c842'
      : '#f54242';

  ctx.fillStyle = hpColor;
  ctx.fillRect(barX, barY, barW * frac, 4);
}

function drawHalo() {
  if (gameOver || projectile) return;

  const t = tanks[currentPlayer];

  const pulse =
    0.5 + 0.5 * Math.sin(Date.now() * 0.005);

  ctx.beginPath();

  ctx.arc(
    t.x,
    t.y - 10,
    26 + pulse * 5,
    0,
    Math.PI * 2
  );

  ctx.strokeStyle =
    `rgba(181,245,66,${0.15 + pulse * 0.25})`;

  ctx.lineWidth = 1.5;

  ctx.stroke();
}

function drawProjectile() {
  if (!projectile) return;

  ctx.beginPath();

  ctx.arc(
    projectile.x,
    projectile.y,
    5,
    0,
    Math.PI * 2
  );

  ctx.fillStyle = '#ffffff';

  ctx.shadowBlur = 16;
  ctx.shadowColor = '#ffe060';

  ctx.fill();

  ctx.shadowBlur = 0;
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = p.life;

    ctx.beginPath();

    ctx.arc(
      p.x,
      p.y,
      p.size,
      0,
      Math.PI * 2
    );

    const col =
      p.life > 0.65
        ? '#ffffff'
        : p.life > 0.35
        ? p.hot
        : '#cc3300';

    ctx.fillStyle = col;

    ctx.shadowBlur = 7;
    ctx.shadowColor = col;

    ctx.fill();
  }

  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

function drawWind() {
  const cx = W / 2;
  const cy = 22;

  ctx.font = '10px Share Tech Mono, monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#b5f54270';

  ctx.fillText('WIND', cx, cy - 5);

  if (Math.abs(wind) < 0.003) {
    ctx.fillStyle = '#b5f54250';
    ctx.fillText('CALM', cx, cy + 10);
    return;
  }

  const arrowLen = Math.abs(wind) * 900;
  const dir = wind > 0 ? 1 : -1;
  const ay = cy + 8;

  ctx.beginPath();

  ctx.moveTo(cx - dir * arrowLen / 2, ay);
  ctx.lineTo(cx + dir * arrowLen / 2, ay);

  ctx.strokeStyle = '#b5f542bb';
  ctx.lineWidth = 1.5;

  ctx.stroke();

  const tipX = cx + dir * arrowLen / 2;

  ctx.beginPath();

  ctx.moveTo(tipX, ay);
  ctx.lineTo(tipX - dir * 7, ay - 4);
  ctx.lineTo(tipX - dir * 7, ay + 4);

  ctx.closePath();

  ctx.fillStyle = '#b5f542bb';

  ctx.fill();
}

function drawTrajectoryPreview() {
  if (projectile || gameOver) return;

  const dir = currentPlayer === 0 ? 1 : -1;

  const deg = parseFloat(angleInput.value);
  const power = parseFloat(powerInput.value);

  const rad = deg * Math.PI / 180;
  const speed = power * 0.17;

  let px =
    tanks[currentPlayer].x + dir * 13;

  let py =
    tanks[currentPlayer].y - 10;

  let vx =
    dir * Math.cos(rad) * speed;

  let vy =
    -1 * Math.sin(rad) * speed;

  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#b5f542';

  for (let step = 0; step < 70; step++) {
    vy += GRAVITY;
    vx += wind;

    px += vx;
    py += vy;

    if (step % 5 === 0) {
      ctx.beginPath();

      ctx.arc(px, py, 2, 0, Math.PI * 2);

      ctx.fill();
    }

    if (px < 0 || px > W || py > H) break;

    const ix = Math.round(px);

    if (ix >= 0 && ix < W && py >= terrain[ix]) {
      break;
    }
  }

  ctx.globalAlpha = 1;
}

function render() {
  ctx.clearRect(0, 0, W, H);

  drawBackground();
  drawTerrain();
  drawHalo();

  drawTank(tanks[0], 0);
  drawTank(tanks[1], 1);

  drawTrajectoryPreview();
  drawProjectile();
  drawParticles();
  drawWind();
}


// GAME LOOP


function loop() {
  updateProjectile();
  updateParticles();

  render();

  if (projectile || particles.length > 0) {
    requestAnimationFrame(loop);
  } else {
    animRunning = false;

    if (!gameOver) render();
  }
}



init();