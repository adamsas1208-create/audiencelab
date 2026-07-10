// The living sky — now a real WebGL scene (react-three-fiber).
//
// A fixed, full-viewport <Canvas> behind the entire app. The star field is a
// genuine 3D point cloud with depth, so it parallaxes against pointer / device
// tilt; the dawn glow, sunset sun, and moon are additive radial-gradient
// sprites that keep the soft, atmospheric look of the old 2D canvas. Scene
// weights (dawn/sunset/stars/moon) arrive from AtmosphereProvider already
// interpolated across each 30-minute phase crossfade.
//
// R3F runs its own reconciler, so the atmosphere context does NOT cross the
// <Canvas> boundary — scene weights are passed in as a prop and mirrored into a
// ref that the render loop reads. Perf: frameloop is gated on tab visibility
// and prefers-reduced-motion; dpr is capped; everything is a handful of draw
// calls. The whole layer is pointer-events:none so it never blocks the UI.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useAtmosphere } from './AtmosphereProvider.jsx'
import SkyStage from './SkyStage.jsx'

const STAR_COUNT = 220

// Deterministic star cloud (mulberry32) — stars must not jump between renders.
// Spread wide in x/y and deep in z so pointer parallax has real depth to work
// against. Each star carries a twinkle phase and a size scale.
function makeStarGeometry() {
  let s = 20260705
  const rand = () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const pos = new Float32Array(STAR_COUNT * 3)
  const phase = new Float32Array(STAR_COUNT)
  const scale = new Float32Array(STAR_COUNT)
  for (let i = 0; i < STAR_COUNT; i++) {
    pos[i * 3] = (rand() * 2 - 1) * 38
    pos[i * 3 + 1] = (rand() * 0.9 + 0.02) * 22 // upper sky, gentle spread down
    pos[i * 3 + 2] = -5 - rand() * 30
    phase[i] = rand() * Math.PI * 2
    scale[i] = 0.6 + rand() * 1.6
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1))
  g.setAttribute('aScale', new THREE.BufferAttribute(scale, 1))
  return g
}

const STAR_VERT = `
  attribute float aPhase;
  attribute float aScale;
  uniform float uTime;
  uniform float uSize;
  varying float vTw;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vTw = 0.5 + 0.5 * sin(uTime * (0.4 + aScale * 0.5) + aPhase);
    gl_PointSize = uSize * aScale * (1.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`
const STAR_FRAG = `
  precision mediump float;
  uniform float uOpacity;
  varying float vTw;
  void main() {
    float r = length(gl_PointCoord - vec2(0.5));
    float soft = smoothstep(0.5, 0.0, r);
    gl_FragColor = vec4(vec3(0.96, 0.93, 0.85), soft * vTw * uOpacity);
  }
`

function StarField({ sceneRef, reduced, pointerRef }) {
  const groupRef = useRef()
  const geo = useMemo(() => makeStarGeometry(), [])
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uSize: { value: 90 } },
        vertexShader: STAR_VERT,
        fragmentShader: STAR_FRAG,
      }),
    [],
  )
  useEffect(() => () => { geo.dispose(); mat.dispose() }, [geo, mat])

  // R3F render loop — mutating uniforms/transforms per frame is idiomatic.
  useFrame((state) => {
    mat.uniforms.uOpacity.value = sceneRef.current?.stars ?? 0
    if (!reduced) {
      mat.uniforms.uTime.value = state.clock.elapsedTime
      const g = groupRef.current
      const p = pointerRef.current
      if (g) {
        // Ease toward a small pointer-driven rotation for subtle parallax.
        g.rotation.y += (p.x * 0.06 - g.rotation.y) * 0.04
        g.rotation.x += (-p.y * 0.04 - g.rotation.x) * 0.04
      }
    }
  })

  return (
    <group ref={groupRef}>
      <points geometry={geo} material={mat} />
    </group>
  )
}

