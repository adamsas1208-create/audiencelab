// The Cortex's WebGL neural web.
//
// R3F Canvas with a fixed camera at [0,0,10] fov 55. A single background plane
// hosts a plasma ShaderMaterial that crawls slowly and provides the depth field
// behind the network. The graph itself is: 1 center hub (You), 5 category nodes
// arranged on a ring, thick glowing edges from the hub to each node, and up to
// 6 orbiting "motes" around each node that carry the underlying data granularity
// (contact platforms, poll options, hooks, etc.).
//
// Live pulses arrive from useCortexTopology's `pulseRef` — every time an
// upstream count changes (a new contact, a new vote), the matching edge and
// node flash for ~800ms. This is the visible link between the creator's real
// data and the cinematic feel of the room.
//
// Guards mirror SkyCanvas: dpr [1, 1.5], powerPreference low-power, reduced-
// motion freezes uTime and skips pointer listeners, tab-hidden pauses rAF
// entirely (frameloop='never'). Same eslint override glob is extended in
// eslint.config.js to cover this file.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import * as THREE from 'three'

const NODE_RADIUS_BASE = 0.35
const NODE_RADIUS_RANGE = 0.35
const CENTER_RADIUS = 0.6
const MOTE_ORBIT = 0.9
const PULSE_DECAY = 1.2 // pulses drop back over ~800ms
const EDGE_BASE_OPACITY = 0.28
const EDGE_PULSE_STRENGTH = 0.55

// Soft radial-gradient glow for node halos. Draws a smooth falloff from
// opaque-center → transparent-edge on a 1×1 plane so nodes look like
// luminous orbs, not flat colored squares. Additive-blended per instance.
const GLOW_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const GLOW_FRAG = `
  precision mediump float;
  varying vec2 vUv;
  uniform vec3 uColor;
  uniform float uOpacity;
  void main() {
    float r = length(vUv - vec2(0.5));
    // Two-stop falloff: bright compact core, extended soft aura.
    float core = smoothstep(0.32, 0.0, r);
    float aura = smoothstep(0.5, 0.05, r) * 0.55;
    float a = clamp(core + aura, 0.0, 1.0) * uOpacity;
    gl_FragColor = vec4(uColor, a);
  }
`

function makeGlowMaterial(hex, opacity = 0.9) {
  const c = new THREE.Color(hex)
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Vector3(c.r, c.g, c.b) },
      uOpacity: { value: opacity },
    },
    vertexShader: GLOW_VERT,
    fragmentShader: GLOW_FRAG,
  })
}

// Plasma background shader — soft fbm crawl in brand colors so the atmosphere
// beneath the graph feels alive without stealing attention.
const PLASMA_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const PLASMA_FRAG = `
  precision mediump float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uIntensity;

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

  void main(){
    // Center-heavy radial + fbm crawl. The falloff darkens the corners so the
    // graph stays the focal point and the plasma reads as ambient depth.
    vec2 uv = vUv - 0.5;
    float dist = length(uv);
    float radial = smoothstep(0.55, 0.05, dist);
    float flow = fbm(vec2(vUv.x * 2.4 + uTime * 0.025, vUv.y * 2.2 - uTime * 0.02));
    float glow = radial * (0.35 + 0.65 * flow);
    vec3 col = mix(uColorA, uColorB, smoothstep(0.15, 0.85, flow));
    gl_FragColor = vec4(col * glow * uIntensity, glow * uIntensity);
  }
`

function hexToVec3(hex) {
  const c = new THREE.Color(hex)
  return new THREE.Vector3(c.r, c.g, c.b)
}

function PlasmaBackground({ reduced }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uColorA: { value: hexToVec3('#34e0a1') }, // brand mint
          uColorB: { value: hexToVec3('#6260ff') }, // brand periwinkle
          // Kept low so the plasma reads as atmospheric depth, not a green
          // wash that swallows the individual node tints.
          uIntensity: { value: 0.45 },
        },
        vertexShader: PLASMA_VERT,
        fragmentShader: PLASMA_FRAG,
      }),
    [],
  )
  useEffect(() => () => mat.dispose(), [mat])
  useFrame((state) => {
    mat.uniforms.uTime.value = reduced ? 0 : state.clock.elapsedTime
  })
  return (
    <mesh position={[0, 0, -3.5]} scale={[16, 16, 1]} material={mat}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  )
}

