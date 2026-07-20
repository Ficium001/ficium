/**
 * src/shared/lib/imageCompress.ts
 * ─────────────────────────────────────────────────────────────
 * Client-side image compression to base64, shared by anything that
 * needs to send a photo to a serverless function without hitting
 * Vercel's ~4.5MB body limit.
 *
 * Mobile cameras produce 5–12MB images which, base64-encoded, blow
 * past that limit. We resize to max 1600px on the long edge and
 * re-encode as JPEG @85% — plenty of quality for OCR/Rekognition.
 *
 * Works on any Blob, so it covers both a File straight from an
 * <input capture> element and a Blob fetched from a signed URL.
 */

export async function compressBlobToBase64(
  blob: Blob,
  maxDim = 1600,
  quality = 0.85,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
        else                { width  = Math.round(width  * maxDim / height); height = maxDim; }
      }
      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not available")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      resolve(dataUrl.split(",")[1]); // strip "data:image/jpeg;base64," prefix
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}
