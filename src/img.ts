// Comprime una imagen (redimensiona + JPEG) para que suba liviana y sincronice bien a la nube.
export async function comprimirImagen(file: File, maxLado = 1000, calidad = 0.72): Promise<string> {
  const dibujar = (w0: number, h0: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): string => {
    let width = w0, height = h0;
    if (!width || !height) return '';
    if (width > maxLado || height > maxLado) {
      if (width >= height) { height = Math.round(height * maxLado / width); width = maxLado; }
      else { width = Math.round(width * maxLado / height); height = maxLado; }
    }
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height);
    draw(ctx, width, height);
    let q = calidad;
    let out = canvas.toDataURL('image/jpeg', q);
    while (out.length > 1200000 && q > 0.4) { q -= 0.15; out = canvas.toDataURL('image/jpeg', q); }
    return out && out.length > 100 ? out : '';
  };
  try {
    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as any);
      const out = dibujar(bitmap.width, bitmap.height, (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h));
      if ((bitmap as any).close) (bitmap as any).close();
      if (out) return out;
    }
  } catch (e) { /* respaldo */ }
  try {
    const out = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => resolve(dibujar(img.width, img.height, (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h)));
        img.onerror = () => resolve('');
        img.src = reader.result as string;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
    if (out) return out;
  } catch (e) { /* nada */ }
  return '';
}
