/**
 * Makes a product clip small enough to upload, in the browser.
 *
 * A 10-second phone video is often 15-25 MB, more than one upload to the
 * server can carry (about 5.5 MB). It is replayed onto a canvas at up to
 * 720 px and recorded again at a modest bit rate, without sound, which
 * gives a 2-4 MB clip that looks the same on a product page. Clips already
 * small enough are sent as they are.
 */

export const VIDEO_LIMIT = Math.floor(5.5 * 1024 * 1024);
export const MAX_SECONDS = 15;

const TYPES = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];

function meta(file) {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.muted = true;
    v.playsInline = true;
    v.src = URL.createObjectURL(file);
    v.onloadedmetadata = () => resolve(v);
    v.onerror = () => reject(new Error('This video could not be opened. Try an MP4 from your phone.'));
  });
}

/**
 * Returns { blob, name, seconds, shrunk } ready to upload.
 * onProgress gets a number from 0 to 1 while re-recording.
 */
export async function prepareVideo(file, onProgress = () => {}) {
  const v = await meta(file);
  const seconds = Number.isFinite(v.duration) ? v.duration : 0;
  const okType = /^video\/(mp4|webm|quicktime)/.test(file.type);
  if (okType && file.size <= VIDEO_LIMIT && seconds <= MAX_SECONDS + 1) {
    URL.revokeObjectURL(v.src);
    return { blob: file, name: file.name, seconds, shrunk: false };
  }

  const type = typeof MediaRecorder !== 'undefined' && TYPES.find((t) => MediaRecorder.isTypeSupported(t));
  if (!type) {
    URL.revokeObjectURL(v.src);
    throw new Error('This browser cannot shrink videos. Use a clip under 5 MB, or try Chrome or Edge.');
  }

  const longest = Math.max(v.videoWidth, v.videoHeight) || 720;
  const scale = Math.min(1, 720 / longest);
  const w = Math.max(2, Math.round((v.videoWidth * scale) / 2) * 2);
  const h = Math.max(2, Math.round((v.videoHeight * scale) / 2) * 2);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const limit = Math.min(seconds || MAX_SECONDS, MAX_SECONDS);

  const record = (bitrate) =>
    new Promise((resolve, reject) => {
      const stream = canvas.captureStream(30);
      const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: bitrate });
      const parts = [];
      let done = false;
      rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
      rec.onstop = () => resolve(new Blob(parts, { type: type.split(';')[0] }));
      rec.onerror = (e) => reject(e.error || new Error('Recording failed'));
      const finish = () => {
        if (done) return;
        done = true;
        v.pause();
        rec.stop();
      };
      const draw = () => {
        if (done) return;
        ctx.drawImage(v, 0, 0, w, h);
        onProgress(Math.min(1, v.currentTime / limit));
        if (v.ended || v.currentTime >= limit) return finish();
        if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(draw);
        else requestAnimationFrame(draw);
      };
      v.currentTime = 0;
      v.onended = finish;
      rec.start(500);
      v.play().then(draw, reject);
    });

  try {
    let blob = await record(1_600_000);
    if (blob.size > VIDEO_LIMIT) blob = await record(800_000);
    if (blob.size > VIDEO_LIMIT) throw new Error('This video is still too large. Keep it to about 10 seconds.');
    const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
    const base = file.name.replace(/\.[^.]+$/, '') || 'video';
    return { blob, name: `${base}.${ext}`, seconds: Math.min(seconds, limit), shrunk: true };
  } finally {
    URL.revokeObjectURL(v.src);
  }
}
