"use strict";

//////////////////////////////////////////////////////////////////
// Canvas Setup & Globals
//////////////////////////////////////////////////////////////////
const canvas = document.getElementById("snow");
const ctx = canvas.getContext("2d");
let cw = canvas.width = window.innerWidth;
let ch = canvas.height = window.innerHeight;

// Physics constants for falling snowflakes (“light snow”).
const GRAVITY = 0.005;        // Lowered gravity for a gentle, floating feel.
const DRIFT_RANGE = 0.4;     // Maximum horizontal drift per frame

// Ground storage: Accumulated snow height per x-pixel.
const STORAGE_KEY = "snowpackGround";
let ground = loadGround();    // Array of length cw
let updateGroundFlag = false; // Flag to indicate when to update the ground

// Controls for snowfall: Maximum number of flakes and flakes added per frame.
const MAX_FLAKES = 500;
const NEW_FLAKES_PER_FRAME = 0.1;  // Fractional flakes per frame
let flakes = [];
// Variable to accumulate fractional flakes.
let flakeAccumulator = 0;

//////////////////////////////////////////////////////////////////
// Storage Functions: Ground Persistence & Generation
//////////////////////////////////////////////////////////////////
function loadGround() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved) && saved.length === cw) return saved;
  } catch (e) {
    console.warn("Error loading ground data:", e);
  }
  // If no saved data, generate a subtle initial mound.
  const newGround = new Array(cw).fill(0);
  const moundHeight = ch * 0.05; // about 5% of canvas height maximum
  const center = cw / 2;
  const spread = cw / 3;
  for (let x = 0; x < cw; x++) {
    const base = moundHeight * Math.exp(-Math.pow(x - center, 2) / (2 * spread * spread));
    const noise = Math.random() * 2;
    newGround[x] = base + noise;
  }
  return newGround;
}

function saveGround() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ground));
  } catch (e) {
    console.warn("Ground storage failed:", e);
  }
}

// Updated regenerateGround() - clear localStorage to force regeneration.
function regenerateGround() {
  localStorage.removeItem(STORAGE_KEY);
  ground = loadGround();
  saveGround();
}

//////////////////////////////////////////////////////////////////
// Grain Pattern: Textured Snowpack Appearance
//////////////////////////////////////////////////////////////////
function createGrainPattern() {
  const off = document.createElement("canvas");
  off.width = off.height = 100;
  const offCtx = off.getContext("2d");
  const imgData = offCtx.createImageData(100, 100);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const v = 220 + Math.floor(Math.random() * 36);
    imgData.data[i] = v;
    imgData.data[i + 1] = v;
    imgData.data[i + 2] = v;
    imgData.data[i + 3] = 255;
  }
  offCtx.putImageData(imgData, 0, 0);
  return ctx.createPattern(off, "repeat");
}
let grain = createGrainPattern();

//////////////////////////////////////////////////////////////////
// Resize Handling: Adjust canvas and regenerate ground/pattern.
//////////////////////////////////////////////////////////////////
window.addEventListener("resize", () => {
  cw = canvas.width = window.innerWidth;
  ch = canvas.height = window.innerHeight;
  ground = loadGround();
  saveGround();
  grain = createGrainPattern();
});

//////////////////////////////////////////////////////////////////
// Snowflake Class: Realistic Size Distribution & Physics.
//////////////////////////////////////////////////////////////////
class Snowflake {
  constructor() {
    this.reset();
  }
  
  // Generate a normally distributed random value using Box–Muller.
  static normalRandom(mean = 0, stdDev = 1) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return mean + stdDev * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }
  
  // Reset a snowflake with a random position above the canvas.
  reset() {
    this.x = Math.random() * cw;
    this.y = Math.random() * -ch;
    // Most radii between 1 and 3 (small flakes float, larger ones fall faster).
    let r = Snowflake.normalRandom(2, 0.4);
    this.r = Math.min(3, Math.max(1, r));
    this.vx = Math.random() * DRIFT_RANGE * 2 - DRIFT_RANGE;
    this.vy = this.r * 0.1;
  }
  
  update() {
    this.vy += GRAVITY * this.r;
    this.x += this.vx;
    this.y += this.vy;
    
    // Wrap snowflake horizontally.
    if (this.x > cw) this.x -= cw;
    if (this.x < 0) this.x += cw;
  }
}

//////////////////////////////////////////////////////////////////
// Ground Physics: Deposition, Avalanching, and Smoothing
//////////////////////////////////////////////////////////////////
// To visibly build heavier snow, we increase the deposit factor.
// Also, by reducing the smoothing/avalanche effects slightly the ground retains more height.
function depositSnow(x, amount) {
  if (x < 0 || x >= ground.length) return;
  const depositFactor = 1.0; // Increased to ensure each flake adds a significant amount.
  ground[x] += amount * depositFactor;
  if (x > 0) ground[x - 1] += amount * depositFactor * 0.5;
  if (x < ground.length - 1) ground[x + 1] += amount * depositFactor * 0.5;
  updateGroundFlag = true;
}

