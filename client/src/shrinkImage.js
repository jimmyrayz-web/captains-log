// Photos are stored in the database, so full-size phone photos (3-15 MB
// each) would eat through the free storage tier within a few seasons.
// Shrink each one to a phone-friendly size before uploading.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image'));
    };
    img.src = url;
  });
}

export async function shrinkImage(file) {
  // GIFs may be animated; re-encoding would flatten them.
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;

  try {
    // <img> applies EXIF orientation, so the canvas output is upright.
    const img = await loadImage(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    // JPEG has no transparency; paint white behind PNGs with alpha.
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
    // Keep the original if shrinking failed or didn't actually save space.
    if (!blob || blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
  } catch {
    // e.g. a format this browser can't decode (HEIC outside Safari):
    // upload it as-is rather than losing the photo.
    return file;
  }
}
