import { paintPlanet } from './sky.js';

const maps = new Map();
const size = 640;
const rays = [];
for (let row = 0; row < size; row++) {
  for (let col = 0; col < size; col++) {
    const x = (col + .5) / (size / 2) - 1;
    const y = (row + .5) / (size / 2) - 1;
    const radius = x*x+y*y;
    if (radius >= 1) continue;
    const z = Math.sqrt(1-radius);
    const latitude = Math.asin(y);
    const longitude = Math.atan2(x,z);
    const illumination = Math.max(0, -.48*x-.41*y+.74*z);
    rays.push([(row*size+col)*4, longitude/(Math.PI*2)+.5, latitude/Math.PI+.5, .065+.92*Math.pow(illumination,.82), Math.pow(1-z,3)*illumination]);
  }
}

function loadTexture(id, url) {
  if (maps.has(id)) return maps.get(id);
  const promise = new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(image, 0, 0);
      resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
    };
    image.onerror = () => resolve(null);
    image.src = url;
  });
  maps.set(id, promise);
  return promise;
}

export function globe(canvas, textureURL) {
  const ctx = canvas.getContext('2d');
  const frame = ctx.createImageData(size,size);
  let id = '', texture, rotation = 0, pending = 0, dragging = null;
  const start = { earth: .22, jupiter: .21, mars: .53, saturn: .25 };

  function draw() {
    pending = 0;
    if (!texture) return;
    const { width, height, data } = texture;
    const output = frame.data;
    for (const [index, longitude, latitude, light, rim] of rays) {
      const u = ((longitude + rotation) % 1 + 1) % 1;
      const v = Math.max(0, Math.min(height-1, Math.floor(latitude*height)));
      const source = (v*width + Math.floor(u*width))*4;
      output[index] = data[source]*light+rim*15;
      output[index+1] = data[source+1]*light+rim*26;
      output[index+2] = data[source+2]*light+rim*55;
      output[index+3] = 255;
    }
    if (canvas.width !== size) canvas.width = canvas.height = size;
    ctx.putImageData(frame, 0, 0);
  }

  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !texture) return;
    dragging = { x: event.clientX, id: event.pointerId };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (dragging?.id !== event.pointerId) return;
    rotation -= (event.clientX - dragging.x) / 650;
    dragging.x = event.clientX;
    if (!pending) pending = requestAnimationFrame(draw);
  });
  for (const name of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(name, () => { dragging = null; });

  async function show(next) {
    if (id === next) return;
    id = next;
    texture = null;
    rotation = start[next] ?? 0;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if (next === 'deep') return;
    paintPlanet(canvas, next);
    const url = textureURL(next);
    if (!url) return;
    const loaded = await loadTexture(next, url);
    if (id !== next) return;
    texture = loaded;
    draw();
  }

  show.spin = offset => {
    if (!texture) return;
    const next = (start[id] ?? 0) + offset;
    if (Math.abs(next - rotation) < .0015) return;
    rotation = next;
    if (!pending) pending = requestAnimationFrame(draw);
  };
  show.rotate = () => {
    if (!texture) return;
    rotation += .075;
    if (!pending) pending = requestAnimationFrame(draw);
  };
  return show;
}
