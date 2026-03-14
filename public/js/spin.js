// ========================
// Spin Wheel Logic
// ========================

class SpinWheel {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.spinning = false;
    this.rotation = 0;

    this.segments = [
      { label: '20', value: 20, color: '#1a1a4e' },
      { label: '50', value: 50, color: '#222266' },
      { label: '100', value: 100, color: '#1a1a4e' },
      { label: '200', value: 200, color: '#222266' },
      { label: '500', value: 500, color: '#1a1a4e' },
      { label: '1000', value: 1000, color: '#2a1a4e' }
    ];

    this.resize();
    this.draw();
  }

  resize() {
    const size = this.canvas.parentElement.offsetWidth;
    const displaySize = Math.min(size, 300);
    this.canvas.style.width = displaySize + 'px';
    this.canvas.style.height = displaySize + 'px';
    this.canvas.width = displaySize * 2;
    this.canvas.height = displaySize * 2;
    this.cx = this.canvas.width / 2;
    this.cy = this.canvas.height / 2;
    this.radius = this.cx - 10;
  }

  draw() {
    const ctx = this.ctx;
    const len = this.segments.length;
    const arc = (2 * Math.PI) / len;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.save();
    ctx.translate(this.cx, this.cy);
    ctx.rotate(this.rotation);

    for (let i = 0; i < len; i++) {
      const angle = i * arc;
      const seg = this.segments[i];

      // Draw segment
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, this.radius, angle, angle + arc);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();

      // Border
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Text
      ctx.save();
      ctx.rotate(angle + arc / 2);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#00ff88';
      ctx.font = `bold ${this.radius / 8}px Orbitron, sans-serif`;
      ctx.fillText(seg.label, this.radius * 0.65, 6);
      ctx.restore();
    }

    // Center circle
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.15, 0, 2 * Math.PI);
    ctx.fillStyle = '#0a0a1a';
    ctx.fill();
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#00ff88';
    ctx.font = `bold ${this.radius / 10}px Orbitron`;
    ctx.textAlign = 'center';
    ctx.fillText('SPIN', 0, 5);

    ctx.restore();
  }

  async spin(reward) {
    if (this.spinning) return;
    this.spinning = true;

    // Find the segment index for the reward
    const segIndex = this.segments.findIndex(s => s.value === reward);
    const len = this.segments.length;
    const arc = (2 * Math.PI) / len;

    // Calculate target angle (pointer is at top = -PI/2)
    // We want the winning segment under the pointer
    const segCenter = segIndex * arc + arc / 2;
    const targetAngle = -segCenter - Math.PI / 2;
    const fullSpins = 5 + Math.random() * 3;
    const totalRotation = fullSpins * 2 * Math.PI + targetAngle - this.rotation;

    const duration = 4000;
    const start = performance.now();
    const startRotation = this.rotation;

    return new Promise(resolve => {
      const animate = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        this.rotation = startRotation + totalRotation * eased;

        this.draw();

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          this.spinning = false;
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }
}
