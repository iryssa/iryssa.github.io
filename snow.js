const canvas = document.getElementById('snow');
const ctx = canvas.getContext('2d');

// Set the initial canvas dimensions to fill the window.
let W = canvas.width = window.innerWidth;
let H = canvas.height = window.innerHeight;

// Function to save the ground array (snowpack heights) to localStorage.
function saveGround() {
  try {
    localStorage.setItem('snowpackGround', JSON.stringify(ground));
  } catch (e) {
    console.warn("Could not save snowpack.", e);
  }
}

// Load any stored snowpack data from localStorage.
let ground;
const storedGround = localStorage.getItem('snowpackGround');
if (storedGround) {
  try {
    let loaded = JSON.parse(storedGround);
    // If canvas width changed, reinitialize ground to prevent mismatches.
    if (loaded.length !== W) {
      ground = new Array(W).fill(0);
    } else {
      ground = loaded;
    }
  } catch (e) {
    ground = new Array(W).fill(0);
  }
} else {
  ground = new Array(W).fill(0);
}

// Flag indicating whether new snow has accumulated, triggering a ground update.
let newAccumulation = false;

// Create an offscreen canvas to generate a grain texture for a realistic snow look.
function createGrainPattern() {
  const grainCanvas = document.createElement('canvas');
  grainCanvas.width = 100;
  grainCanvas.height = 100;
  const gctx = grainCanvas.getContext('2d');
  const imageData = gctx.createImageData(grainCanvas.width, grainCanvas.height);
  for (let i = 0; i < imageData.data.length; i += 4) {
    let v = 220 + Math.floor(Math.random() * 36); // Values from 220 to 255.
    imageData.data[i] = v;
    imageData.data[i + 1] = v;
    imageData.data[i + 2] = v;
    imageData.data[i + 3] = 255;
  }
  gctx.putImageData(imageData, 0, 0);
  return ctx.createPattern(grainCanvas, 'repeat');
}
let grainPattern = createGrainPattern();

// Adjust the canvas size when the window is resized.
window.addEventListener('resize', () => {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
  // Reinitialize the ground. (One could also scale old data if needed.)
  ground = new Array(W).fill(0);
  saveGround();
  grainPattern = createGrainPattern();
});

// Configure snowflake properties.
const maxFlakes = 20000;
const flakes = [];

function Snowflake() {
  this.x = Math.random() * W;
  this.y = Math.random() * -H; // Start them above the viewport.
  this.r = Math.random() * 3 + 1; // Radius.
  this.speed = (this.r * 0.5) + Math.random(); // Vertical falling speed.
  this.drift = Math.random() * 0.4 - 0.2; // Horizontal drift.
}
for (let i = 0; i < maxFlakes; i++) {
  flakes.push(new Snowflake());
}

// When a snowflake reaches the ground, deposit its snow into the snowpack.
// It adds directly at the x coordinate and a fraction onto adjacent pixels.
function accumulateSnow(xPos, amount) {
  if (xPos < 0 || xPos >= ground.length) return;
  ground[xPos] += amount;
  if (xPos > 0) ground[xPos - 1] += amount * 0.5;
  if (xPos < ground.length - 1) ground[xPos + 1] += amount * 0.5;
  newAccumulation = true;
}

// Update the snowpack: this function diffuses the snowfall and adjusts steep slopes.
function updateGround() {
  if (!newAccumulation) return;
  const newGround = ground.slice();
  const diffusion = 0.1;
  const noiseAmplitude = 0.5;

  // Adjust each point by averaging it with its neighbors.
  for (let x = 1; x < ground.length - 1; x++) {
    const neighborAvg = (ground[x - 1] + ground[x + 1]) / 2;
    newGround[x] += (neighborAvg - ground[x]) * diffusion;
    newGround[x] += (Math.random() - 0.5) * noiseAmplitude;
  }
  // Copy edges.
  newGround[0] = newGround[1];
  newGround[newGround.length - 1] = newGround[newGround.length - 2];

  // Simulate avalanche collapse when the height difference is too steep.
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
  // Save the new ground state.
  saveGround();
}

// Draw the snowpack using smooth cubic Bézier curves.
// It samples ground heights at intervals and then smooths them.
function drawGround() {
  const samples = [];
  const step = 8; // Sampling interval.
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

  // Implement a simple moving average to smooth sampled points.
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

  // Draw the ground curve with Bézier curves.
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(smoothSamples[0].x, smoothSamples[0].y);
  for (let i = 0; i < smoothSamples.length - 1; i++) {
    const p0 = smoothSamples[i];
    const p1 = smoothSamples[i + 1];
    const pPrev = i === 0 ? p0 : smoothSamples[i - 1];
    const pNext = (i + 2) >= smoothSamples.length ? p1 : smoothSamples[i + 2];
    // Compute two control points.
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

// Main animation loop.
function drawSnow() {
  // Clear the canvas.
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  // Update and draw each snowflake.
  for (let i = 0; i < flakes.length; i++) {
    const flake = flakes[i];
    let xPos = Math.floor(flake.x);
    xPos = Math.max(0, Math.min(xPos, ground.length - 1));

    // If the flake reaches the current snowpack height, deposit its snow.
    if (flake.y + flake.r >= H - ground[xPos]) {
      accumulateSnow(xPos, flake.r * 0.6);
      flakes[i] = new Snowflake(); // Reset the flake.
      continue;
    }

    // Otherwise, continue moving the flake.
    flake.y += flake.speed;
    flake.x += flake.drift;
    if (flake.x > W) flake.x = 0;
    if (flake.x < 0) flake.x = W;

    ctx.beginPath();
    ctx.arc(flake.x, flake.y, flake.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();
  }

  // Update the snowpack and draw it.
  updateGround();
  drawGround();

  // Request the next frame.
  requestAnimationFrame(drawSnow);
}

// Start the animation loop.
drawSnow();