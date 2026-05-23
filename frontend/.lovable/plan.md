## Goal

Recreate the GitHub project `aryanjh1001/Skillarion_AIClaassroom` inside this Lovable project — same UI structure, layouts, dashboards, and components — and swap the color palette to **Deep Plum purple**. Fonts come from the repo unchanged (Inter for body, Outfit for display).

## Source of truth

Repo: https://github.com/aryanjh1001/Skillarion_AIClaassroom (branch `main`)
- Stack in the repo: Vite + React 19 + React Router DOM 7 + Tailwind v3 + Firebase + framer-motion + recharts + tsparticles
- 13 pages, 17 components, Auth/Theme contexts, Firestore + leave services, Firebase config
- Repo body font is currently `Times New Roman` (override in `index.css`); the Tailwind `font-sans` is Inter, `font-display` is Outfit. You asked to keep repo fonts as-is — I'll preserve that exact setup (no font swap).

## Approach

This Lovable project ships with TanStack Start + Tailwind v4. The repo is plain Vite + React Router DOM + Tailwind v3. Two viable options:

**A. Migrate to plain Vite + React Router DOM (mirror the repo's stack 1:1).** Replace the TanStack Start scaffolding so files drop in essentially verbatim. Lowest risk for keeping the UI identical.

**B. Port pages onto TanStack Start (keep current stack).** Rewrite each `react-router-dom` route as a TanStack file route, port Tailwind v3 tokens into Tailwind v4 CSS, recolor. More rewriting per file.

**Recommendation: Option A.** You explicitly said "keep the entire UI layout, structure, and components exactly the same." Mirroring the repo's stack avoids accidental layout drift from framework conversion.

## What I'll do

1. **Reset scaffolding to match the repo**
   - Replace `package.json` deps with the repo's set (React 19, react-router-dom 7, tailwind v3, framer-motion, recharts, react-icons, lucide-react, firebase, tsparticles).
   - Remove TanStack Start files (`src/router.tsx`, `src/routes/`, `src/start.ts`, `src/server.ts`, `wrangler.jsonc`, etc.).
   - Add `index.html`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js` matching the repo.

2. **Copy the repo's source verbatim** into `src/`:
   - `App.tsx`, `main.tsx`, contexts, layouts, pages, components, services, `firebase.ts`, assets.

3. **Apply the Deep Plum purple theme** by editing only `tailwind.config.js` + `src/index.css`:
   - Replace the `navy` palette (primary) with Deep Plum scale built around `#581c87`, `#9333ea`, `#b794f4`, `#faf5ff`.
   - Replace the `gold` accent palette with a complementary plum/lavender accent so highlights, scrollbars, gradient text, and button glows all read purple.
   - Update `boxShadow` (`gold`, `goldHover`, `blue`, etc.) to purple-tinted shadows.
   - Update `gradient-text-*` and other CSS gradients in `index.css` to purple gradients.
   - Update body `::before` star/dot background to purple tones.
   - Keep all spacing, sizing, animations, and component classnames unchanged — only color values change.

4. **Fonts**: leave the repo's `index.css` + Tailwind `fontFamily` block exactly as the repo has them. No swap to Inter/Roboto enforced globally — per your "don't change anything, same as repo" instruction.

5. **Firebase**: keep `src/firebase.ts` as-is. It reads env vars at runtime; the app will render but Firebase calls will need keys later (separate task — not part of this redesign).

## Out of scope

- Functional changes to dashboards, auth, Firestore, or routing logic
- Font changes (keeping repo defaults per your answer)
- Firebase credentials setup
- Moving anything to Lovable Cloud

## Technical notes

- This swaps the project off TanStack Start. Lovable's template default goes away in favor of the repo's Vite-only stack. Future Lovable features that assume TanStack routing won't apply.
- Tailwind stays v3 to match the repo (not v4).
- `wrangler.jsonc` (Cloudflare Worker config) gets removed; build target becomes standard Vite static output.

## Confirm before I build

- OK to migrate this project off TanStack Start and onto the repo's plain Vite + React Router DOM stack? (Required to keep the UI identical with minimal rewriting.)
- OK to leave fonts exactly as the repo has them (body uses Times New Roman; Tailwind utility classes still expose Inter/Outfit)? Your earlier message asked for Inter/Roboto globally, but your follow-up said "don't change anything, same as in repo" — I'll follow the follow-up unless you say otherwise.
