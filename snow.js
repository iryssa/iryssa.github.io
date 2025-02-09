const canvas = document.getElementById('snow');
const ctx = canvas.getContext('2d');

let W = canvas.width = window.innerWidth;
let H = canvas.height = window.innerHeight;

// Save ground (snowpack) array to localStorage.
function saveGround() {
  try {
    const data = JSON.stringify(ground);
    localStorage.setItem('snowpackGround', data);
    console.log("Saved ground:", data);
  } catch (e) {
    console.warn("Error saving snowpack:", e);
  }
}

// Load ground (snowpack) array from localStorage.
let ground;
const storedGround = localStorage.getItem('snowpackGround');
if (storedGround) {
  try {
    let loaded = JSON.parse(storedGround);
    // If the canvas width changed, we reinitialize ground.
    if (loaded.length !== W) {
      console.log("Canvas width changed. Reinitializing ground.");
      ground = new Array(W).fill(0);
    } else {
      ground = loaded;
      console.log("Loaded ground from storage:", ground);
    }
  } catch (e) {
    console.warn("Error parsing stored snowpack, initializing new ground.", e);
    ground = new Array(W).fill(0);
  }
} else {
  ground = new Array(W).fill(0);
}

// Save latest state on tab closing.
window.addEventListener("beforeunload", function () {
  saveGround();
});

// Create an offscreen canvas to generate a grain texture for a snowy fill.
function createGrainPattern() {
  const grainCanvas = document.createElement('canvas');
  grainCanvas.width = 100;
  grainCanvas.height = 100;
  const gctx = grainCanvas.getContext('2d');
  const imageData = gctx.createImageData(grainCanvas.width, grainCanvas.height);
  for (let i = 0; i < imageData.data.length; i += 4) {
    let v = 220 + Math.floor(Math.random() * 36); // values 220..255
    imageData.data[i] = v;
    imageData.data[i + 1] = v;
    imageData.data[i + 2] = v;
    imageData.data[i + 3] = 255;
  }
  gctx.putImageData(imageData, 0, 0);
  return ctx.createPattern(grainCanvas, 'repeat');
}
let grainPattern = createGrainPattern();

// When resizing, update canvas and reinitialize ground if necessary.
window.addEventListener('resize', () => {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
  // Here you could interpolate the old data, but for simplicity we'll reinitialize.
  ground = new Array(W).fill(0);
  saveGround();
  grainPattern = createGrainPattern();
});

// Snowflake configuration.
const maxFlakes = 20000;
const flakes = [];

function Snowflake() {
  this.x = Math.random() * W;
  this.y = Math.random() * -H;
  this.r = Math.random() * 3 + 1; // radius
  this.speed = (this.r * 0.5) + Math.random();
  this.drift = Math.random() * 0.4 - 0.2; // slight horizontal drift
}
for (let i = 0; i < maxFlakes; i++) {
  flakes.push(new Snowflake());
}

// Deposit snow: increase the height at x plus a fraction for adjacent columns.
function accumulateSnow(xPos, amount) {
  if (xPos < 0 || xPos >= ground.length) return;
  ground[xPos] += amount;
  if (xPos > 0) ground[xPos - 1] += amount * 0.5;
  if (xPos < ground.length - 1) ground[xPos + 1] += amount * 0.5;
  newAccumulation = true;
}

// Update the ground: diffuse, add some noise, and simulate avalanche adjustments.
let newAccumulation = false;

function updateGround() {
  if (!newAccumulation) return;
  const newGround = ground.slice();
  const diffusion = 0.1;
  const noiseAmplitude = 0.5;
  for (let x = 1; x < ground.length - 1; x++) {
    let neighborAvg = (ground[x - 1] + ground[x + 1]) / 2;
    newGround[x] += (neighborAvg - ground[x]) * diffusion;
    newGround[x] += (Math.random() - 0.5) * noiseAmplitude;
  }
  // adjust edges
  newGround[0] = newGround[1];
  newGround[newGround.length - 1] = newGround[newGround.length - 2];

  // Avalanche collapse: shift excess snow if height differences are too high.
  const collapseThreshold = 10;
  const collapseAmount = 0.5;
  for (let x = 0; x < ground.length - 1; x++) {
    const diff = newGround[x] - newGround[x + 1];
    if (Math.abs(diff) > collapseThreshold) {
      if (diff > 0) {
        newGround[x] -= collapseAmount;
        newGround[x + 1] += collapseAmount;
      } else {
        newGround[x] += collapseAmount;
        newGround[x + 1] -= collapseAmount;
      }
    }
  }
  ground = newGround;
  newAccumulation = false;
  saveGround();
}

// Draw the ground using a smooth cubic Bézier curve.
function drawGround() {
  // We sample the ground array at regular intervals.
  const samples = [];
  const step = 8;
  samples.push({
    x: 0,
    y: H - ground[0]
  });
  for (let x = step; x < ground.length; x += step) {
    samples.push({
      x: x,
      y: H - ground[x]
    });
  }
  samples.push({
    x: W,
    y: H - ground[ground.length - 1]
  });

  // Smooth the sample points with a simple moving average.
  const smoothSamples = [];
  smoothSamples.push(samples[0]);
  for (let i = 1; i < samples.length - 1; i++) {
    const avgY = (samples[i - 1].y + samples[i].y + samples[i + 1].y) / 3;
    smoothSamples.push({
      x: samples[i].x,
      y: avgY
    });
  }
  smoothSamples.push(samples[samples.length - 1]);

  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(smoothSamples[0].x, smoothSamples[0].y);
  for (let i = 0; i < smoothSamples.length - 1; i++) {
    const p0 = smoothSamples[i];
    const p1 = smoothSamples[i + 1];
    const pPrev = i === 0 ? p0 : smoothSamples[i - 1];
    const pNext = (i + 2) >= smoothSamples.length ? p1 : smoothSamples[i + 2];
    let cp1x = p0.x + (p1.x - pPrev.x) / 6;
    let cp1y = p0.y + (p1.y - pPrev.y) / 6;
    let cp2x = p1.x - (pNext.x - p0.x) / 6;
    let cp2y = p1.y - (pNext.y - p0.y) / 6;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p1.x, p1.y);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fillStyle = grainPattern;
  ctx.fill();
}

// Main animation loop.
function drawSnow() {
  // Clear the canvas.
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  // Update and draw snowflakes.
  for (let i = 0; i < flakes.length; i++) {
    const flake = flakes[i];
    let xPos = Math.floor(flake.x);
    xPos = Math.max(0, Math.min(xPos, ground.length - 1));

    // If the flake hits the snowpack, deposit snow.
    if (flake.y + flake.r >= H - ground[xPos]) {
      accumulateSnow(xPos, flake.r * 0.6);
      flakes[i] = new Snowflake();
      continue;
    }

    flake.y += flake.speed;
    flake.x += flake.drift;
    if (flake.x > W) flake.x = 0;
    if (flake.x < 0) flake.x = W;

    ctx.beginPath();
    ctx.arc(flake.x, flake.y, flake.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();
  }

  updateGround();
  drawGround();

  requestAnimationFrame(drawSnow);
}

// Start the animation.
drawSnow();