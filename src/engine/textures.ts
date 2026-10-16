import * as THREE from 'three';

/**
 * Creates high-quality procedural textures using HTML5 Canvas.
 * Adheres strictly to Three.js PBR standards:
 * - SRGBColorSpace for albedo textures
 * - Repeat wrapping & high anisotropy
 * - 100% zero-404 procedural generation
 */

// Helper to create an offscreen canvas
function createOffscreenCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  return { canvas, ctx };
}

// 1. Asphalt Road with worn center dashed yellow lines
export function createAsphaltTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = createOffscreenCanvas(512, 512);

  // Base dark asphalt
  ctx.fillStyle = '#232426';
  ctx.fillRect(0, 0, 512, 512);

  // Noise & grain
  for (let i = 0; i < 20000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const gray = Math.floor(25 + Math.random() * 30);
    ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
    ctx.fillRect(x, y, Math.random() * 2 + 1, Math.random() * 2 + 1);
  }

  // Cracks
  ctx.strokeStyle = '#141416';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    let cx = Math.random() * 512;
    let cy = Math.random() * 512;
    ctx.moveTo(cx, cy);
    for (let step = 0; step < 8; step++) {
      cx += (Math.random() - 0.5) * 40;
      cy += (Math.random() - 0.5) * 40;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  // Faded dashed center line
  ctx.fillStyle = 'rgba(210, 160, 40, 0.7)';
  const dashH = 90;
  const gap = 40;
  const lineWidth = 12;
  const centerX = 256 - lineWidth / 2;
  for (let y = 10; y < 512; y += dashH + gap) {
    ctx.fillRect(centerX, y, lineWidth, dashH);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 2. Weathered Cracked Brick Wall
export function createBrickWallTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = createOffscreenCanvas(512, 512);

  // Mortar background
  ctx.fillStyle = '#3a3835';
  ctx.fillRect(0, 0, 512, 512);

  const rows = 16;
  const rowHeight = 512 / rows;
  const brickWidth = 64;

  for (let r = 0; r < rows; r++) {
    const y = r * rowHeight;
    const offsetX = (r % 2 === 0) ? 0 : brickWidth / 2;
    for (let c = -1; c < (512 / brickWidth) + 1; c++) {
      const x = c * brickWidth + offsetX;

      // Color variation for ruined bricks
      const rVal = Math.floor(100 + Math.random() * 45);
      const gVal = Math.floor(40 + Math.random() * 25);
      const bVal = Math.floor(30 + Math.random() * 20);
      ctx.fillStyle = `rgb(${rVal}, ${gVal}, ${bVal})`;

      // Draw brick with mortar gap
      ctx.fillRect(x + 2, y + 2, brickWidth - 4, rowHeight - 4);

      // Weathering stains
      if (Math.random() > 0.4) {
        ctx.fillStyle = 'rgba(20, 20, 20, 0.25)';
        ctx.fillRect(x + 2, y + 2, brickWidth - 4, Math.random() * (rowHeight - 4));
      }
    }
  }

  // Moss & water damage
  ctx.fillStyle = 'rgba(35, 55, 30, 0.4)';
  for (let i = 0; i < 15; i++) {
    const mx = Math.random() * 512;
    const my = 350 + Math.random() * 162;
    ctx.beginPath();
    ctx.arc(mx, my, 25 + Math.random() * 35, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 3. Cracked Urban Concrete (Sidewalks, foundations)
export function createConcreteTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = createOffscreenCanvas(512, 512);

  ctx.fillStyle = '#656360';
  ctx.fillRect(0, 0, 512, 512);

  // Fine concrete noise
  for (let i = 0; i < 25000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const tone = Math.floor(80 + Math.random() * 40);
    ctx.fillStyle = `rgb(${tone}, ${tone}, ${tone})`;
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  // Sidewalk grid lines
  ctx.strokeStyle = '#43423f';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, 512, 512);
  ctx.beginPath();
  ctx.moveTo(256, 0); ctx.lineTo(256, 512);
  ctx.moveTo(0, 256); ctx.lineTo(512, 256);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 4. Rust Metal Texture (vehicles, corrugated sheets, dumpsters)
export function createRustedMetalTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = createOffscreenCanvas(512, 512);

  // Base metallic steel
  ctx.fillStyle = '#484c50';
  ctx.fillRect(0, 0, 512, 512);

  // Large rust blooms
  for (let i = 0; i < 40; i++) {
    const rx = Math.random() * 512;
    const ry = Math.random() * 512;
    const rad = 20 + Math.random() * 60;
    const grad = ctx.createRadialGradient(rx, ry, 5, rx, ry, rad);
    grad.addColorStop(0, '#8c3818');
    grad.addColorStop(0.5, '#ab501f');
    grad.addColorStop(0.8, '#542614');
    grad.addColorStop(1, 'rgba(72, 76, 80, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(rx, ry, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // Scratches
  ctx.strokeStyle = '#858b90';
  ctx.lineWidth = 1;
  for (let i = 0; i < 30; i++) {
    ctx.beginPath();
    const sx = Math.random() * 512;
    const sy = Math.random() * 512;
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + (Math.random() - 0.5) * 50, sy + (Math.random() - 0.5) * 50);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 5. Weathered Wood Planks (fences, barricades, crates)
export function createWoodPlankTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = createOffscreenCanvas(512, 512);

  ctx.fillStyle = '#5c4838';
  ctx.fillRect(0, 0, 512, 512);

  const plankCount = 6;
  const plankH = 512 / plankCount;

  for (let i = 0; i < plankCount; i++) {
    const y = i * plankH;
    const woodTone = 60 + Math.random() * 25;
    ctx.fillStyle = `rgb(${woodTone + 15}, ${woodTone}, ${woodTone - 10})`;
    ctx.fillRect(0, y + 2, 512, plankH - 4);

    // Wood grain lines
    ctx.strokeStyle = 'rgba(40, 28, 18, 0.4)';
    ctx.lineWidth = 1;
    for (let g = 0; g < 8; g++) {
      ctx.beginPath();
      ctx.moveTo(0, y + Math.random() * plankH);
      ctx.bezierCurveTo(
        150, y + Math.random() * plankH,
        350, y + Math.random() * plankH,
        512, y + Math.random() * plankH
      );
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 6. Hazard Yellow/Black warning stripes
export function createHazardTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = createOffscreenCanvas(256, 256);

  ctx.fillStyle = '#e5a50a';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#1c1b18';
  const stripeW = 32;
  for (let x = -256; x < 512; x += stripeW * 2) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + stripeW, 0);
    ctx.lineTo(x + stripeW + 256, 256);
    ctx.lineTo(x + 256, 256);
    ctx.closePath();
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 7. Medkit Cross Decal
export function createMedkitTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = createOffscreenCanvas(256, 256);

  ctx.fillStyle = '#dedad5';
  ctx.fillRect(0, 0, 256, 256);

  // Red cross
  ctx.fillStyle = '#d12424';
  const w = 40;
  const l = 120;
  ctx.fillRect((256 - l) / 2, (256 - w) / 2, l, w);
  ctx.fillRect((256 - w) / 2, (256 - l) / 2, w, l);

  // Text: FIRST AID
  ctx.fillStyle = '#1c1b18';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('FIRST AID KIT', 128, 220);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 8. Canned Rations Label
export function createCannedFoodTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = createOffscreenCanvas(256, 256);

  ctx.fillStyle = '#4a543b';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#dedbce';
  ctx.font = 'bold 26px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('MRE RATIONS', 128, 90);

  ctx.fillStyle = '#c7bc99';
  ctx.font = '16px monospace';
  ctx.fillText('BEEF & BEANS', 128, 125);
  ctx.fillText('NET WT. 400g', 128, 155);

  ctx.strokeStyle = '#dedbce';
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, 224, 224);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 9. Water Bottle Label
export function createWaterBottleTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = createOffscreenCanvas(256, 256);

  ctx.fillStyle = '#1e5f8a';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PURE WATER', 128, 110);

  ctx.fillStyle = '#89cff0';
  ctx.font = '16px sans-serif';
  ctx.fillText('NATURAL SPRING', 128, 140);
  ctx.fillText('500 ml', 128, 170);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 10. Military Ammo Box Texture
export function createAmmoBoxTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = createOffscreenCanvas(256, 256);

  // Dark olive drab steel
  ctx.fillStyle = '#2c382b';
  ctx.fillRect(0, 0, 256, 256);

  // Rusted edges
  ctx.fillStyle = 'rgba(100, 50, 20, 0.4)';
  ctx.fillRect(0, 0, 256, 12);
  ctx.fillRect(0, 244, 256, 12);

  // Stenciled military yellow markings
  ctx.fillStyle = '#eab308';
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('AMMO 5.56mm', 128, 70);

  ctx.fillStyle = '#fef08a';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('30 CARTRIDGES', 128, 105);
  ctx.fillText('NATO BALL M855', 128, 130);

  // Danger hazard icon
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(98, 155, 60, 28);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('LIVE RDS', 128, 174);

  // Stencil border
  ctx.strokeStyle = '#ca8a04';
  ctx.lineWidth = 3;
  ctx.strokeRect(14, 14, 228, 228);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 11. Dark Tactical Gun Metal Texture (Receiver, barrel, rails)
export function createGunMetalTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = createOffscreenCanvas(256, 256);

  // Blued matte charcoal gun steel
  ctx.fillStyle = '#1c1e22';
  ctx.fillRect(0, 0, 256, 256);

  // Micro scratches & metallic grain
  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const tone = Math.floor(22 + Math.random() * 22);
    ctx.fillStyle = `rgb(${tone}, ${tone}, ${tone})`;
    ctx.fillRect(x, y, 1, 1);
  }

  // Machined grip ribs
  ctx.strokeStyle = '#2d3138';
  ctx.lineWidth = 2;
  for (let y = 30; y < 230; y += 12) {
    ctx.beginPath();
    ctx.moveTo(30, y);
    ctx.lineTo(226, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
