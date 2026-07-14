// VideoLab client utilities: capture keyframes from a short video entirely in
// the browser (hidden <video> + HTML5 canvas → PNG base64), and POST them to the
// /api/video endpoint for retention analysis.

// The three timestamps we sample: Hook (0s), Setup (3s), Retention check (10s).
export const FRAME_PLAN = [
  { t: 0, label: 'Hook (0s)' },
  { t: 3, label: 'Setup (3s)' },
  { t: 10, label: 'Retention (10s)' },
]

// Seek a detached <video> to time `t` and resolve once the frame is decoded.
function seekTo(video, t) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', onError)
    }
    const onSeeked = () => {
      cleanup()
      resolve()
    }
    const onError = () => {
      cleanup()
      reject(new Error('Failed to seek the video while capturing keyframes'))
    }
    video.addEventListener('seeked', onSeeked)
    video.addEventListener('error', onError)
    try {
      video.currentTime = t
    } catch (e) {
      cleanup()
      reject(new Error(`Could not seek this video: ${e.message}`))
    }
  })
}

// Capture keyframes at the FRAME_PLAN timestamps and return PNG data URLs.
// PNG (not WebP) so the local vision model can decode them. Downscaled so the
// base64 payload stays reasonable.
export async function captureKeyframes(file, maxDim = 640) {
  if (!file || !file.type?.startsWith('video/')) {
    throw new Error('Please choose a video file (.mp4, .mov, .webm …)')
  }

  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.src = url

  try {
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = () => resolve()
      video.onerror = () =>
        reject(new Error('Could not read this video — try a standard .mp4 (H.264)'))
    })

    const duration = Number.isFinite(video.duration) ? video.duration : 0
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const frames = []

    for (const plan of FRAME_PLAN) {
      // Clamp the target into the clip; nudge past 0 so a real frame decodes.
      let t = plan.t
      if (duration) t = Math.min(t, Math.max(0, duration - 0.05))
      t = Math.max(0.03, t)

      await seekTo(video, t)

      const vw = video.videoWidth || 1
      const vh = video.videoHeight || 1
      const scale = Math.min(1, maxDim / Math.max(vw, vh))
      canvas.width = Math.max(1, Math.round(vw * scale))
      canvas.height = Math.max(1, Math.round(vh * scale))
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      frames.push({
        label: plan.label,
        t: plan.t,
        // Verified PNG encoder (the model can't decode WebP).
        image: canvas.toDataURL('image/png'),
      })
    }
    return frames
  } finally {
    URL.revokeObjectURL(url)
  }
}

// POST captured keyframes + focus query to the retention analyzer. Throws on any
// failure with the backend's exact message so the UI can surface it.
export async function analyzeVideo(query, frames) {
  const res = await fetch('/api/video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: (query || '').trim(),
      frames: frames.map((f) => ({ label: f.label, t: f.t, image: f.image })),
    }),
  })

  if (!res.ok) {
    let detail = `Server responded ${res.status}`
    try {
      const e = await res.json()
      if (e && e.error) detail = e.error
    } catch {
      /* non-JSON body */
    }
    throw new Error(detail)
  }

  const data = await res.json()
  if (
    !data ||
    !Array.isArray(data.frames) ||
    typeof data.theCoach !== 'string' ||
    typeof data.theCritic !== 'string' ||
    !data.verdict
  ) {
    throw new Error('Malformed video analysis response')
  }
  return data
}
