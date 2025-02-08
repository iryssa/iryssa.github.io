class ParticleSystem {
  constructor() {
    this.canvas = document.getElementById('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.animationFrameId = null;
    this.devicePixelRatio = window.devicePixelRatio || 1;

    this.init();
  }

  init() {
    this.setCanvasSize();
    this.createParticles(100);
    this.bindEvents();
    this.animate();
  }

  setCanvasSize() {
    const {
      innerWidth,
      innerHeight
    } = window;
    this.canvas.width = innerWidth * this.devicePixelRatio;
    this.canvas.height = innerHeight * this.devicePixelRatio;
    this.ctx.scale(this.devicePixelRatio, this.devicePixelRatio);
  }

  createParticles(count) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * innerWidth,
        y: Math.random() * -innerHeight,
        speed: Math.random() * 1 + 1,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.5
      });
    }
  }

  updateParticles() {
    const {
      innerWidth,
      innerHeight
    } = window;
    this.particles.forEach(p => {
      p.y += p.speed;
      if (p.y > innerHeight + 100) {
        p.x = Math.random() * innerWidth;
        p.y = -p.size;
      }
    });
  }

  drawParticles() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.particles.forEach(p => {
      this.ctx.beginPath();
      this.ctx.arc(p.x * this.devicePixelRatio,
        p.y * this.devicePixelRatio,
        p.size * this.devicePixelRatio,
        0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
      this.ctx.fill();
    });
  }

  animate() {
    this.updateParticles();
    this.drawParticles();
    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.setCanvasSize();
      this.particles = [];
      this.createParticles(100);
    });
  }
}

const particleSystem = new ParticleSystem();

const aboutButton = document.querySelector("button.navigation#about");
const aboutSection = document.querySelector("div.section#about");
const returnButton = aboutSection.querySelector("button.return");

aboutButton.addEventListener("click", function () {
  aboutSection.classList.add("active");
});

returnButton.addEventListener("click", function () {
  aboutSection.classList.remove("active");
});