// One additive radial-gradient sprite whose opacity tracks a scene weight.
// `drift` adds a slow sinusoidal wander so daylight feels alive, not static.
function Glow({ texture, position, scale, tint, base, weightKey, sceneRef, drift = 0 }) {
  const ref = useRef()
  useFrame((state) => {
    const w = sceneRef.current?.[weightKey] ?? 0
    const el = ref.current
    if (!el) return
    el.material.opacity = w * base
    if (drift > 0) {
      const t = state.clock.elapsedTime
      el.position.x = position[0] + Math.sin(t * 0.05) * drift
      el.position.y = position[1] + Math.sin(t * 0.033 + 2) * drift * 0.6
    }
  })
  const s = Array.isArray(scale) ? scale : [scale, scale, 1]
  return (
    <sprite ref={ref} position={position} scale={s}>
      <spriteMaterial
        map={texture}
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        color={tint}
      />
    </sprite>
  )
}

// ── Blade Runner neon night ────────────────────────────────────────────────
// A full-frustum plane far behind the stars, rendered only at night (uNight =
// the star weight). Organic crawling neon glow rising from the horizon — a
// distant hidden city — plus procedural shooting stars every several seconds.
const NEON_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const NEON_FRAG = `
  precision mediump float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uNight;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float vnoise(vec2 p){
    vec2 i = floor(p); vec2 f = fract(p);
    float a = hash(i), b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }
  float fbm(vec2 p){
    float v = 0.0; float amp = 0.5;
    for (int i = 0; i < 4; i++){ v += amp * vnoise(p); p *= 2.0; amp *= 0.5; }
    return v;
  }
  // One meteor per ~7s slot; ~45% of slots fire. Bright head, short tail.
  float shootingStar(vec2 uv, float t){
    float slot = floor(t / 7.0);
    float lt = fract(t / 7.0);
    if (hash(vec2(slot, 3.7)) > 0.55) return 0.0;
    float rx = hash(vec2(slot, 9.1));
    float ry = hash(vec2(slot, 2.3));
    vec2 start = vec2(0.05 + rx * 0.7, 0.62 + ry * 0.33);
    vec2 dir = normalize(vec2(0.62, -0.32));
    vec2 head = start + dir * lt * 0.9;
    vec2 tail = head - dir * 0.14;
    vec2 pa = uv - tail; vec2 ba = head - tail;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    float dist = length(pa - ba * h);
    float streak = smoothstep(0.005, 0.0, dist) * h;
    float life = smoothstep(0.0, 0.08, lt) * smoothstep(1.0, 0.55, lt);
    return streak * life;
  }

  void main(){
    vec2 uv = vUv;
    float horizon = smoothstep(0.6, 0.0, uv.y);           // strongest low
    float flow = fbm(vec2(uv.x * 3.0 + uTime * 0.03, uv.y * 2.2 - uTime * 0.02));
    float glow = horizon * (0.32 + 0.68 * flow);
    vec3 rose = vec3(0.78, 0.28, 0.44);
    vec3 cyan = vec3(0.20, 0.54, 0.68);
    vec3 violet = vec3(0.36, 0.24, 0.55);
    vec3 col = mix(rose, cyan, smoothstep(0.0, 0.32, uv.y));
    col = mix(col, violet, smoothstep(0.28, 0.6, uv.y));
    vec3 neon = col * glow * 0.8;
    neon += vec3(0.8, 0.95, 1.0) * shootingStar(uv, uTime) * 1.3;
    gl_FragColor = vec4(neon * uNight, 1.0);
  }
`

function NeonNight({ sceneRef, reduced }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uNight: { value: 0 } },
        vertexShader: NEON_VERT,
        fragmentShader: NEON_FRAG,
      }),
    [],
  )
  useEffect(() => () => mat.dispose(), [mat])
  useFrame((state) => {
    mat.uniforms.uNight.value = sceneRef.current?.stars ?? 0
    mat.uniforms.uTime.value = reduced ? 0 : state.clock.elapsedTime
  })
  return (
    <mesh position={[0, 0, -40]} scale={[220, 130, 1]} material={mat}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  )
}

