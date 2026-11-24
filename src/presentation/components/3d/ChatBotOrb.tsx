"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MeshTransmissionMaterial } from "@react-three/drei";
import * as THREE from "three";
import { readTokens, useResolvedTheme } from "@/presentation/lib/useResolvedTheme";
import { useHydrated } from "@/presentation/hooks/useHydrated";
import { detectWebGL } from "@/presentation/lib/webgl";
import { LensPoster, lensCoverUrl } from "@/presentation/components/3d/LensPoster";

const LENS_TOKENS = ["lens-tint", "lens-key", "lens-rim", "field-a", "field-b"] as const;
type LensPalette = Record<(typeof LENS_TOKENS)[number], string>;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** The cover in focus as a texture; without one, the theme's neutral field as a soft gradient. */
function useLensTexture(coverSrc: string | null | undefined, palette: LensPalette) {
  const fallback = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 64, 64);
    g.addColorStop(0, palette["field-a"] || "#cfe9ef");
    g.addColorStop(1, palette["field-b"] || "#f6e3d2");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [palette]);

  const [loaded, setLoaded] = useState<{ src: string; tex: THREE.Texture | null } | null>(null);
  useEffect(() => {
    if (!coverSrc) return;
    let current = true;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      lensCoverUrl(coverSrc),
      (tex) => {
        if (!current) return;
        tex.colorSpace = THREE.SRGBColorSpace;
        setLoaded({ src: coverSrc, tex });
      },
      undefined,
      () => current && setLoaded({ src: coverSrc, tex: null }),
    );
    return () => {
      current = false;
    };
  }, [coverSrc]);

  return (coverSrc && loaded?.src === coverSrc && loaded.tex) || fallback;
}

/**
 * A thick capsule of clear glass with the focused cover behind it: the assistant has no colour of
 * its own, it looks at the game you are looking at. It leans a few degrees toward the pointer.
 */
function Lens({ coverSrc, palette, dark, still }: { coverSrc?: string | null; palette: LensPalette; dark: boolean; still: boolean }) {
  const group = useRef<THREE.Group>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const texture = useLensTexture(coverSrc, palette);

  useEffect(() => {
    if (still) return;
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [still]);

  useFrame((state, delta) => {
    const g = group.current;
    if (still || !g) return;
    const t = state.clock.elapsedTime;
    const max = THREE.MathUtils.degToRad(9);
    const ty = pointer.current.x * max + Math.sin(t * 0.6) * 0.06;
    const tx = pointer.current.y * max * 0.7 + Math.cos(t * 0.5) * 0.04;
    // Critically damped follow: no overshoot, settles in ~300 ms.
    const k = 1 - Math.exp(-delta * 8);
    g.rotation.y += (ty - g.rotation.y) * k;
    g.rotation.x += (tx - g.rotation.x) * k;
  });

  const mask = useStadiumMask();

  return (
    <group ref={group} rotation={[0.1, -0.32, 0]}>
      {/* The light the lens holds: the cover, cut to the lens silhouette so no rectangle shows around it. */}
      <mesh position={[0, 0, -0.34]}>
        <planeGeometry args={[2.0, 1.12]} />
        <meshBasicMaterial map={texture} alphaMap={mask} transparent toneMapped={false} />
      </mesh>
      {/* Stadium lens: a capsule laid on its side and flattened, so every edge is round like ground glass. */}
      <mesh rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.52]}>
        <capsuleGeometry args={[0.6, 0.92, 24, 64]} />
        <MeshTransmissionMaterial
          samples={6}
          resolution={256}
          backside={false}
          thickness={0.9}
          ior={1.42}
          roughness={dark ? 0.1 : 0.05}
          chromaticAberration={0.045}
          anisotropy={0.15}
          distortion={0.06}
          distortionScale={0.3}
          temporalDistortion={still ? 0 : 0.03}
          clearcoat={1}
          clearcoatRoughness={0.06}
          attenuationDistance={2.4}
          attenuationColor={palette["lens-tint"]}
          color="#ffffff"
        />
      </mesh>
      <ambientLight intensity={dark ? 0.8 : 1.3} />
      <directionalLight position={[-3, 4, 5]} intensity={dark ? 2.4 : 2.6} color={palette["lens-key"]} />
      <directionalLight position={[4, -2, 3]} intensity={dark ? 1.2 : 0.5} color={palette["lens-rim"]} />
    </group>
  );
}

/** White stadium on black: the alpha mask that gives the backing cover the lens silhouette. */
function useStadiumMask() {
  return useMemo(() => {
    const w = 128;
    const h = 72;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.roundRect(2, 2, w - 4, h - 4, (h - 4) / 2);
    ctx.fill();
    return new THREE.CanvasTexture(c);
  }, []);
}

export default function ChatBotOrb({ coverSrc }: { coverSrc?: string | null }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const theme = useResolvedTheme();
  const hydrated = useHydrated();
  const hasWebGL = useMemo(() => hydrated && detectWebGL(), [hydrated]);
  const [visible, setVisible] = useState(true);
  const [still] = useState(() => prefersReducedMotion());

  // Tokens are re-read whenever the theme flips.
  const palette = useMemo<LensPalette | null>(
    () => (typeof window === "undefined" ? null : (readTokens(LENS_TOKENS) as LensPalette)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme],
  );

  useEffect(() => {
    const el = frameRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={frameRef} aria-hidden="true" className="pointer-events-none absolute inset-0">
      {hasWebGL && palette ? (
        <Canvas
          camera={{ position: [0, 0, 4.1], fov: 34 }}
          dpr={[1.5, 3]}
          gl={{ alpha: true, antialias: true }}
          frameloop={!visible ? "never" : still ? "demand" : "always"}
          className="h-full w-full"
        >
          <Lens coverSrc={coverSrc} palette={palette} dark={theme === "dark"} still={still} />
        </Canvas>
      ) : (
        <LensPoster coverSrc={coverSrc} />
      )}
    </div>
  );
}
