"use client";

// Image handling without Firebase Storage (which needs the paid Blaze plan).
// Photos are compressed to a compact JPEG data URL and stored in Firestore.
// Firestore documents have a 1 MB limit, so images are downscaled before save.

export function compressImage(file, options = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => (img.src = reader.result);
    reader.onerror = reject;
    img.onload = () => {
      try {
        const maxW = 640;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Arrival/departure photos can carry a visible timestamp as well as
        // the timestamp metadata stored on the visit document.
        if (options.stampText) {
          const fontSize = Math.max(12, Math.round(canvas.width / 30));
          const padding = Math.max(7, Math.round(fontSize * 0.55));
          ctx.font = `600 ${fontSize}px Arial, sans-serif`;
          const textWidth = ctx.measureText(options.stampText).width;
          const barHeight = fontSize + padding * 2;
          ctx.fillStyle = "rgba(10, 23, 38, 0.78)";
          ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);
          ctx.fillStyle = "#ffffff";
          ctx.textBaseline = "middle";
          ctx.fillText(options.stampText, padding, canvas.height - barHeight / 2);
        }

        resolve(canvas.toDataURL("image/jpeg", 0.6));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Rough size estimate of a data URL in kilobytes (for upload-time warnings).
export function dataUrlKb(dataUrl) {
  if (!dataUrl) return 0;
  const b64 = dataUrl.split(",")[1] || "";
  return Math.round((b64.length * 3) / 4 / 1024);
}
