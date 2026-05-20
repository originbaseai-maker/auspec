import { Link } from 'react-router-dom';
import { AudioWaveform, Sliders, Download, Play } from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-black text-white antialiased selection:bg-violet-500/30">
      <Nav />
      <Hero />
      <Features />
      <Preview />
      <Footer />
      <LandingStyles />
    </div>
  );
};

const Logo = () => (
  <div className="flex items-center gap-2.5">
    <img
      src="/auspec-logo.png"
      alt="AuSpec"
      style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        objectFit: 'cover',
        objectPosition: 'center',
        filter:
          'drop-shadow(0 0 8px rgba(59,130,246,0.9)) drop-shadow(0 0 16px rgba(139,92,246,0.5))',
      }}
    />
    <span className="text-[15px] font-semibold tracking-tight">AuSpec</span>
  </div>
);

const Nav = () => (
  <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-black/70 backdrop-blur-xl">
    <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
      <Link to="/" className="flex items-center" aria-label="AuSpec home">
        <Logo />
      </Link>
      <Link
        to="/studio"
        className="rounded-full bg-white px-4 py-1.5 text-[13px] font-medium text-black transition-all hover:bg-white/90 active:scale-[0.98]"
      >
        Open Studio
      </Link>
    </div>
  </nav>
);

const Hero = () => (
  <section className="relative overflow-hidden">
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(99,102,241,0.08),transparent_70%)]"
    />
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_40%_30%_at_50%_100%,rgba(139,92,246,0.05),transparent_70%)]"
    />

    <div className="relative mx-auto max-w-6xl px-6 pt-24 pb-32 sm:pt-32 sm:pb-40">
      <div className="flex flex-col items-center text-center">
        <div className="mb-10 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-medium text-white/70">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Now in public beta
        </div>

        <h1 className="bg-gradient-to-b from-white to-white/70 bg-clip-text text-[40px] font-semibold leading-[1.05] tracking-tight text-transparent sm:text-6xl md:text-7xl">
          Turn Audio Into<br />Living Visuals
        </h1>

        <p className="mt-6 max-w-xl text-base text-white/60 sm:text-lg">
          Upload any track. Generate reactive visuals. Export in seconds.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
          <Link
            to="/studio"
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 px-6 py-3 text-sm font-medium text-white shadow-[0_0_30px_rgba(99,102,241,0.35)] transition-all hover:shadow-[0_0_40px_rgba(139,92,246,0.5)] active:scale-[0.98]"
          >
            <Play className="h-4 w-4 fill-current" />
            Open Studio
          </Link>
          <a
            href="#features"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-6 py-3 text-sm font-medium text-white/80 transition-all hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
          >
            See how it works
          </a>
        </div>

        <div className="mt-24 sm:mt-28">
          <SpectrumRing />
        </div>
      </div>
    </div>
  </section>
);

const SpectrumRing = () => {
  const bars = Array.from({ length: 64 });
  return (
    <div className="relative h-64 w-64 sm:h-80 sm:w-80">
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.15),transparent_70%)] blur-2xl"
      />
      <div className="absolute inset-0 animate-spec-rotate">
        {bars.map((_, i) => {
          const angle = (i / bars.length) * 360;
          return (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 origin-bottom"
              style={{
                transform: `translate(-50%, -100%) rotate(${angle}deg) translateY(-110px)`,
              }}
            >
              <div
                className="w-[3px] rounded-full bg-gradient-to-t from-blue-500 to-violet-400"
                style={{
                  height: '14px',
                  animation: `spec-pulse 1.6s ease-in-out infinite`,
                  animationDelay: `${(i / bars.length) * 1.6}s`,
                  opacity: 0.7,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-24 w-24 rounded-full border border-white/10 bg-white/[0.02] backdrop-blur-sm">
          <div className="flex h-full w-full items-center justify-center">
            <div className="h-3 w-3 animate-pulse rounded-full bg-gradient-to-br from-blue-400 to-violet-500" />
          </div>
        </div>
      </div>
    </div>
  );
};

const features = [
  {
    icon: AudioWaveform,
    title: 'Live Spectrum',
    description: 'Real-time frequency analysis with FFT',
  },
  {
    icon: Sliders,
    title: 'Fully Customizable',
    description: 'Colors, shapes, motion, glow — all yours',
  },
  {
    icon: Download,
    title: 'Export Ready',
    description: 'WebM video export, social formats built in',
  },
];

const Features = () => (
  <section id="features" className="relative border-t border-white/[0.06]">
    <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
      <div className="mx-auto mb-16 max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Built for creators who care about every frame
        </h2>
        <p className="mt-4 text-white/60">
          A focused toolkit that gets out of the way of your sound.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
        {features.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="group relative overflow-hidden rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-6 transition-all duration-300 hover:border-white/15 hover:shadow-[0_0_40px_rgba(99,102,241,0.15)]"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/0 via-transparent to-violet-500/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              style={{
                background:
                  'radial-gradient(circle at top right, rgba(139,92,246,0.12), transparent 60%)',
              }}
            />
            <div className="relative">
              <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-blue-500/20 to-violet-500/20 text-white">
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const Preview = () => (
  <section className="relative border-t border-white/[0.06]">
    <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          See it before you ship it
        </h2>
        <p className="mt-4 text-white/60">
          Preview every change instantly. Tweak until it feels right.
        </p>
      </div>

      <div className="relative">
        <div className="animate-border-glow absolute -inset-px rounded-3xl bg-[length:200%_200%]" />
        <div className="relative aspect-video overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0a]">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.15),transparent_60%)]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 30%, rgba(139,92,246,0.25), transparent 40%), radial-gradient(circle at 80% 70%, rgba(59,130,246,0.25), transparent 40%)',
            }}
          />

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-end gap-1.5 sm:gap-2">
              {Array.from({ length: 32 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 rounded-full bg-gradient-to-t from-blue-500/80 to-violet-400/80 sm:w-2"
                  style={{
                    height: `${20 + Math.abs(Math.sin(i * 0.5)) * 80}px`,
                    animation: 'spec-pulse 1.4s ease-in-out infinite',
                    animationDelay: `${i * 0.04}s`,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/60 to-transparent p-8 sm:p-12">
            <p className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
              Your music. Visualized.
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="border-t border-white/[0.06]">
    <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 py-10 text-center">
      <Logo />
      <p className="text-xs text-white/40">AuSpec © 2025</p>
    </div>
  </footer>
);

const LandingStyles = () => (
  <style>{`
    @keyframes spec-pulse {
      0%, 100% { transform: scaleY(0.6); opacity: 0.5; }
      50%      { transform: scaleY(1.4); opacity: 1; }
    }
    @keyframes spec-rotate {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    .animate-spec-rotate { animation: spec-rotate 40s linear infinite; }

    @keyframes border-glow {
      0%, 100% { background-position: 0% 50%; }
      50%      { background-position: 100% 50%; }
    }
    .animate-border-glow {
      background-image: linear-gradient(120deg,
        rgba(59,130,246,0.6),
        rgba(139,92,246,0.6),
        rgba(59,130,246,0.6),
        rgba(139,92,246,0.6));
      filter: blur(14px);
      opacity: 0.4;
      animation: border-glow 8s ease-in-out infinite;
    }

    @media (prefers-reduced-motion: reduce) {
      .animate-spec-rotate,
      .animate-border-glow,
      [style*="spec-pulse"] {
        animation: none !important;
      }
    }
  `}</style>
);

export default LandingPage;
