"use client";

// Image handling without Firebase Storage (which needs the paid Blaze plan).
// Instead we compress photos to a compact JPEG data-URL and store them
// directly inside Firestore documents — the same approach the original v1
// app used. This keeps everything on the free Spark plan.
//
// Firestore documents have a 1 MB limit, so we downscale to 640px wide and
// encode at ~0.6 quality (~60–120 KB per photo). A daily log can hold several
// photos and stay well under the limit.

export function compressImage(file) {
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
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
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
