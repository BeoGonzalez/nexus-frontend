'use client';

import React, { useRef, useState, useEffect, Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Float, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { readTokens, useResolvedTheme } from '@/presentation/lib/useResolvedTheme';
import { CoverArt } from '@/presentation/components/catalog/GameCard';
import { useHydrated } from '@/presentation/hooks/useHydrated';
import { detectWebGL } from '@/presentation/lib/webgl';

const SCENE_TOKENS = ['scene-case', 'scene-spine', 'scene-back', 'scene-blank', 'scene-key', 'scene-rim', 'scene-fill'] as const;
type ScenePalette = Record<(typeof SCENE_TOKENS)[number], string>;

function useSafeTexture(imageUrl?: string) {
  // The loaded texture is remembered with its URL, so a stale one is never shown for a new cover.
  const [loaded, setLoaded] = useState<{ url: string; tex: THREE.Texture | null } | null>(null);

  useEffect(() => {
    if (!imageUrl) return;
    let isCurrent = true;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(
      imageUrl,
      (tex) => {
        if (!isCurrent) return;
        tex.colorSpace = THREE.SRGBColorSpace;
        setLoaded({ url: imageUrl, tex });
      },
      undefined,
      () => {
        if (isCurrent) setLoaded({ url: imageUrl, tex: null });
      },
    );
    return () => {
      isCurrent = false;
    };
  }, [imageUrl]);

  return imageUrl && loaded?.url === imageUrl ? loaded.tex : null;
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** The physical case: body, printed cover, spine and back. Materials follow the theme tokens. */
function CollectorBoxMesh({ imageUrl, palette, still }: { imageUrl?: string; palette: ScenePalette; still: boolean }) {
  const texture = useSafeTexture(imageUrl);
  const dark = useResolvedTheme() === 'dark';

  const body = (
    <group>
      <RoundedBox args={[2.4, 3.2, 0.32]} radius={0.06} smoothness={4}>
        <meshPhysicalMaterial
          color={palette['scene-case']}
          metalness={dark ? 0.7 : 0.35}
          roughness={dark ? 0.25 : 0.4}
          clearcoat={0.9}
          clearcoatRoughness={0.12}
        />
      </RoundedBox>
      <mesh position={[0, 0, 0.165]}>
        <planeGeometry args={[2.25, 3.05]} />
        {texture ? (
          <meshBasicMaterial map={texture} toneMapped={false} />
        ) : (
          <meshStandardMaterial color={palette['scene-blank']} roughness={0.5} />
        )}
      </mesh>
      <mesh position={[-1.205, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[0.31, 3.05]} />
        <meshStandardMaterial color={palette['scene-spine']} metalness={0.6} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0, -0.165]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[2.25, 3.05]} />
        <meshStandardMaterial color={palette['scene-back']} metalness={0.5} roughness={0.35} />
      </mesh>
    </group>
  );

  if (still) return body;
  return (
    <Float speed={1.5} rotationIntensity={0.15} floatIntensity={0.3}>
      {body}
    </Float>
  );
}

export function GameBox3DViewer({
  imageUrl,
  title,
}: {
  imageUrl?: string;
  title: string;
  platform?: string;
}) {
  const controlsRef = useRef<{ reset: () => void } | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const theme = useResolvedTheme();
  const [rotating, setRotating] = useState(() => !prefersReducedMotion());
  const [still] = useState(() => prefersReducedMotion());
  const hydrated = useHydrated();
  const hasWebGL = useMemo<boolean | null>(() => (hydrated ? detectWebGL() : null), [hydrated]);
  const [visible, setVisible] = useState(true);

  // Theme is a dependency on purpose: tokens are re-read when the theme changes.
  const palette = useMemo<ScenePalette | null>(
    () => (typeof window === 'undefined' ? null : (readTokens(SCENE_TOKENS) as ScenePalette)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme],
  );

  // Stop rendering while the viewer is off screen.
  useEffect(() => {
    const el = frameRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const poster = (
    <div className="absolute inset-0">
      <CoverArt game={{ id: 'poster', title, price_clp: 0, stock: 0, image_url: imageUrl }} sizes="460px" />
    </div>
  );

  return (
    <div
      ref={frameRef}
      role="group"
      aria-label={`Vista 3D de ${title}`}
      className="viewer-3d absolute inset-0 overflow-hidden rounded-lg"
    >
      {hasWebGL === false || !palette ? (
        poster
      ) : hasWebGL ? (
        <Canvas
          camera={{ position: [0, 0, 5.2], fov: 45 }}
          className="h-full w-full cursor-grab active:cursor-grabbing"
          dpr={[1, 1.5]}
          frameloop={visible ? 'always' : 'never'}
          gl={{ alpha: true }}
        >
          <ambientLight intensity={theme === 'dark' ? 1.0 : 1.6} />
          <directionalLight position={[5, 6, 5]} intensity={2.2} color={palette['scene-key']} />
          <directionalLight position={[-5, -2, -3]} intensity={theme === 'dark' ? 1.4 : 0.9} color={palette['scene-rim']} />
          <directionalLight position={[0, -5, 4]} intensity={theme === 'dark' ? 0.9 : 0.6} color={palette['scene-fill']} />
          <Suspense fallback={null}>
            <CollectorBoxMesh imageUrl={imageUrl} palette={palette} still={still} />
          </Suspense>
          <OrbitControls
            ref={controlsRef as never}
            enablePan={false}
            enableZoom
            minDistance={3.5}
            maxDistance={7.5}
            autoRotate={rotating}
            autoRotateSpeed={1.6}
            enableDamping
            dampingFactor={0.06}
          />
        </Canvas>
      ) : null}

      {hasWebGL && palette && (
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
          <p className="glass-card rounded-pill px-3 py-1.5 text-xs font-medium text-ink-2">Arrastra para girar</p>
          <div className="flex gap-1.5">
            <button
              type="button"
              aria-pressed={rotating}
              aria-label={rotating ? 'Pausar giro' : 'Reanudar giro'}
              onClick={() => setRotating((r) => !r)}
              className="glass-card grid size-11 place-items-center rounded-pill text-ink pointer-fine:size-9"
            >
              {rotating ? <Pause aria-hidden="true" className="size-4" /> : <Play aria-hidden="true" className="size-4" />}
            </button>
            <button
              type="button"
              aria-label="Restablecer vista"
              onClick={() => controlsRef.current?.reset()}
              className="glass-card grid size-11 place-items-center rounded-pill text-ink pointer-fine:size-9"
            >
              <RotateCcw aria-hidden="true" className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