// One category node — its base radius grows with intensity, and a small ring
// of motes (contact platforms, poll options, hooks) orbits it. Everything
// breathes slightly + flashes brighter when the matching pulse counter bumps.
function CategoryNode({ node, pulseRef, reduced }) {
  const meshRef = useRef()
  const glowRef = useRef()
  const orbitRef = useRef()
  const lastPulseSeenRef = useRef(0)
  const flashAmountRef = useRef(0)

  const baseRadius = NODE_RADIUS_BASE + node.intensity * NODE_RADIUS_RANGE
  const color = useMemo(() => new THREE.Color(node.tint), [node.tint])
  const glowMaterial = useMemo(() => makeGlowMaterial(node.tint, 0.9), [node.tint])
  useEffect(() => () => glowMaterial.dispose(), [glowMaterial])

  useFrame((state) => {
    // Detect a new pulse and boost the flash amount for a fast decay.
    const seen = pulseRef.current[node.id] ?? 0
    if (seen > lastPulseSeenRef.current) {
      flashAmountRef.current = 1
      lastPulseSeenRef.current = seen
    }
    if (!reduced) {
      flashAmountRef.current = Math.max(0, flashAmountRef.current - PULSE_DECAY / 60)
    }

    // Idle breath: 2Hz + a hint of pointer-independent life.
    const t = reduced ? 0 : state.clock.elapsedTime
    const breath = 1 + 0.05 * Math.sin(t * 2 + node.angleRad)
    const pulseScale = 1 + flashAmountRef.current * 0.35

    if (meshRef.current) {
      meshRef.current.scale.setScalar(baseRadius * breath * pulseScale)
    }
    if (glowRef.current) {
      const g = 0.65 + node.intensity * 0.35 + flashAmountRef.current * 0.5
      if (glowRef.current.material.uniforms) {
        glowRef.current.material.uniforms.uOpacity.value = g
      }
      // A halo generous enough to read as a luminous field around the node.
      glowRef.current.scale.setScalar(baseRadius * 5.5 * (1 + flashAmountRef.current * 0.4))
    }
    // Slow mote orbit around the node.
    if (orbitRef.current && !reduced) {
      orbitRef.current.rotation.z = t * 0.15 + node.angleRad
    }
  })

  // Push the label just outside the halo. r×1.55 was pushing the top-most
  // ("Audience") label above the visible frame (camera half-height ≈ 5.2,
  // ring r = 3.5, so 3.5×1.55 ≈ 5.43 — off-screen). r×1.35 keeps every
  // label safely inside the frame while still clearing the halo aura.
  const outward = Math.hypot(node.position[0], node.position[1])
  const labelPos = outward
    ? [node.position[0] * 1.35, node.position[1] * 1.35, 0.05]
    : [0, 0, 0.05]

  return (
    <group position={node.position}>
      {/* Halo — soft radial-glow shader (no square edges). Placed slightly
          behind the sphere so the core sphere always reads as the anchor. */}
      <mesh ref={glowRef} position={[0, 0, -0.05]} material={glowMaterial}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      {/* Core node */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.95} />
      </mesh>
      {/* Motes orbit the node — one per underlying data point */}
      <group ref={orbitRef}>
        {node.motes.map((m) => {
          const x = Math.cos(m.angle) * MOTE_ORBIT
          const y = Math.sin(m.angle) * MOTE_ORBIT
          const size = 0.06 + Math.min(0.1, m.weight * 0.008)
          return (
            <mesh key={m.id} position={[x, y, 0.02]}>
              <sphereGeometry args={[size, 10, 10]} />
              <meshBasicMaterial color={color} transparent opacity={0.85} />
            </mesh>
          )
        })}
      </group>
      {/* DOM label anchored to the node's world position via drei's Html
          portal. Positioned by <group position={node.position}> above; the
          labelPos delta moves it outward from the ring so it never overlaps
          the halo. */}
      <group position={[labelPos[0] - node.position[0], labelPos[1] - node.position[1], 0.05]}>
        <Html center distanceFactor={9} style={{ pointerEvents: 'none' }}>
          <div
            className="al-cortex-node-label"
            style={{
              fontFamily: 'var(--al-font-mono, ui-monospace)',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: '#f7fffb',
              padding: '4px 10px',
              borderRadius: '9999px',
              background: `linear-gradient(135deg, ${node.tint}22, rgba(8,19,12,0.55))`,
              border: `1px solid ${node.tint}66`,
              boxShadow: `0 0 14px -4px ${node.tint}, inset 0 0 0 1px rgba(255,255,255,0.06)`,
              backdropFilter: 'blur(6px)',
              whiteSpace: 'nowrap',
            }}
          >
            {node.label}
          </div>
        </Html>
      </group>
    </group>
  )
}