// Avalanche parameters—tweaked to avoid dissipating too much deposition.
const stableSlope = 3;
const avalancheFactor = 0.15;  // Reduced transferred fraction.
function avalancheStep() {
  const newGround = ground.slice();
  let changed = false;
  for (let x = 1; x < ground.length - 1; x++) {
    const leftDiff = ground[x] - ground[x - 1];
    const rightDiff = ground[x] - ground[x + 1];
    if (leftDiff > stableSlope) {
      let transfer = (leftDiff - stableSlope) * avalancheFactor;
      newGround[x] -= transfer;
      newGround[x - 1] += transfer;
      changed = true;
    }
    if (rightDiff > stableSlope) {
      let transfer = (rightDiff - stableSlope) * avalancheFactor;
      newGround[x] -= transfer;
      newGround[x + 1] += transfer;
      changed = true;
    }
  }
  ground = newGround;
  return changed;
}

function smoothGround() {
  if (!updateGroundFlag) return;
  // Mild diffusion to soften spikes while retaining overall buildup.
  const newGround = ground.slice();
  for (let x = 1; x < ground.length - 1; x++) {
    let avg = (ground[x - 1] + ground[x + 1]) / 2;
    // Apply only a gentle correction.
    if (Math.abs(avg - ground[x]) > 1)
      newGround[x] = ground[x] + (avg - ground[x]) * 0.05;
  }
  ground = newGround;
  // Run avalanche iterations (up to a maximum) to remove extremely steep slopes.
  const maxIterations = 3;
  let iterations = 0;
  while (avalancheStep() && iterations < maxIterations) {
    iterations++;
  }
  updateGroundFlag = false;
  saveGround();
}

//////////////////////////////////////////////////////////////////
// Draw Ground: Render a textured, snowpack.
//////////////////////////////////////////////////////////////////
function drawGround() {
  const step = 8;
  const pts = [];
  pts.push({ x: 0, y: ch - ground[0] });
  for (let x = step; x < ground.length; x += step) {
    pts.push({ x, y: ch - ground[x] });
  }
  pts.push({ x: cw, y: ch - ground[ground.length - 1] });
  
  // Optionally, draw an outline for clarity.
  ctx.beginPath();
  ctx.moveTo(0, ch);
  ctx.lineTo(pts[0].x, pts[0].y);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const prev = i === 0 ? p0 : pts[i - 1];
    const next = i + 2 < pts.length ? pts[i + 2] : p1;
    ctx.bezierCurveTo(
      p0.x + (p1.x - prev.x) / 6,
      p0.y + (p1.y - prev.y) / 6,
      p1.x - (next.x - p0.x) / 6,
      p1.y - (next.y - p0.y) / 6,
      p1.x,
      p1.y
    );
  }
  ctx.lineTo(cw, ch);
  ctx.closePath();
  ctx.fillStyle = grain;
  ctx.fill();
  
  // Draw an outline along the ground for extra emphasis.
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1;
  ctx.stroke();
}

//////////////////////////////////////////////////////////////////
// Main Animation Loop: Update flakes, deposit snow, update ground.
//////////////////////////////////////////////////////////////////
function animate() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, cw, ch);
  
  // Accumulate fractional flakes.
  flakeAccumulator += NEW_FLAKES_PER_FRAME;
  // Add a new snowflake for each whole count accumulated.
  while (flakeAccumulator >= 1) {
    if (flakes.length < MAX_FLAKES) {
      flakes.push(new Snowflake());
    }
    flakeAccumulator -= 1;
  }
  
  // Update and draw flakes; when they hit the ground, deposit their snow.
  for (let i = flakes.length - 1; i >= 0; i--) {
    const flake = flakes[i];
    const ix = Math.floor(flake.x);
    const groundLevel = ch - ground[Math.min(ix, ground.length - 1)];
    // Check if the flake has reached the accumulated ground.
    if (flake.y + flake.r >= groundLevel) {
      depositSnow(ix, flake.r);
      flakes.splice(i, 1);
      continue;
    }
    flake.update();
    ctx.beginPath();
    ctx.arc(flake.x, flake.y, flake.r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fill();
  }
  
  smoothGround();
  drawGround();
  requestAnimationFrame(animate);
}

animate();

// Attach click event to the "Regenerate Ground" button.
document.getElementById("reset_snowpack").addEventListener("click", regenerateGround);