function Scene({ scene, reduced, pointerRef }) {
  const sceneRef = useRef(scene || {})
  const invalidate = useThree((st) => st.invalidate)
  // Mirror the latest weights into the ref and request a paint (covers the
  // reduced-motion 'demand' frameloop, where useFrame only runs on request).
  useEffect(() => {
    sceneRef.current = scene || {}
    invalidate()
  }, [scene, invalidate])

  // A single soft white radial texture, tinted per glow — additive blending
  // turns white × color into a colored glow.
  const glowTex = useMemo(() => {
    const size = 128
    const c = document.createElement('canvas')
    c.width = c.height = size
    const ctx = c.getContext('2d')
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.25, 'rgba(255,255,255,0.55)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
    return new THREE.CanvasTexture(c)
  }, [])
  useEffect(() => () => glowTex.dispose(), [glowTex])

  return (
    <>
      {/* Blade Runner neon horizon — furthest back, night only. */}
      <NeonNight sceneRef={sceneRef} reduced={reduced} />

      <StarField sceneRef={sceneRef} reduced={reduced} pointerRef={pointerRef} />

      {/* Day — a warm sun presence top-right and a cool sky counter-glow low
          on the left, both wandering almost imperceptibly. Daylight is no
          longer an empty canvas. */}
      <Glow texture={glowTex} position={[20, 15, -14]} scale={46} tint="#ffdfae" base={0.34} weightKey="daylight" sceneRef={sceneRef} drift={1.4} />
      <Glow texture={glowTex} position={[21, 16, -10]} scale={14} tint="#fff3d6" base={0.5} weightKey="daylight" sceneRef={sceneRef} drift={0.8} />
      <Glow texture={glowTex} position={[-24, -14, -16]} scale={50} tint="#cfe0ec" base={0.22} weightKey="daylight" sceneRef={sceneRef} drift={1.8} />

      {/* Dawn — warm light rising from the bottom-right. */}
      <Glow texture={glowTex} position={[24, -16, -9]} scale={52} tint="#f4b48c" base={0.7} weightKey="dawn" sceneRef={sceneRef} />

      {/* Sunset — peach wash + a low soft sun, bottom-left. */}
      <Glow texture={glowTex} position={[-22, -14, -11]} scale={58} tint="#f2a07d" base={0.8} weightKey="sunset" sceneRef={sceneRef} />
      <Glow texture={glowTex} position={[-20, -12, -6]} scale={9} tint="#ffd6a6" base={0.95} weightKey="sunset" sceneRef={sceneRef} />

      {/* Moon — soft aura + brighter body, top-right. */}
      <Glow texture={glowTex} position={[22, 13, -8]} scale={13} tint="#f4edd8" base={0.55} weightKey="moon" sceneRef={sceneRef} />
      <Glow texture={glowTex} position={[22, 13, -6]} scale={3.2} tint="#f4edd8" base={0.95} weightKey="moon" sceneRef={sceneRef} />
    </>
  )
}

export default function SkyCanvas() {
  const atmo = useAtmosphere()
  const scene = atmo?.palette.scene

  const reduced = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )
  const [visible, setVisible] = useState(
    () => typeof document === 'undefined' || !document.hidden,
  )
  const pointerRef = useRef({ x: 0, y: 0 })

  // Pause the render loop when the tab is hidden — rAF is throttled there
  // anyway, and this guarantees zero GPU work in the background.
  useEffect(() => {
    const onVis = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // Parallax input — mouse on desktop, tilt on mobile. Not registered at all
  // under reduced motion (no listeners, no work).
  useEffect(() => {
    if (reduced) return
    const onMove = (e) => {
      pointerRef.current.x = (e.clientX / window.innerWidth) * 2 - 1
      pointerRef.current.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    const onTilt = (e) => {
      if (e.gamma == null || e.beta == null) return
      pointerRef.current.x = Math.max(-1, Math.min(1, e.gamma / 45))
      pointerRef.current.y = Math.max(-1, Math.min(1, (e.beta - 45) / 45))
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('deviceorientation', onTilt)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('deviceorientation', onTilt)
    }
  }, [reduced])

  const frameloop = reduced ? 'demand' : visible ? 'always' : 'never'

  return (
    <>
      <div
        aria-hidden="true"
        style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
      >
        <Canvas
          frameloop={frameloop}
          dpr={[1, 1.5]}
          gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
          camera={{ position: [0, 0, 10], fov: 60 }}
        >
          <Scene scene={scene} reduced={reduced} pointerRef={pointerRef} />
        </Canvas>
      </div>

      {/* SkyStage — the full cinematic atmosphere (bands, sun disc, haze,
          ambient cast). Sits above the WebGL canvas (which carries stars/moon
          for night/twilight) and below the app UI. */}
      <SkyStage />
    </>
  )
}
