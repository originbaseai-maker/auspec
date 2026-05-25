import { useEffect, useRef, useState, type JSX } from 'react'
import {
  AlertCircle,
  Image as ImageIcon,
  Palette,
  Plus,
  Trash2,
  Type as TypeIcon,
  X,
} from 'lucide-react'
import { useBrandKitStore } from '@/store/useBrandKitStore'
import {
  brandKitSize,
  MAX_BRAND_KIT_BYTES,
  MAX_BRAND_LOGO_BYTES,
} from '@/types/brandKit'
import type { FontFamily } from '@/types/layer'

const AVAILABLE_FONTS: FontFamily[] = [
  'Inter',
  'Bebas Neue',
  'Playfair Display',
  'Pacifico',
  'Space Mono',
]

interface Props {
  open: boolean
  onClose: () => void
}

type Tab = 'colors' | 'logos' | 'fonts'

/**
 * Brand Kit modal — three tabs (Colors / Logos / Fonts) over a single
 * persisted brand kit. Body scrolls; backdrop and X close. Locks body
 * scroll while open.
 */
export function BrandKitModal({ open, onClose }: Props): JSX.Element | null {
  const kit = useBrandKitStore((s) => s.kit)
  const setName = useBrandKitStore((s) => s.setName)
  const addColor = useBrandKitStore((s) => s.addColor)
  const removeColor = useBrandKitStore((s) => s.removeColor)
  const updateColor = useBrandKitStore((s) => s.updateColor)
  const addLogo = useBrandKitStore((s) => s.addLogo)
  const removeLogo = useBrandKitStore((s) => s.removeLogo)
  const updateLogo = useBrandKitStore((s) => s.updateLogo)
  const setFont = useBrandKitStore((s) => s.setFont)

  const [tab, setTab] = useState<Tab>('colors')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  const totalSize = brandKitSize(kit)
  const sizeWarning = totalSize > MAX_BRAND_KIT_BYTES * 0.8

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Please pick an image file.')
      return
    }
    if (file.size > MAX_BRAND_LOGO_BYTES) {
      alert(
        `Image too large (max ${Math.round(MAX_BRAND_LOGO_BYTES / 1024)} KB per logo). Brand Kit storage is limited.`,
      )
      return
    }
    if (totalSize + file.size > MAX_BRAND_KIT_BYTES) {
      alert('Brand Kit storage full. Remove a logo first.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        addLogo(
          file.name.replace(/\.[^.]+$/, ''),
          reader.result,
          file.size,
        )
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Brand Kit"
        className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[90vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border bg-[#0a0a0a] shadow-2xl"
        style={{ borderColor: '#2a2a2a' }}
      >
        <div
          className="flex items-center justify-between border-b px-5 py-4"
          style={{ borderColor: '#1a1a1a' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg text-base"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
              aria-hidden="true"
            >
              🎨
            </div>
            <div>
              <input
                type="text"
                value={kit.name}
                onChange={(e) => setName(e.target.value)}
                className="bg-transparent text-base font-semibold text-white outline-none"
                placeholder="My Brand"
                aria-label="Brand Kit name"
              />
              <p className="text-[10px] text-white/40">
                Brand Kit · saved locally
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-md text-white/60 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className="flex shrink-0 gap-1 border-b px-5 pt-3"
          style={{ borderColor: '#1a1a1a' }}
          role="tablist"
        >
          {(
            [
              {
                id: 'colors' as const,
                label: 'Colors',
                icon: Palette,
                count: kit.colors.length,
              },
              {
                id: 'logos' as const,
                label: 'Logos',
                icon: ImageIcon,
                count: kit.logos.length,
              },
              {
                id: 'fonts' as const,
                label: 'Fonts',
                icon: TypeIcon,
                count:
                  (kit.fonts.primary ? 1 : 0) +
                  (kit.fonts.secondary ? 1 : 0),
              },
            ] as const
          ).map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className="flex items-center gap-2 rounded-t-lg px-3 py-2 text-[12px] font-medium transition-colors"
              style={{
                color: tab === id ? '#fff' : 'rgba(255,255,255,0.5)',
                borderBottom:
                  tab === id ? '2px solid #3b82f6' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
              <span
                className="rounded-full px-1.5 py-0.5 text-[9px]"
                style={{
                  background: '#1a1a1a',
                  color: 'rgba(255,255,255,0.5)',
                }}
              >
                {count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'colors' && (
            <div className="space-y-2">
              {kit.colors.length === 0 && (
                <p className="text-center text-[12px] text-white/40 py-8">
                  No brand colors yet. Add your brand's color palette below.
                </p>
              )}
              {kit.colors.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 rounded-lg border p-2"
                  style={{ borderColor: '#1f1f1f' }}
                >
                  <input
                    type="color"
                    value={c.value.startsWith('#') ? c.value : '#000000'}
                    onChange={(e) =>
                      updateColor(c.id, { value: e.target.value })
                    }
                    className="h-10 w-12 cursor-pointer rounded border"
                    style={{ borderColor: '#2a2a2a' }}
                    aria-label={`${c.name} color swatch`}
                  />
                  <input
                    type="text"
                    value={c.name}
                    onChange={(e) =>
                      updateColor(c.id, { name: e.target.value })
                    }
                    placeholder="Color name (e.g. Primary)"
                    className="flex-1 rounded border bg-[#0f0f0f] px-2 py-1.5 text-[12px] text-white outline-none focus:border-[#3b82f6]"
                    style={{ borderColor: '#2a2a2a' }}
                  />
                  <input
                    type="text"
                    value={c.value}
                    onChange={(e) =>
                      updateColor(c.id, { value: e.target.value })
                    }
                    className="w-24 rounded border bg-[#0f0f0f] px-2 py-1.5 text-[11px] font-mono text-white outline-none focus:border-[#3b82f6]"
                    style={{ borderColor: '#2a2a2a' }}
                    aria-label="Color hex"
                  />
                  <button
                    type="button"
                    onClick={() => removeColor(c.id)}
                    aria-label={`Remove ${c.name}`}
                    className="flex h-8 w-8 items-center justify-center rounded text-white/40 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addColor('New Color', '#3b82f6')}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed py-3 text-[12px] text-white/60 hover:text-white"
                style={{ borderColor: '#2a2a2a' }}
              >
                <Plus className="h-4 w-4" />
                Add color
              </button>
            </div>
          )}

          {tab === 'logos' && (
            <div className="space-y-3">
              {sizeWarning && (
                <div
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] text-amber-400"
                  style={{
                    borderColor: 'rgba(245,158,11,0.3)',
                    background: 'rgba(245,158,11,0.05)',
                  }}
                >
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Storage almost full ({Math.round(totalSize / 1024)} KB /{' '}
                  {Math.round(MAX_BRAND_KIT_BYTES / 1024)} KB)
                </div>
              )}
              {kit.logos.length === 0 && (
                <p className="text-center text-[12px] text-white/40 py-8">
                  No brand logos yet. Upload your logo(s) below.
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {kit.logos.map((l) => (
                  <div
                    key={l.id}
                    className="rounded-lg border p-2"
                    style={{ borderColor: '#1f1f1f' }}
                  >
                    <div className="mb-2 flex aspect-square items-center justify-center rounded bg-[#0f0f0f]">
                      <img
                        src={l.imageSrc}
                        alt={l.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <input
                      type="text"
                      value={l.name}
                      onChange={(e) =>
                        updateLogo(l.id, { name: e.target.value })
                      }
                      className="w-full rounded border bg-[#0f0f0f] px-2 py-1 text-[10px] text-white outline-none focus:border-[#3b82f6]"
                      style={{ borderColor: '#2a2a2a' }}
                      aria-label={`${l.name} name`}
                    />
                    <button
                      type="button"
                      onClick={() => removeLogo(l.id)}
                      className="mt-1 w-full rounded border px-1 py-1 text-[9px] text-white/40 hover:text-red-400"
                      style={{ borderColor: '#2a2a2a' }}
                    >
                      <Trash2
                        className="inline h-2.5 w-2.5"
                        aria-hidden="true"
                      />{' '}
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed text-[11px] text-white/60 hover:text-white"
                  style={{ borderColor: '#2a2a2a' }}
                >
                  <div className="text-center">
                    <Plus className="mx-auto h-5 w-5" />
                    <p className="mt-1">Add logo</p>
                  </div>
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="sr-only"
                aria-hidden="true"
                tabIndex={-1}
              />
              <p className="text-[9px] text-white/30">
                Max {Math.round(MAX_BRAND_LOGO_BYTES / 1024)} KB per logo.
                Total storage: {Math.round(totalSize / 1024)} KB /{' '}
                {Math.round(MAX_BRAND_KIT_BYTES / 1024)} KB
              </p>
            </div>
          )}

          {tab === 'fonts' && (
            <div className="space-y-4">
              {(['primary', 'secondary'] as const).map((slot) => (
                <div key={slot}>
                  <p className="mb-2 text-[10px] uppercase tracking-wider text-white/40">
                    {slot === 'primary' ? 'Primary Font' : 'Secondary Font'}
                  </p>
                  <p className="mb-2 text-[10px] text-white/30">
                    {slot === 'primary'
                      ? 'Used for titles + headings on new text layers'
                      : 'Used for subtitles + body'}
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setFont(slot, null)}
                      className="rounded border px-2 py-2 text-[11px]"
                      style={{
                        borderColor:
                          kit.fonts[slot] === null ? '#3b82f6' : '#2a2a2a',
                        background:
                          kit.fonts[slot] === null
                            ? 'rgba(59,130,246,0.15)'
                            : '#1a1a1a',
                        color:
                          kit.fonts[slot] === null
                            ? '#fff'
                            : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      None
                    </button>
                    {AVAILABLE_FONTS.map((font) => {
                      const active = kit.fonts[slot] === font
                      return (
                        <button
                          key={font}
                          type="button"
                          onClick={() => setFont(slot, font)}
                          className="rounded border px-2 py-2 text-[11px]"
                          style={{
                            borderColor: active ? '#3b82f6' : '#2a2a2a',
                            background: active
                              ? 'rgba(59,130,246,0.15)'
                              : '#1a1a1a',
                            color: active
                              ? '#fff'
                              : 'rgba(255,255,255,0.65)',
                            fontFamily: `"${font}", sans-serif`,
                          }}
                        >
                          {font}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default BrandKitModal
