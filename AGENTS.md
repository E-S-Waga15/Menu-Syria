<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# File architecture

Feature-based structure under `src/`. Put new code where its siblings live — never invent parallel locations.

```
src/
├── app/[lang]/            # routes ONLY (thin pages: fetch → pass props). All UI logic lives in features/
│   ├── (marketing)/       # public site: shares SiteHeader/SiteFooter layout
│   ├── (auth)/            # centered minimal layout: login, register/*
│   ├── menu|store/[slug]/ # customer storefronts + their isolated /about pages (NO site chrome — QR privacy)
│   ├── dashboard/ agent/  # role dashboards (shell layouts)
│   └── admin/(panel)/     # admin console behind AdminGuard; admin/login sits OUTSIDE the group
├── components/ui/         # shadcn (Base UI variant) — edit only for global styling decisions
├── components/shared/     # cross-feature primitives (Logo, Reveal, FieldError, FileDropzone…)
├── features/<name>/       # components/ + services.ts + schemas.ts + store.ts per feature
├── lib/                   # types.ts (domain contracts), api/ (client + query-keys), mock/, seo/, validation.ts
├── i18n/                  # config, dictionaries/ar|en.json, get-dictionary (server), client.tsx (useI18n)
├── providers/ stores/     # app-level providers; cross-feature zustand stores (cart, favorites, ui)
└── proxy.ts               # locale routing (MUST stay inside src/, not repo root — this Next version's middleware replacement; src/ project ⇒ proxy.ts silently never runs from the repo root)
```

Rules:
- **Pages are server components** that fetch via `features/*/services.ts` and pass data down. `"use client"` only for interactivity (forms, stores, observers). SEO content must be in the initial HTML.
- Every service goes through `lib/api/client.ts` (`IS_MOCK` switch) — never import `lib/mock/data.ts` from components.
- All user-facing strings come from `i18n/dictionaries/*.json` (both `ar` and `en`, always). Use logical CSS properties (`ps-`/`ms-`/`start-`) — the site is RTL-first.
- No box shadows anywhere (flat design; tokens are zeroed in globals.css). Arbitrary transition lists must name `translate,scale` — not `transform` (Tailwind v4).
- Restaurants and stores share the storefront machinery (`features/public-menu` renders `Business` + `CatalogItem` with a `StorefrontCopy` label pack). Don't fork it — parameterize it.

# Forms: react-hook-form + zod (mandatory)

Every form uses `useForm` + `zodResolver`. No hand-rolled `useState` field state, no silently-disabled submit buttons.

- **Schemas are factories** in `features/<name>/schemas.ts`: they take `t.validation` (the localized message pack) and return the zod schema. Export the inferred type: `export type XValues = z.infer<ReturnType<typeof xSchema>>`. Shared refinements (e.g. `syrianPhone`) live in `lib/validation.ts`.
- New validation messages go into the `validation` section of BOTH dictionaries.
- Pattern per field: `{...register("field")}` + `aria-invalid={!!errors.field}` + `<FieldError message={errors.field?.message} />` (from `components/shared/field-error`). Add `noValidate` on the `<form>`.
- Controlled inputs (Base UI `Select`, `InputOTP`, color pickers) go through `<Controller control={control} …>` — `register()` is for native inputs only.
- Use `useWatch({ control, name })` for live values — never `watch()` (it disables React Compiler optimization; lint flags it).
- Multi-step wizards: keep one schema for the whole form, map fields per step (`stepFields`), gate steps with `await trigger(stepFields[step])`. Buttons stay enabled; validation errors explain what's missing.
- `mode: "onTouched"` is the default; use `"onChange"` only when something recomputes live from the values (e.g. the cart's WhatsApp URL).
