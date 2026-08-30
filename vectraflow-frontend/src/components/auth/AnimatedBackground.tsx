interface AnimatedBackgroundProps {
  /** 'fixed' fills the viewport; 'absolute' fills its positioned parent (e.g. a side panel). */
  position?: 'fixed' | 'absolute';
}

export function AnimatedBackground({ position = 'fixed' }: AnimatedBackgroundProps) {
  return (
    <div
      aria-hidden
      style={{
        position,
        inset: 0,
        overflow: 'hidden',
        background: 'var(--bg-primary)',
        zIndex: 0,
      }}
    >
      {/* Drifting gradient blobs */}
      <div
        style={{
          position: 'absolute', top: '-10%', left: '-5%',
          width: '45vw', height: '45vw', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,192,122,0.28) 0%, rgba(0,192,122,0) 70%)',
          filter: 'blur(40px)',
          animation: 'blobDrift1 26s ease-in-out infinite',
        }}
      />
      <div
        style={{
          position: 'absolute', bottom: '-15%', right: '-10%',
          width: '50vw', height: '50vw', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,109,255,0.22) 0%, rgba(124,109,255,0) 70%)',
          filter: 'blur(40px)',
          animation: 'blobDrift2 32s ease-in-out infinite',
        }}
      />
      <div
        style={{
          position: 'absolute', top: '30%', right: '15%',
          width: '30vw', height: '30vw', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,192,122,0.14) 0%, rgba(0,192,122,0) 70%)',
          filter: 'blur(30px)',
          animation: 'blobDrift3 20s ease-in-out infinite',
        }}
      />

      {/* Faint drifting dot grid for texture/motion */}
      <div
        style={{
          position: 'absolute', inset: -48,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          animation: 'gridDrift 18s linear infinite',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, #000 40%, transparent 90%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, #000 40%, transparent 90%)',
        }}
      />

      {/* Vignette so content stays readable at the edges */}
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 70% 60% at 50% 40%, transparent 0%, var(--bg-primary) 95%)',
        }}
      />
    </div>
  );
}
