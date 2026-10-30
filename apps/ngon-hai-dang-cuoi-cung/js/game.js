(() => {
const S = window.STORY;
const cv = document.getElementById("sea"), ctx = cv.getContext("2d");
const $ = id => document.getElementById(id);
const LIVES = 3, LIGHT_NEED = 0.8, BEAM_HALF = 0.14;

let W = 0, H = 0, scale = 1, dpr = 1;
let state = "menu", nightIdx = 0, night = null;
let boats = [], splashes = [], saved = 0, lives = LIVES, spawnT = 0, time = 0;
let aim = -Math.PI / 2, aimTarget = aim, keys = {};
const stars = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random() * .45, r: Math.random() * 1.3 + .3, t: Math.random() * 6 }));
const rain = Array.from({ length: 120 }, () => ({ x: Math.random(), y: Math.random(), s: Math.random() * .5 + .7 }));

// ---------- kích thước ----------
function resize(){
  dpr = Math.min(devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight; scale = Math.min(W, H * 0.8) / 700;
  cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener("resize", resize); resize();
const tower = () => ({ x: W / 2, y: H - 40 * scale - 120 * scale });
const rockY = () => H - 150 * scale;
const beamLen = () => Math.hypot(W, H);

// ---------- điều khiển ----------
function pointAt(px, py){
  const t = tower();
  aimTarget = Math.max(-Math.PI + .12, Math.min(-.12, Math.atan2(py - t.y, px - t.x)));
}
cv.addEventListener("pointermove", e => pointAt(e.clientX, e.clientY));
cv.addEventListener("pointerdown", e => { cv.setPointerCapture?.(e.pointerId); pointAt(e.clientX, e.clientY); });
addEventListener("keydown", e => { keys[e.key] = true; });
addEventListener("keyup", e => { keys[e.key] = false; });

// ---------- màn hình truyện ----------
function show(o, onClick){
  $("sEyebrow").textContent = o.eyebrow || "";
  $("sTitle").textContent = o.title;
  $("sText").innerHTML = o.text.map(p => `<p>${p}</p>`).join("");
  $("sBtn").textContent = o.button;
  $("sHint").textContent = o.hint || "";
  $("sBtn").onclick = onClick;
  $("screen").hidden = false; $("hud").hidden = true;
  const card = $("screen").querySelector(".card"); card.style.animation = "none"; card.offsetHeight; card.style.animation = "";
  setTimeout(() => $("sBtn").focus(), 50);
}
function showNightIntro(i){
  const n = S.nights[i];
  show({ eyebrow: `${n.name} / 3`, title: n.title, text: n.text, hint: n.hint, button: "Thắp đèn" }, () => startNight(i));
}
function startNight(i){
  nightIdx = i; night = S.nights[i];
  boats = []; splashes = []; saved = 0; lives = LIVES; spawnT = 1; state = "play";
  $("screen").hidden = true; $("hud").hidden = false;
  $("hudNight").textContent = night.name; $("hudGoal").textContent = night.goal;
  updateHud();
}
function updateHud(){
  $("hudSaved").textContent = saved;
  $("hudLives").innerHTML = Array.from({ length: LIVES }, (_, k) => `<i class="${k < lives ? "" : "off"}"></i>`).join("");
}
function endNight(win){
  state = "pause";
  setTimeout(() => {
    if (!win) return show(S.lose, () => startNight(nightIdx));
    if (nightIdx < S.nights.length - 1) showNightIntro(nightIdx + 1);
    else { state = "dawn"; show(S.ending, () => showNightIntro(0)); }
  }, 900);
}

// ---------- thuyền ----------
function spawnBoat(){
  const t = tower();
  const tx = t.x + (Math.random() < .5 ? -1 : 1) * (40 + Math.random() * W * .35) * (W > 600 ? 1 : .8);
  const x = W * (.08 + Math.random() * .84), y = -20;
  const d = Math.hypot(tx - x, rockY() - y), v = night.speed * scale * (0.85 + Math.random() * .3);
  boats.push({ x, y, vx: (tx - x) / d * v, vy: (rockY() - y) / d * v, light: 0, state: "lost", phase: Math.random() * 6, lit: false, seen: 0 });
}

function inBeam(b){
  const t = tower(), a = Math.atan2(b.y - t.y, b.x - t.x);
  let diff = Math.abs(a - aim); if (diff > Math.PI) diff = 2 * Math.PI - diff;
  return diff < BEAM_HALF && Math.hypot(b.x - t.x, b.y - t.y) < beamLen();
}

function update(dt){
  time += dt;
  if (keys.ArrowLeft || keys.a) aimTarget = Math.max(-Math.PI + .12, aimTarget - 1.8 * dt);
  if (keys.ArrowRight || keys.d) aimTarget = Math.min(-.12, aimTarget + 1.8 * dt);
  aim += (aimTarget - aim) * Math.min(1, dt * 10);
  if (state !== "play") { boats.forEach(b => moveBoat(b, dt)); return; }

  spawnT -= dt;
  const alive = boats.filter(b => b.state === "lost").length;
  if (spawnT <= 0 && alive < 3 + nightIdx && saved + alive < night.goal + 2) { spawnBoat(); spawnT = night.spawn * (0.75 + Math.random() * .5); }

  for (const b of boats) {
    moveBoat(b, dt);
    if (b.state !== "lost") continue;
    b.lit = inBeam(b);
    b.seen = Math.max(0, Math.min(1, b.seen + (b.lit ? 4 : -1.2) * dt));
    if (b.lit) b.light += dt; else b.light = Math.max(0, b.light - dt * .35);
    if (b.light >= LIGHT_NEED) {
      b.state = "safe"; saved++; updateHud();
      const side = b.x < W / 2 ? -1 : 1, v = 80 * scale;
      b.vx = side * v; b.vy = -v * .25;
      if (saved >= night.goal) endNight(true);
    } else if (b.y >= rockY()) {
      b.state = "wreck"; lives--; updateHud();
      splashes.push({ x: b.x, y: b.y, t: 0 });
      if (lives <= 0) endNight(false);
    }
  }
  boats = boats.filter(b => b.state !== "wreck" && b.x > -80 && b.x < W + 80 && b.y < H + 40);
  splashes = splashes.filter(s => (s.t += dt) < 1.2);
}
function moveBoat(b, dt){
  const wind = b.state === "lost" && night ? Math.sin(time * .8 + b.phase) * night.wind * 45 * scale : 0;
  b.x += (b.vx + wind) * dt; b.y += b.vy * dt;
}

// ---------- vẽ ----------
function draw(){
  const t = tower(), dawn = state === "dawn";
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, dawn ? "#f6b38a" : "#0b1a33"); sky.addColorStop(.55, dawn ? "#6f86b5" : "#0a1527"); sky.addColorStop(1, dawn ? "#2a4a6c" : "#050b16");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

  if (!dawn) for (const s of stars) { ctx.globalAlpha = .35 + .35 * Math.sin(time * 1.5 + s.t); ctx.fillStyle = "#e9eefc"; ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;

  // sóng
  for (let i = 0; i < 9; i++) {
    const y = H * .32 + i * (rockY() - H * .32) / 8;
    ctx.strokeStyle = `rgba(120,160,210,${.05 + i * .012})`; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let x = 0; x <= W; x += 16) ctx.lineTo(x, y + Math.sin(x * .02 + time * (1 + i * .1) + i) * 3 * scale);
    ctx.stroke();
  }

  // chùm sáng
  if (!dawn) {
    const L = beamLen();
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(t.x, t.y, 4, t.x, t.y, L * .75);
    g.addColorStop(0, "rgba(255,214,130,.55)"); g.addColorStop(.4, "rgba(255,200,110,.18)"); g.addColorStop(1, "rgba(255,200,110,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(t.x, t.y);
    ctx.arc(t.x, t.y, L, aim - BEAM_HALF, aim + BEAM_HALF); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // sương mù (đêm 3)
  if (night?.fog && state !== "menu" && !dawn) {
    ctx.fillStyle = "rgba(170,182,200,.30)"; ctx.fillRect(0, 0, W, rockY() + 20 * scale);
  }

  for (const b of boats) drawBoat(b);
  for (const s of splashes) { ctx.strokeStyle = `rgba(220,235,255,${1 - s.t / 1.2})`; ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(s.x, s.y, (8 + s.t * 40 + k * 10) * scale, Math.PI, 0); ctx.stroke(); } }

  drawRocks(); drawIsland(t);

  // mưa
  if (!dawn && state !== "menu") {
    ctx.strokeStyle = "rgba(180,200,230,.25)"; ctx.lineWidth = 1; ctx.beginPath();
    for (const r of rain) { r.y = (r.y + .012 * r.s) % 1; const x = (r.x * W + time * 60 * r.s) % W, y = r.y * H; ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 14); }
    ctx.stroke();
  }
}

function drawBoat(b){
  const fog = night?.fog && b.state === "lost";
  const alpha = fog ? .08 + .92 * b.seen : 1;
  ctx.save(); ctx.translate(b.x, b.y); ctx.globalAlpha = alpha;
  const s = scale * 1.1, dir = b.vx >= 0 ? 1 : -1;
  ctx.scale(dir * s, s);
  ctx.rotate(Math.sin(time * 3 + b.phase) * .08);
  ctx.fillStyle = b.state === "safe" ? "#5ed39a" : "#2c3a52";
  ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(18, 0); ctx.lineTo(12, 8); ctx.lineTo(-13, 8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = b.lit || b.state === "safe" ? "#f3ead6" : "#7e8aa0";
  ctx.beginPath(); ctx.moveTo(-1, -2); ctx.lineTo(-1, -26); ctx.lineTo(13, -4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#ffcf73"; ctx.beginPath(); ctx.arc(-12, -3, 2, 0, 7); ctx.fill();
  ctx.restore();
  if (b.state === "lost" && b.light > 0) {
    ctx.strokeStyle = "rgba(255,200,97,.95)"; ctx.lineWidth = 3 * scale;
    ctx.beginPath(); ctx.arc(b.x, b.y - 38 * scale, 9 * scale, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, b.light / LIGHT_NEED)); ctx.stroke();
  }
}

function drawRocks(){
  const y = rockY(), t = tower();
  ctx.fillStyle = "#121a26";
  for (let i = 0; i < 26; i++) {
    const x = (i + .5) * W / 26;
    if (Math.abs(x - t.x) < 70 * scale) continue;
    const h = (14 + ((i * 37) % 17)) * scale, w = (W / 26) * .9;
    ctx.beginPath(); ctx.moveTo(x - w / 2, y + 18 * scale); ctx.lineTo(x - w * .1, y - h); ctx.lineTo(x + w * .2, y - h * .6); ctx.lineTo(x + w / 2, y + 18 * scale); ctx.fill();
  }
  ctx.fillStyle = "rgba(220,235,255,.18)";
  for (let i = 0; i < W; i += 22) ctx.fillRect(i + Math.sin(time * 2 + i) * 4, y + 10 * scale, 10, 2);
}

function drawIsland(t){
  ctx.fillStyle = "#0b111b";
  ctx.beginPath(); ctx.moveTo(t.x - 160 * scale, H); ctx.quadraticCurveTo(t.x - 90 * scale, t.y + 100 * scale, t.x, t.y + 104 * scale);
  ctx.quadraticCurveTo(t.x + 90 * scale, t.y + 100 * scale, t.x + 160 * scale, H); ctx.fill();
  ctx.fillRect(0, H - 30 * scale, W, 30 * scale);
  // tháp
  const s = scale;
  ctx.fillStyle = "#d9d2c2";
  ctx.beginPath(); ctx.moveTo(t.x - 22 * s, t.y + 106 * s); ctx.lineTo(t.x - 13 * s, t.y + 14 * s); ctx.lineTo(t.x + 13 * s, t.y + 14 * s); ctx.lineTo(t.x + 22 * s, t.y + 106 * s); ctx.fill();
  ctx.fillStyle = "#b8463b";
  for (const yy of [30, 62, 92]) { ctx.beginPath(); ctx.moveTo(t.x - (14 + yy * .08) * s, t.y + yy * s); ctx.lineTo(t.x + (14 + yy * .08) * s, t.y + yy * s); ctx.lineTo(t.x + (15 + yy * .08) * s, t.y + (yy + 10) * s); ctx.lineTo(t.x - (15 + yy * .08) * s, t.y + (yy + 10) * s); ctx.fill(); }
  ctx.fillStyle = "#2b3242"; ctx.fillRect(t.x - 17 * s, t.y + 10 * s, 34 * s, 5 * s);
  ctx.fillStyle = state === "dawn" ? "#e9dcbc" : "#ffd98a";
  ctx.shadowColor = "#ffcf73"; ctx.shadowBlur = state === "dawn" ? 0 : 30;
  ctx.fillRect(t.x - 10 * s, t.y - 6 * s, 20 * s, 16 * s); ctx.shadowBlur = 0;
  ctx.fillStyle = "#2b3242"; ctx.beginPath(); ctx.moveTo(t.x - 14 * s, t.y - 6 * s); ctx.lineTo(t.x, t.y - 20 * s); ctx.lineTo(t.x + 14 * s, t.y - 6 * s); ctx.fill();
}

// ---------- vòng lặp ----------
let last = performance.now();
function loop(now){
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  update(dt); draw(); requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Menu: thuyền trang trí trôi chậm
night = { ...S.nights[0], speed: 18 };
for (let i = 0; i < 3; i++) { spawnBoat(); boats[i].y = H * (.35 + i * .1); }
show(S.title, () => showNightIntro(0));
})();
