import { Sparkles } from 'lucide-react'

export function ParticlesPanel() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div
        className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
        style={{
          background:
            'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(236,72,153,0.15))',
          border: '1px solid rgba(245,158,11,0.3)',
        }}
      >
        <Sparkles className="h-5 w-5 text-amber-400" />
      </div>
      <p className="mb-1 text-sm font-medium text-white">Coming soon ✨</p>
      <p className="text-[11px] text-white/50">Pro Feature</p>
      <p className="mt-3 max-w-[200px] text-[10px] leading-relaxed text-white/40">
        Reactive particle systems that bloom on beat. Available in the next
        release.
      </p>
    </div>
  )
}

export default ParticlesPanel
