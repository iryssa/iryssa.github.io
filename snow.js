const canvas = document.getElementById('snow');
const ctx = canvas.getContext('2d');

// Set canvas dimensions to full window.
let W = canvas.width = window.innerWidth;
let H = canvas.height = window.innerHeight;

// Helper function to save the ground array to localStorage.
function saveGround() {
  try {
    localStorage.setItem('snowpackGround', JSON.stringify(ground));
  } catch (e) {
    console.warn("Could not save snowpack to localStorage", e);
  }
}

// Try to load the stored ground; if none exists, create a new array.
let savedData = localStorage.getItem('snowpackGround');
let ground;
if (savedData) {
  try {
    ground = JSON.parse(savedData);
    // If stored array length doesn't match current width, adjust:
    if (ground.length !== W) {
      ground = new Array(W).fill(0);
    }
  } catch (e) {
    ground = new Array(W).fill(0);
  }
} else {
  ground = new Array(W).fill(0);
}

let newAccumulation = false; // Flag indicating new snowfall this frame.

// Create an offscreen grain texture for filling the snow.
function createGrainPattern() {
  const grainCanvas = document.createElement('canvas');
  grainCanvas.width = 100;
  grainCanvas.height = 100;
  const gctx = grainCanvas.getContext('2d');
  const imageData = gctx.createImageData(grainCanvas.width, grainCanvas.height);
  for (let i = 0; i < imageData.data.length; i += 4) {
    let v = 220 + Math.floor(Math.random() * 36);
    imageData.data[i] = v;
    imageData.data[i + 1] = v;
    imageData.data[i + 2] = v;
    imageData.data[i + 3] = 255;
  }
  gctx.putImageData(imageData, 0, 0);
  return ctx.createPattern(grainCanvas, 'repeat');
}
let grainPattern = createGrainPattern();

// Adjust dimensions on resize.
window.addEventListener('resize', () => {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
  // Reset ground to an array of new size.
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
  this.r = Math.random() * 3 + 1;
  this.speed = (this.r * 0.5) + Math.random();
  this.drift = Math.random() * 0.4 - 0.2;
}

for (let i = 0; i < maxFlakes; i++) {
  flakes.push(new Snowflake());
}

// When a flake lands, add to the ground accumulation at nearly that x-position (and spread to adjacent pixels).
function accumulateSnow(xPos, amount) {
  if (xPos < 0 || xPos >= ground.length) return;
  ground[xPos] += amount;
  if (xPos > 0) ground[xPos - 1] += amount * 0.5;
  if (xPos < ground.length - 1) ground[xPos + 1] += amount * 0.5;
  newAccumulation = true;
}

// Update and smooth the ground only when new snow is added.
function updateGround() {
  if (!newAccumulation) return;
  const newGround = ground.slice();
  const diffusion = 0.1;
  const noiseAmplitude = 0.5;
  for (let x = 1; x < ground.length - 1; x++) {
    const neighborAvg = (ground[x - 1] + ground[x + 1]) / 2;
    newGround[x] += (neighborAvg - ground[x]) * diffusion;
    newGround[x] += (Math.random() - 0.5) * noiseAmplitude;
  }
  // Pin the edges.
  newGround[0] = newGround[1];
  newGround[newGround.length - 1] = newGround[newGround.length - 2];

  // Avalanche collapse: shift snow if differences are too steep.
  const collapseThreshold = 10;
  const collapseAmount = 0.5;
  for (let x = 0; x < ground.length - 1; x++) {
    let diff = newGround[x] - newGround[x + 1];
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
  // Save updated ground to localStorage.
  saveGround();
}

// Draw the snow surface along the bottom using a smooth cubic Bézier curve.
function drawGround() {
  // Step 1: Sample the ground at fixed intervals.
  const samples = [];
  const step = 8; // macro sampling step
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

  // Step 2: Smooth the sample points with a moving average.
  const smoothSamples = [];
  smoothSamples.push(samples[0]);
  for (let i = 1; i < samples.length - 1; i++) {
    let avgY = (samples[i - 1].y + samples[i].y + samples[i + 1].y) / 3;
    smoothSamples.push({
      x: samples[i].x,
      y: avgY
    });
  }
  smoothSamples.push(samples[samples.length - 1]);

  // Step 3: Draw the curve using cubic Bézier segments.
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(smoothSamples[0].x, smoothSamples[0].y);
  for (let i = 0; i < smoothSamples.length - 1; i++) {
    const p0 = smoothSamples[i];
    const p1 = smoothSamples[i + 1];
    const pPrev = i === 0 ? p0 : smoothSamples[i - 1];
    const pNext = (i + 2) >= smoothSamples.length ? p1 : smoothSamples[i + 2];

    const cp1x = p0.x + (p1.x - pPrev.x) / 6;
    const cp1y = p0.y + (p1.y - pPrev.y) / 6;
    const cp2x = p1.x - (pNext.x - p0.x) / 6;
    const cp2y = p1.y - (pNext.y - p0.y) / 6;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p1.x, p1.y);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fillStyle = grainPattern;
  ctx.fill();
}

// Main animation loop: update snowflakes and ground, and draw the scene.
function drawSnow() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  // Process and render snowflakes.
  for (let i = 0; i < flakes.length; i++) {
    const flake = flakes[i];
    let xPos = Math.floor(flake.x);
    xPos = Math.max(0, Math.min(xPos, ground.length - 1));

    // If the snowflake reaches the accumulated ground, deposit its mass.
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

drawSnow();