// One glowing edge from center hub to a category node. Opacity pulses
// gently at ~2Hz and flashes when the matching data change lands.
function Edge({ node, pulseRef, reduced }) {
  const ref = useRef()
  const lastPulseSeenRef = useRef(0)
  const flashAmountRef = useRef(0)

  const points = useMemo(
    () => [
      [0, 0, 0],
      [node.position[0], node.position[1], node.position[2]],
    ],
    [node.position],
  )

  useFrame((state) => {
    const seen = pulseRef.current[node.id] ?? 0
    if (seen > lastPulseSeenRef.current) {
      flashAmountRef.current = 1
      lastPulseSeenRef.current = seen
    }
    if (!reduced) {
      flashAmountRef.current = Math.max(0, flashAmountRef.current - PULSE_DECAY / 60)
    }
    const t = reduced ? 0 : state.clock.elapsedTime
    const idlePulse = 0.5 + 0.5 * Math.sin(t * 2 + node.angleRad)
    const opacity =
      EDGE_BASE_OPACITY + node.intensity * 0.25 + idlePulse * 0.12 + flashAmountRef.current * EDGE_PULSE_STRENGTH
    if (ref.current && ref.current.material) {
      ref.current.material.opacity = Math.min(1, opacity)
    }
  })

  return (
    <Line
      ref={ref}
      points={points}
      color={node.tint}
      lineWidth={2.5}
      transparent
      depthWrite={false}
    />
  )
}

function CenterHub({ reduced }) {
  const ref = useRef()
  const glowRef = useRef()
  const glowMaterial = useMemo(() => makeGlowMaterial('#e6fff4', 0.75), [])
  useEffect(() => () => glowMaterial.dispose(), [glowMaterial])

  useFrame((state) => {
    const t = reduced ? 0 : state.clock.elapsedTime
    const breath = 1 + 0.06 * Math.sin(t * 1.6)
    if (ref.current) ref.current.scale.setScalar(CENTER_RADIUS * breath)
    if (glowRef.current?.material?.uniforms) {
      glowRef.current.material.uniforms.uOpacity.value = 0.55 + 0.15 * Math.sin(t * 1.6 + 1.2)
    }
  })
  return (
    <group position={[0, 0, 0]}>
      <mesh ref={glowRef} position={[0, 0, -0.05]} material={glowMaterial} scale={CENTER_RADIUS * 6.5}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      <mesh ref={ref}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#f7fffb" transparent opacity={0.95} />
      </mesh>
    </group>
  )
}

function Scene({ topology, reduced, pointerRef }) {
  const groupRef = useRef()

  useFrame(() => {
    // Very subtle pointer parallax for the entire graph — enough to feel alive
    // without dragging attention away from the insight cards on top.
    const g = groupRef.current
    const p = pointerRef.current
    if (!g || reduced) return
    g.rotation.y += (p.x * 0.15 - g.rotation.y) * 0.05
    g.rotation.x += (-p.y * 0.1 - g.rotation.x) * 0.05
  })

  return (
    <>
      <PlasmaBackground reduced={reduced} />
      <group ref={groupRef}>
        <CenterHub reduced={reduced} />
        {topology.nodes.map((n) => (
          <Edge key={`edge-${n.id}`} node={n} pulseRef={topology.pulseRef} reduced={reduced} />
        ))}
        {topology.nodes.map((n) => (
          <CategoryNode key={n.id} node={n} pulseRef={topology.pulseRef} reduced={reduced} />
        ))}
      </group>
    </>
  )
}

export default function NeuralWebCanvas({ topology }) {
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

  useEffect(() => {
    const onVis = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  useEffect(() => {
    if (reduced) return
    const onMove = (e) => {
      pointerRef.current.x = (e.clientX / window.innerWidth) * 2 - 1
      pointerRef.current.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [reduced])

  const frameloop = reduced ? 'demand' : visible ? 'always' : 'never'

  return (
    <div
      aria-hidden="true"
      className="al-cortex-canvas"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      <Canvas
        frameloop={frameloop}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
        camera={{ position: [0, 0, 10], fov: 55 }}
      >
        <Scene topology={topology} reduced={reduced} pointerRef={pointerRef} />
      </Canvas>
    </div>
  )
}
