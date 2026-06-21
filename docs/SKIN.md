# Skin — the centralised design system

One place to change how the app looks. Components never hand-write colours,
gradients, radii or shadows — they reference tokens.

## Where the skin lives

| Concern | Source of truth |
|---|---|
| Colours, radii, shadows, fonts, animations | `tailwind.config.js → theme.extend` |
| Signature gradients | `tailwind.config.js → backgroundImage` |
| Page frame (bg, width, nav) | `src/shared/ui/PageShell.tsx` |
| Hero band | `src/shared/ui/dashboard/Hero.tsx` (`bg-hero`) |
| Cards / panels / stats | `src/shared/ui/dashboard/kit.tsx` |
| Brand mark / FICO mark | `FiciumLogo.tsx`, `FicoMark.tsx` |

## Gradient tokens

Reference these as Tailwind classes — never inline a `linear-gradient(...)`:

| Token | Use |
|---|---|
| `bg-hero` | Dark ink hero band |
| `bg-callout` | Dark callout panels |
| `bg-mark` | FICO identity mark backdrop |
| `bg-brand` | Primary brand fill (CTAs, nav, composer) |
| `bg-brand-cta` | Hero action button |
| `bg-brand-soft` | Tinted icon chips |
| `bg-accent` | Multicolour text (`bg-accent bg-clip-text text-transparent`) |
| `bg-edge` / `bg-edge-h` | Hover edges / horizontal accents |
| `bg-rail` | Active nav indicator |

## Re-skinning

- **New hero colour everywhere:** edit `backgroundImage.hero` — one line.
- **New brand gradient:** edit `backgroundImage.brand` — nav, CTAs, composer all follow.
- **New accent palette:** edit `backgroundImage.accent`.

## Adding a screen

```tsx
import { PageShell } from '@/shared/ui'
import { Hero, Panel } from '@/shared/ui/dashboard'

export default function MyScreen() {
  return (
    <PageShell>
      <Hero eyebrow="…" headline={<>…</>} />
      <Panel>…</Panel>
    </PageShell>
  )
}
```

## Enforcement

CI (`.github/workflows/ci.yml`) runs a **skin guard**: `src/shared/ui` and the
advisor must contain zero raw CSS gradients and zero legacy hero hexes. Widen the
guard's folder scope as each feature migrates (see `docs/skin-audit.md`).
