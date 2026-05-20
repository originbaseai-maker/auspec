# File Structure

```
auspec/
├── _docs/                    # Obsidian documentation vault
├── public/
│   └── assets/
├── src/
│   ├── components/
│   │   ├── ui/               # shadcn/ui components
│   │   ├── layout/           # Layout components
│   │   ├── studio/           # Studio page components
│   │   └── landing/          # Landing page components
│   ├── hooks/
│   │   ├── useAudioAnalyzer.ts
│   │   └── useVisualizerSettings.ts
│   ├── pages/
│   │   ├── Landing.tsx
│   │   ├── Studio.tsx
│   │   ├── Dashboard.tsx
│   │   └── Settings.tsx
│   ├── store/
│   │   └── useVisualizerStore.ts
│   ├── lib/
│   │   ├── supabase.ts
│   │   └── utils.ts
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   └── main.tsx
├── .env.local
├── .gitignore
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```
