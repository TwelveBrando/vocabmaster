import React, { useEffect, useRef } from 'react';
import type { UITheme } from '../types';

interface BackgroundCanvasProps {
  theme: UITheme;
}

interface BrushPoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

interface QuantumNode {
  x: number;
  y: number;
  originX: number;
  originY: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  energy: number;
}

interface SakuraPetal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;
  spinSpeed: number;
  flip: number;
  flipSpeed: number;
  color: string;
  alpha: number;
}

interface EmberBoid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  trail: { x: number; y: number }[];
}

interface LightningArc {
  points: { x: number; y: number }[];
  life: number;
  maxLife: number;
  color: string;
}

interface PrismShard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;
  spinSpeed: number;
  color: string;
  alpha: number;
}

interface MatrixColumn {
  x: number;
  y: number;
  speed: number;
  chars: string[];
}

interface Snowflake {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;
  spinSpeed: number;
  alpha: number;
}

interface SkyLantern {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  swaySpeed: number;
  swayPhase: number;
  color: string;
  alpha: number;
}

interface DataPacket {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number;
  speed: number;
  color: string;
  size: number;
}

export const BackgroundCanvas: React.FC<BackgroundCanvasProps> = ({ theme }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Mouse Tracking State
    let mouseX = width / 2;
    let mouseY = height / 2;
    let prevMouseX = mouseX;
    let prevMouseY = mouseY;
    let mouseVx = 0;
    let mouseVy = 0;
    let isMouseDown = false;
    let clickShockwave = 0;
    let shockwaveX = width / 2;
    let shockwaveY = height / 2;

    // Collections
    const brushStrokes: BrushPoint[] = [];
    const lightnings: LightningArc[] = [];

    // 1. Quantum Nodes
    const quantumNodes: QuantumNode[] = [];
    for (let i = 0; i < 110; i++) {
      const qx = Math.random() * width;
      const qy = Math.random() * height;
      quantumNodes.push({
        x: qx,
        y: qy,
        originX: qx,
        originY: qy,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        size: Math.random() * 3 + 2,
        color: Math.random() > 0.5 ? '#38bdf8' : Math.random() > 0.3 ? '#818cf8' : '#34d399',
        energy: Math.random(),
      });
    }

    // 2. Sakura Petals
    const sakuraPetals: SakuraPetal[] = [];
    const petalColors = ['#fbcfe8', '#f472b6', '#fda4af', '#fecdd3', '#ffffff'];
    for (let i = 0; i < 65; i++) {
      sakuraPetals.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: Math.random() * 1.5 + 0.8,
        vy: Math.random() * 1.2 + 0.6,
        size: Math.random() * 7 + 7,
        angle: Math.random() * Math.PI * 2,
        spinSpeed: (Math.random() - 0.5) * 0.04,
        flip: Math.random(),
        flipSpeed: Math.random() * 0.05 + 0.02,
        color: petalColors[Math.floor(Math.random() * petalColors.length)],
        alpha: Math.random() * 0.4 + 0.6,
      });
    }

    // 3. Golden Ember Boids
    const emberBoids: EmberBoid[] = [];
    const emberColors = ['#fbbf24', '#f59e0b', '#fb923c', '#ea580c', '#fffbeb'];
    for (let i = 0; i < 85; i++) {
      emberBoids.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        size: Math.random() * 3.5 + 1.5,
        color: emberColors[Math.floor(Math.random() * emberColors.length)],
        alpha: Math.random() * 0.6 + 0.4,
        trail: [],
      });
    }

    // 4. Prism Shards (for Frosted Glass / Prism Violet)
    const prismShards: PrismShard[] = [];
    const prismColors = ['#c084fc', '#e879f9', '#38bdf8', '#818cf8', '#f472b6'];
    for (let i = 0; i < 40; i++) {
      prismShards.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2,
        size: Math.random() * 18 + 12,
        angle: Math.random() * Math.PI * 2,
        spinSpeed: (Math.random() - 0.5) * 0.03,
        color: prismColors[Math.floor(Math.random() * prismColors.length)],
        alpha: Math.random() * 0.5 + 0.4,
      });
    }

    // 5. Matrix Rain Columns (for Emerald Synth / Matrix)
    const matrixColumns: MatrixColumn[] = [];
    const matrixChars = '0123456789ABCDEF01アイウエオカキクケコサシスセソタチツテト';
    const colCount = Math.floor(width / 22);
    for (let i = 0; i < colCount; i++) {
      const chars = [];
      const len = Math.floor(Math.random() * 15 + 10);
      for (let c = 0; c < len; c++) {
        chars.push(matrixChars[Math.floor(Math.random() * matrixChars.length)]);
      }
      matrixColumns.push({
        x: i * 22,
        y: Math.random() * height,
        speed: Math.random() * 3 + 2,
        chars,
      });
    }

    // 6. Snowflakes (for Nordic Paper / Nordic Clean)
    const snowflakes: Snowflake[] = [];
    for (let i = 0; i < 70; i++) {
      snowflakes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: Math.random() * 1.2 + 0.7,
        size: Math.random() * 5 + 3,
        angle: Math.random() * Math.PI * 2,
        spinSpeed: (Math.random() - 0.5) * 0.03,
        alpha: Math.random() * 0.5 + 0.5,
      });
    }

    // 7. Sky Lanterns (for Sakura Sunset / Tokyo Blossom)
    const skyLanterns: SkyLantern[] = [];
    const lanternColors = ['#f43f5e', '#fb7185', '#f97316', '#fbbf24', '#e11d48'];
    for (let i = 0; i < 35; i++) {
      skyLanterns.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -(Math.random() * 0.8 + 0.5),
        size: Math.random() * 16 + 14,
        swaySpeed: Math.random() * 0.03 + 0.015,
        swayPhase: Math.random() * Math.PI * 2,
        color: lanternColors[Math.floor(Math.random() * lanternColors.length)],
        alpha: Math.random() * 0.4 + 0.6,
      });
    }

    // 8. Cyber Data Packets (for Cyber Oasis / Cyber Neo)
    const dataPackets: DataPacket[] = [];
    for (let i = 0; i < 45; i++) {
      const startX = Math.random() * width;
      const startY = Math.random() * height;
      dataPackets.push({
        x: startX,
        y: startY,
        targetX: Math.random() * width,
        targetY: Math.random() * height,
        progress: Math.random(),
        speed: Math.random() * 0.015 + 0.008,
        color: Math.random() > 0.4 ? '#00f5ff' : '#38bdf8',
        size: Math.random() * 3 + 2,
      });
    }

    // Lightning Generator
    const spawnLightning = (x1: number, y1: number, x2: number, y2: number, color: string) => {
      const points = [{ x: x1, y: y1 }];
      const dist = Math.hypot(x2 - x1, y2 - y1);
      const segments = Math.max(4, Math.floor(dist / 30));
      for (let i = 1; i < segments; i++) {
        const t = i / segments;
        const bx = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 45;
        const by = y1 + (y2 - y1) * t + (Math.random() - 0.5) * 45;
        points.push({ x: bx, y: by });
      }
      points.push({ x: x2, y: y2 });
      lightnings.push({ points, life: 1, maxLife: 15, color });
    };

    const handleMouseMove = (e: MouseEvent) => {
      prevMouseX = mouseX;
      prevMouseY = mouseY;
      mouseX = e.clientX;
      mouseY = e.clientY;
      mouseVx = mouseX - prevMouseX;
      mouseVy = mouseY - prevMouseY;
      const speed = Math.hypot(mouseVx, mouseVy);

      // Neon Brush
      if (theme === 'neon_brush' && isMouseDown) {
        const colors = ['#00f5ff', '#ff007f', '#a855f7', '#39ff14', '#ffd700', '#ff0055'];
        const dist = Math.hypot(mouseX - prevMouseX, mouseY - prevMouseY);
        const steps = Math.max(1, Math.min(10, Math.floor(dist / 3.5)));
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          brushStrokes.push({
            x: prevMouseX + (mouseX - prevMouseX) * t,
            y: prevMouseY + (mouseY - prevMouseY) * t,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() * 9 + 6,
            alpha: 1,
            life: 1,
            maxLife: 120,
          });
        }
      }

      // Cyber Vortex Lightning
      if (theme === 'cyber_vortex' && speed > 22 && Math.random() < 0.35) {
        const targetX = mouseX + (Math.random() - 0.5) * 250;
        const targetY = mouseY + (Math.random() - 0.5) * 250;
        spawnLightning(mouseX, mouseY, targetX, targetY, Math.random() > 0.5 ? '#00f5ff' : '#a855f7');
      }

      // Sakura Petals Wind
      if (theme === 'sakura_petals' && speed > 5) {
        for (const p of sakuraPetals) {
          const d = Math.hypot(mouseX - p.x, mouseY - p.y);
          if (d < 140) {
            p.vx += (mouseVx * 0.15) * (1 - d / 140);
            p.vy += (mouseVy * 0.15) * (1 - d / 140);
          }
        }
      }

      // Nordic Snowflakes Wind
      if (theme === 'nordic_paper' && speed > 4) {
        for (const s of snowflakes) {
          const d = Math.hypot(mouseX - s.x, mouseY - s.y);
          if (d < 150) {
            s.vx += (mouseVx * 0.2) * (1 - d / 150);
            s.vy += (mouseVy * 0.2) * (1 - d / 150);
          }
        }
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      isMouseDown = true;
      mouseX = e.clientX;
      mouseY = e.clientY;
      shockwaveX = mouseX;
      shockwaveY = mouseY;
      clickShockwave = 1;

      // Neon Brush
      if (theme === 'neon_brush') {
        const colors = ['#00f5ff', '#ff007f', '#a855f7', '#39ff14', '#ffd700'];
        brushStrokes.push({
          x: mouseX,
          y: mouseY,
          vx: 0,
          vy: 0,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 16,
          alpha: 1,
          life: 1,
          maxLife: 130,
        });
      }

      // Quantum Matrix Shockwave
      if (theme === 'quantum_matrix') {
        for (const node of quantumNodes) {
          const dx = node.x - mouseX;
          const dy = node.y - mouseY;
          const dist = Math.hypot(dx, dy) || 1;
          if (dist < 300) {
            const push = (1 - dist / 300) * 20;
            node.vx += (dx / dist) * push;
            node.vy += (dy / dist) * push;
          }
        }
      }

      // Cyber Vortex Burst
      if (theme === 'cyber_vortex') {
        for (let i = 0; i < 5; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.random() * 200 + 100;
          spawnLightning(mouseX, mouseY, mouseX + Math.cos(angle) * dist, mouseY + Math.sin(angle) * dist, '#38bdf8');
        }
      }

      // Golden Ember Scatter
      if (theme === 'golden_ember' || theme === 'bento_luxury') {
        for (const b of emberBoids) {
          const dx = b.x - mouseX;
          const dy = b.y - mouseY;
          const dist = Math.hypot(dx, dy) || 1;
          const force = Math.max(5, 300 / dist);
          b.vx += (dx / dist) * force;
          b.vy += (dy / dist) * force;
        }
      }

      // Prism Shards Scatter
      if (theme === 'frosted_glass') {
        for (const p of prismShards) {
          const dx = p.x - mouseX;
          const dy = p.y - mouseY;
          const dist = Math.hypot(dx, dy) || 1;
          if (dist < 300) {
            p.vx += (dx / dist) * 12;
            p.vy += (dy / dist) * 12;
            p.spinSpeed += (Math.random() - 0.5) * 0.2;
          }
        }
      }
    };

    const handleMouseUp = () => {
      isMouseDown = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    let frame = 0;

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);

      // =========================================================================
      // 1. NEON BRUSH (PAINTING ON LMB DRAG)
      // =========================================================================
      if (theme === 'neon_brush') {
        const bgGrad = ctx.createRadialGradient(mouseX, mouseY, 40, width / 2, height / 2, Math.max(width, height));
        bgGrad.addColorStop(0, '#0a102a');
        bgGrad.addColorStop(1, '#020308');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = 'rgba(0, 245, 255, 0.04)';
        ctx.lineWidth = 1;
        for (let x = 0; x < width; x += 60) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += 60) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        ctx.globalCompositeOperation = 'lighter';
        for (let i = brushStrokes.length - 1; i >= 0; i--) {
          const p = brushStrokes[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life++;
          p.alpha = Math.max(0, 1 - p.life / p.maxLife);

          if (p.alpha <= 0.01) {
            brushStrokes.splice(i, 1);
            continue;
          }

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha * 0.35;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.7, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = p.alpha * 0.85;
          ctx.fill();

          if (i > 0) {
            const prev = brushStrokes[i - 1];
            const d = Math.hypot(p.x - prev.x, p.y - prev.y);
            if (d < 50) {
              ctx.beginPath();
              ctx.moveTo(prev.x, prev.y);
              ctx.lineTo(p.x, p.y);
              ctx.strokeStyle = p.color;
              ctx.lineWidth = p.size * p.alpha;
              ctx.globalAlpha = p.alpha * 0.7;
              ctx.stroke();
            }
          }
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }

      // =========================================================================
      // 2. QUANTUM MATRIX (MAGNETIC SPRING FORCE FIELD)
      // =========================================================================
      else if (theme === 'quantum_matrix') {
        const qGrad = ctx.createRadialGradient(mouseX, mouseY, 50, width / 2, height / 2, Math.max(width, height));
        qGrad.addColorStop(0, '#071524');
        qGrad.addColorStop(1, '#02060c');
        ctx.fillStyle = qGrad;
        ctx.fillRect(0, 0, width, height);

        for (let i = 0; i < quantumNodes.length; i++) {
          const n = quantumNodes[i];
          const dx = mouseX - n.x;
          const dy = mouseY - n.y;
          const dist = Math.hypot(dx, dy) || 1;

          if (dist < 280) {
            const pull = (1 - dist / 280) * 0.8;
            n.vx += (dx / dist) * pull;
            n.vy += (dy / dist) * pull;
          }

          n.vx += (n.originX - n.x) * 0.01;
          n.vy += (n.originY - n.y) * 0.01;
          n.vx *= 0.94;
          n.vy *= 0.94;
          n.x += n.vx;
          n.y += n.vy;

          ctx.beginPath();
          ctx.arc(n.x, n.y, n.size, 0, Math.PI * 2);
          ctx.fillStyle = n.color;
          ctx.globalAlpha = 0.85;
          ctx.fill();

          if (dist < 200) {
            ctx.beginPath();
            ctx.moveTo(mouseX, mouseY);
            ctx.lineTo(n.x, n.y);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = (1 - dist / 200) * 2;
            ctx.globalAlpha = (1 - dist / 200) * 0.7;
            ctx.stroke();
          }

          for (let j = i + 1; j < quantumNodes.length; j++) {
            const n2 = quantumNodes[j];
            const d = Math.hypot(n.x - n2.x, n.y - n2.y);
            if (d < 110) {
              ctx.beginPath();
              ctx.moveTo(n.x, n.y);
              ctx.lineTo(n2.x, n2.y);
              ctx.strokeStyle = '#818cf8';
              ctx.lineWidth = 0.8;
              ctx.globalAlpha = (1 - d / 110) * 0.35;
              ctx.stroke();
            }
          }
        }
        ctx.globalAlpha = 1;
      }

      // =========================================================================
      // 3. CYBER VORTEX (LIGHTNING & PLASMA VORTEX)
      // =========================================================================
      else if (theme === 'cyber_vortex') {
        const vGrad = ctx.createRadialGradient(mouseX, mouseY, 30, width / 2, height / 2, Math.max(width, height));
        vGrad.addColorStop(0, '#100a26');
        vGrad.addColorStop(1, '#030208');
        ctx.fillStyle = vGrad;
        ctx.fillRect(0, 0, width, height);

        const time = frame * 0.03;
        ctx.save();
        ctx.translate(mouseX, mouseY);
        for (let ring = 1; ring <= 4; ring++) {
          const r = ring * 35;
          ctx.beginPath();
          ctx.arc(0, 0, r, time * ring, time * ring + Math.PI * 1.3);
          ctx.strokeStyle = ring % 2 === 0 ? 'rgba(0, 245, 255, 0.4)' : 'rgba(236, 72, 153, 0.4)';
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        ctx.restore();

        for (let i = lightnings.length - 1; i >= 0; i--) {
          const l = lightnings[i];
          l.life++;
          const alpha = 1 - l.life / l.maxLife;
          if (alpha <= 0) {
            lightnings.splice(i, 1);
            continue;
          }

          ctx.beginPath();
          ctx.moveTo(l.points[0].x, l.points[0].y);
          for (let p = 1; p < l.points.length; p++) {
            ctx.lineTo(l.points[p].x, l.points[p].y);
          }
          ctx.strokeStyle = l.color;
          ctx.lineWidth = 2.5 * alpha;
          ctx.globalAlpha = alpha;
          ctx.shadowBlur = 12;
          ctx.shadowColor = l.color;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1;
      }

      // =========================================================================
      // 4. FROSTED GLASS / PRISM VIOLET (REFRACTING 3D CRYSTALS & LIGHT BEAMS)
      // =========================================================================
      else if (theme === 'frosted_glass') {
        const pGrad = ctx.createRadialGradient(mouseX, mouseY, 40, width / 2, height / 2, Math.max(width, height));
        pGrad.addColorStop(0, '#150a28');
        pGrad.addColorStop(1, '#080410');
        ctx.fillStyle = pGrad;
        ctx.fillRect(0, 0, width, height);

        // Click shockwave
        if (clickShockwave > 0) {
          clickShockwave *= 0.93;
          if (clickShockwave < 0.01) clickShockwave = 0;
          ctx.beginPath();
          ctx.arc(shockwaveX, shockwaveY, (1 - clickShockwave) * 350, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(232, 121, 249, ${clickShockwave * 0.8})`;
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        // Draw refractive light beams from cursor
        for (let b = 0; b < 6; b++) {
          const bAngle = (frame * 0.01) + (b * Math.PI / 3);
          const bLen = 220;
          ctx.beginPath();
          ctx.moveTo(mouseX, mouseY);
          ctx.lineTo(mouseX + Math.cos(bAngle) * bLen, mouseY + Math.sin(bAngle) * bLen);
          ctx.strokeStyle = b % 2 === 0 ? 'rgba(192, 132, 252, 0.25)' : 'rgba(56, 189, 248, 0.25)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Render 3D Prism Shards
        for (const shard of prismShards) {
          shard.x += shard.vx;
          shard.y += shard.vy;
          shard.angle += shard.spinSpeed;

          // Gravitational pull toward mouse
          const dx = mouseX - shard.x;
          const dy = mouseY - shard.y;
          const dist = Math.hypot(dx, dy) || 1;
          if (dist < 260) {
            shard.vx += (dx / dist) * 0.08;
            shard.vy += (dy / dist) * 0.08;
          }
          shard.vx *= 0.98;
          shard.vy *= 0.98;

          if (shard.x < -30) shard.x = width + 30;
          if (shard.x > width + 30) shard.x = -30;
          if (shard.y < -30) shard.y = height + 30;
          if (shard.y > height + 30) shard.y = -30;

          // Faceted glass polygon
          ctx.save();
          ctx.translate(shard.x, shard.y);
          ctx.rotate(shard.angle);

          ctx.beginPath();
          ctx.moveTo(0, -shard.size);
          ctx.lineTo(shard.size * 0.7, 0);
          ctx.lineTo(0, shard.size);
          ctx.lineTo(-shard.size * 0.7, 0);
          ctx.closePath();

          ctx.fillStyle = shard.color;
          ctx.globalAlpha = shard.alpha * 0.35;
          ctx.fill();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2;
          ctx.globalAlpha = shard.alpha * 0.7;
          ctx.stroke();
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }

      // =========================================================================
      // 5. BENTO LUXURY / OBSIDIAN GOLD (LIQUID GOLD & SACRED GEOMETRY)
      // =========================================================================
      else if (theme === 'bento_luxury') {
        const bGrad = ctx.createRadialGradient(mouseX, mouseY, 50, width / 2, height / 2, Math.max(width, height));
        bGrad.addColorStop(0, '#1a1405');
        bGrad.addColorStop(1, '#08080a');
        ctx.fillStyle = bGrad;
        ctx.fillRect(0, 0, width, height);

        // Sacred geometry rings rotating under mouse
        const time = frame * 0.02;
        ctx.save();
        ctx.translate(mouseX, mouseY);
        for (let r = 1; r <= 3; r++) {
          const radius = r * 45;
          ctx.beginPath();
          ctx.arc(0, 0, radius, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.25)';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Rotating gold diamond markers
          const dAngle = time * (r % 2 === 0 ? 1 : -1);
          ctx.save();
          ctx.rotate(dAngle);
          ctx.strokeRect(-radius * 0.7, -radius * 0.7, radius * 1.4, radius * 1.4);
          ctx.restore();
        }
        ctx.restore();

        // Liquid gold particle swarm
        for (const b of emberBoids) {
          const dx = mouseX - b.x;
          const dy = mouseY - b.y;
          const dist = Math.hypot(dx, dy) || 1;

          if (dist > 30) {
            b.vx += (dx / dist) * 0.22;
            b.vy += (dy / dist) * 0.22;
          }
          b.vx *= 0.96;
          b.vy *= 0.96;
          b.x += b.vx;
          b.y += b.vy;

          ctx.beginPath();
          ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
          ctx.fillStyle = '#f59e0b';
          ctx.globalAlpha = b.alpha * 0.8;
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#fbbf24';
          ctx.fill();
          ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1;
      }

      // =========================================================================
      // 6. EMERALD SYNTH / MATRIX (MATRIX RAIN & CYBER HEXAGON SHIELD)
      // =========================================================================
      else if (theme === 'emerald_synth') {
        ctx.fillStyle = 'rgba(3, 10, 7, 0.35)';
        ctx.fillRect(0, 0, width, height);

        // Falling digital matrix rain
        ctx.font = '13px monospace';
        for (const col of matrixColumns) {
          col.y += col.speed;
          if (col.y > height + 200) col.y = -50;

          for (let i = 0; i < col.chars.length; i++) {
            const cy = col.y - i * 16;
            if (cy > 0 && cy < height) {
              const distToMouse = Math.hypot(mouseX - col.x, mouseY - cy);
              if (distToMouse < 140) {
                ctx.fillStyle = '#ffffff';
                ctx.globalAlpha = 0.95;
              } else if (i === 0) {
                ctx.fillStyle = '#a7f3d0';
                ctx.globalAlpha = 0.9;
              } else {
                ctx.fillStyle = '#10b981';
                ctx.globalAlpha = Math.max(0.1, 1 - i / col.chars.length);
              }
              ctx.fillText(col.chars[i], col.x, cy);
            }
          }
        }

        // Cyber Hexagon Shield under cursor
        const hTime = frame * 0.02;
        ctx.save();
        ctx.translate(mouseX, mouseY);
        for (let hex = 1; hex <= 3; hex++) {
          const hRadius = hex * 40;
          ctx.beginPath();
          for (let a = 0; a < 6; a++) {
            const hAngle = hTime * (hex % 2 === 0 ? 1 : -1) + (a * Math.PI / 3);
            const hx = Math.cos(hAngle) * hRadius;
            const hy = Math.sin(hAngle) * hRadius;
            if (a === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
          }
          ctx.closePath();
          ctx.strokeStyle = hex === 1 ? '#34d399' : 'rgba(52, 211, 153, 0.35)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        ctx.restore();
        ctx.globalAlpha = 1;
      }

      // =========================================================================
      // 7. NORDIC PAPER / NORDIC CLEAN (ICE CRYSTAL BLIZZARD & WIND SWIRL)
      // =========================================================================
      else if (theme === 'nordic_paper') {
        ctx.fillStyle = '#f4f6fa';
        ctx.fillRect(0, 0, width, height);

        // Wind swirl lines around cursor
        for (let w = 0; w < 4; w++) {
          const wAngle = (frame * 0.03) + (w * Math.PI / 2);
          const wRad = 70 + Math.sin(frame * 0.05 + w) * 20;
          ctx.beginPath();
          ctx.arc(mouseX, mouseY, wRad, wAngle, wAngle + Math.PI * 0.8);
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Falling detailed ice crystal snowflakes
        for (const s of snowflakes) {
          s.x += s.vx;
          s.y += s.vy;
          s.angle += s.spinSpeed;

          if (s.y > height + 20) {
            s.y = -20;
            s.x = Math.random() * width;
          }
          if (s.x > width + 20) s.x = -20;
          if (s.x < -20) s.x = width + 20;

          ctx.save();
          ctx.translate(s.x, s.y);
          ctx.rotate(s.angle);

          // 6-pointed snowflake
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = s.alpha * 0.75;

          for (let arm = 0; arm < 6; arm++) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -s.size);
            // sub branch
            ctx.moveTo(0, -s.size * 0.5);
            ctx.lineTo(s.size * 0.3, -s.size * 0.7);
            ctx.moveTo(0, -s.size * 0.5);
            ctx.lineTo(-s.size * 0.3, -s.size * 0.7);
            ctx.stroke();
            ctx.rotate(Math.PI / 3);
          }
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }

      // =========================================================================
      // 8. SAKURA SUNSET / TOKYO BLOSSOM (WARM SKY LANTERNS & EVENING SPARKS)
      // =========================================================================
      else if (theme === 'sakura_sunset') {
        const sGrad = ctx.createLinearGradient(0, 0, 0, height);
        sGrad.addColorStop(0, '#fef2f2');
        sGrad.addColorStop(0.5, '#fff1f2');
        sGrad.addColorStop(1, '#ffe4e6');
        ctx.fillStyle = sGrad;
        ctx.fillRect(0, 0, width, height);

        // Warm cursor glow aura
        const aGrad = ctx.createRadialGradient(mouseX, mouseY, 10, mouseX, mouseY, 180);
        aGrad.addColorStop(0, 'rgba(251, 113, 133, 0.25)');
        aGrad.addColorStop(1, 'rgba(251, 113, 133, 0)');
        ctx.fillStyle = aGrad;
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, 180, 0, Math.PI * 2);
        ctx.fill();

        // Rising Japanese paper sky lanterns
        for (const lan of skyLanterns) {
          lan.swayPhase += lan.swaySpeed;
          lan.x += lan.vx + Math.sin(lan.swayPhase) * 0.7;
          lan.y += lan.vy;

          // Magnetic attraction to cursor
          const dx = mouseX - lan.x;
          const dy = mouseY - lan.y;
          const dist = Math.hypot(dx, dy) || 1;
          if (dist < 220) {
            lan.vx += (dx / dist) * 0.05;
          }
          lan.vx *= 0.97;

          if (lan.y < -40) {
            lan.y = height + 40;
            lan.x = Math.random() * width;
          }

          ctx.save();
          ctx.translate(lan.x, lan.y);

          // Lantern glow aura
          ctx.beginPath();
          ctx.arc(0, 0, lan.size * 1.5, 0, Math.PI * 2);
          ctx.fillStyle = lan.color;
          ctx.globalAlpha = lan.alpha * 0.3;
          ctx.fill();

          // Lantern body
          ctx.beginPath();
          ctx.roundRect(-lan.size * 0.6, -lan.size * 0.8, lan.size * 1.2, lan.size * 1.6, 6);
          ctx.fillStyle = lan.color;
          ctx.globalAlpha = lan.alpha * 0.85;
          ctx.fill();

          // Inner warm candle light
          ctx.beginPath();
          ctx.arc(0, lan.size * 0.3, lan.size * 0.35, 0, Math.PI * 2);
          ctx.fillStyle = '#fffbeb';
          ctx.globalAlpha = lan.alpha;
          ctx.fill();
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }

      // =========================================================================
      // 9. CYBER OASIS / CYBER NEO (HYPER-SPEED NEON HIGHWAYS & CIRCUIT TRACERS)
      // =========================================================================
      else if (theme === 'cyber_oasis') {
        const cGrad = ctx.createRadialGradient(mouseX, mouseY, 40, width / 2, height / 2, Math.max(width, height));
        cGrad.addColorStop(0, '#0a1628');
        cGrad.addColorStop(1, '#040812');
        ctx.fillStyle = cGrad;
        ctx.fillRect(0, 0, width, height);

        // Dynamic circuit grid bending toward mouse
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.12)';
        ctx.lineWidth = 1;
        const gStep = 70;
        for (let x = 0; x < width; x += gStep) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          const bendX = x + (mouseX - x) * 0.1;
          ctx.quadraticCurveTo(bendX, mouseY, x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += gStep) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          const bendY = y + (mouseY - y) * 0.1;
          ctx.quadraticCurveTo(mouseX, bendY, width, y);
          ctx.stroke();
        }

        // High-speed neon tracer data packets
        for (const dp of dataPackets) {
          dp.progress += dp.speed;
          if (dp.progress >= 1) {
            dp.progress = 0;
            dp.x = dp.targetX;
            dp.y = dp.targetY;
            // Next target close to mouse or random
            if (Math.random() < 0.4) {
              dp.targetX = mouseX + (Math.random() - 0.5) * 200;
              dp.targetY = mouseY + (Math.random() - 0.5) * 200;
            } else {
              dp.targetX = Math.random() * width;
              dp.targetY = Math.random() * height;
            }
          }

          const curX = dp.x + (dp.targetX - dp.x) * dp.progress;
          const curY = dp.y + (dp.targetY - dp.y) * dp.progress;

          ctx.beginPath();
          ctx.arc(curX, curY, dp.size * 2, 0, Math.PI * 2);
          ctx.fillStyle = dp.color;
          ctx.globalAlpha = 0.35;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(curX, curY, dp.size * 0.8, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = 0.9;
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // =========================================================================
      // 10. SAKURA PETALS
      // =========================================================================
      else if (theme === 'sakura_petals') {
        for (const p of sakuraPetals) {
          p.x += p.vx;
          p.y += p.vy;
          p.angle += p.spinSpeed;
          p.flip += p.flipSpeed;

          if (p.x > width + 20) p.x = -20;
          if (p.y > height + 20) p.y = -20;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          ctx.scale(Math.cos(p.flip), 1);

          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.shadowBlur = 4;
          ctx.shadowColor = 'rgba(244, 114, 182, 0.4)';
          ctx.fill();
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }

      // =========================================================================
      // 11. GOLDEN EMBER
      // =========================================================================
      else if (theme === 'golden_ember') {
        const eGrad = ctx.createRadialGradient(mouseX, mouseY, 40, width / 2, height / 2, Math.max(width, height));
        eGrad.addColorStop(0, '#1c1005');
        eGrad.addColorStop(1, '#080401');
        ctx.fillStyle = eGrad;
        ctx.fillRect(0, 0, width, height);

        for (const b of emberBoids) {
          const dx = mouseX - b.x;
          const dy = mouseY - b.y;
          const dist = Math.hypot(dx, dy) || 1;

          if (dist > 40) {
            b.vx += (dx / dist) * 0.18;
            b.vy += (dy / dist) * 0.18;
          }
          b.vx += (Math.random() - 0.5) * 0.4;
          b.vy += (Math.random() - 0.5) * 0.4;
          b.vx *= 0.96;
          b.vy *= 0.96;
          b.x += b.vx;
          b.y += b.vy;

          ctx.beginPath();
          ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
          ctx.fillStyle = b.color;
          ctx.globalAlpha = b.alpha;
          ctx.shadowBlur = 10;
          ctx.shadowColor = b.color;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1;
      }

      // =========================================================================
      // 12. COSMIC NEBULA
      // =========================================================================
      else if (theme === 'cosmic_nebula') {
        const nebGrad1 = ctx.createRadialGradient(width * 0.3 + Math.sin(frame * 0.005) * 80, height * 0.4, 40, width * 0.3, height * 0.4, width * 0.6);
        nebGrad1.addColorStop(0, 'rgba(120, 50, 220, 0.15)');
        nebGrad1.addColorStop(1, 'rgba(3, 4, 15, 0)');
        ctx.fillStyle = nebGrad1;
        ctx.fillRect(0, 0, width, height);

        if (clickShockwave > 0) {
          clickShockwave *= 0.94;
          if (clickShockwave < 0.01) clickShockwave = 0;
          ctx.beginPath();
          ctx.arc(shockwaveX, shockwaveY, (1 - clickShockwave) * 320, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(168, 85, 247, ${clickShockwave * 0.8})`;
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        for (let i = 0; i < quantumNodes.length; i++) {
          const s = quantumNodes[i];
          s.x += s.vx * 0.5;
          s.y += s.vy * 0.5;

          if (s.x < 0) s.x = width;
          if (s.x > width) s.x = 0;
          if (s.y < 0) s.y = height;
          if (s.y > height) s.y = 0;

          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.fillStyle = s.color;
          ctx.globalAlpha = 0.8;
          ctx.fill();

          const distToMouse = Math.hypot(mouseX - s.x, mouseY - s.y);
          if (distToMouse < 180) {
            ctx.beginPath();
            ctx.moveTo(mouseX, mouseY);
            ctx.lineTo(s.x, s.y);
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = (1 - distToMouse / 180) * 1.5;
            ctx.globalAlpha = (1 - distToMouse / 180) * 0.6;
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
      }

      // =========================================================================
      // 13. AURORA BOREALIS
      // =========================================================================
      else if (theme === 'aurora_borealis') {
        const time = frame * 0.018;
        const mouseNormX = (mouseX / width - 0.5) * 2;

        const auroraLayers = [
          { color: 'rgba(52, 211, 153, 0.16)', yOffset: 0.35, freq: 0.003, amp: 80 },
          { color: 'rgba(6, 182, 212, 0.14)', yOffset: 0.45, freq: 0.004, amp: 95 },
          { color: 'rgba(168, 85, 247, 0.12)', yOffset: 0.55, freq: 0.0025, amp: 110 },
        ];

        for (const layer of auroraLayers) {
          ctx.beginPath();
          ctx.moveTo(0, height);
          for (let x = 0; x <= width; x += 15) {
            const wave1 = Math.sin(x * layer.freq + time + mouseNormX * 0.6) * layer.amp;
            const wave2 = Math.cos(x * layer.freq * 0.5 - time * 0.8) * (layer.amp * 0.6);
            const y = height * layer.yOffset + wave1 + wave2;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(width, height);
          ctx.closePath();

          const grad = ctx.createLinearGradient(0, height * layer.yOffset - 60, 0, height);
          grad.addColorStop(0, layer.color);
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = grad;
          ctx.fill();
        }
      }

      // =========================================================================
      // 14. RETRO SYNTHWAVE
      // =========================================================================
      else if (theme === 'retro_synthwave') {
        const horizonY = height * 0.55;
        const sunRadius = 90;
        const sunX = width / 2;
        const sunY = horizonY - 10;
        const sunGrad = ctx.createLinearGradient(sunX, sunY - sunRadius, sunX, sunY + sunRadius);
        sunGrad.addColorStop(0, '#fde047');
        sunGrad.addColorStop(0.5, '#f43f5e');
        sunGrad.addColorStop(1, '#a855f7');

        ctx.beginPath();
        ctx.arc(sunX, sunY, sunRadius, 0, Math.PI, true);
        ctx.fillStyle = sunGrad;
        ctx.fill();

        ctx.fillStyle = '#0a0714';
        for (let i = 0; i < 7; i++) {
          const cutY = sunY - sunRadius * 0.6 + i * 11;
          const cutH = i * 1.5 + 2;
          ctx.fillRect(sunX - sunRadius - 10, cutY, (sunRadius + 10) * 2, cutH);
        }

        const gridOffset = (frame * 1.4) % 40;
        ctx.strokeStyle = 'rgba(236, 72, 153, 0.35)';
        ctx.lineWidth = 1.2;

        for (let y = horizonY; y < height; y += (y - horizonY) * 0.25 + 8) {
          const lineY = y + (gridOffset * (y - horizonY)) / height;
          if (lineY > horizonY && lineY < height) {
            ctx.beginPath();
            ctx.moveTo(0, lineY);
            ctx.lineTo(width, lineY);
            ctx.stroke();
          }
        }

        const vanishX = width / 2 + (mouseX - width / 2) * 0.2;
        for (let x = -width * 0.5; x <= width * 1.5; x += 80) {
          ctx.beginPath();
          ctx.moveTo(vanishX, horizonY);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
      }

      animFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-auto z-0"
      style={{
        cursor: theme === 'neon_brush' ? 'crosshair' : 'default',
      }}
    />
  );
};
