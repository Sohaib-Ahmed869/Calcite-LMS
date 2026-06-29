# Calcite LMS — multi-tenant, dynamically-themed portal

A full-stack, end-to-end starter:

- **Frontend/** — Vite + React + Tailwind. A branded admin shell (collapsible sidebar, themed top
  bar, dark mode) whose **entire look re-themes live** from a Branding page (palette, fonts, shape,
  logos, favicon). Themes are driven by CSS variables applied at runtime by `BrandingProvider`.
- **Backend/** — Node + Express. Tenant-resolved branding API, JWT auth, and image uploads. Zero
  external services — data persists to a JSON file (`Backend/src/data/store.json`), uploads to
  `Backend/uploads/`.

## How it fits together

```
Browser ──X-Tenant-Code──▶ GET /api/tenant/branding (public)  ──▶ applyBranding() sets --color-* vars
        ──Bearer token───▶ PUT /api/tenant/branding (admin)   ──▶ persists per-tenant overrides
        ──multipart──────▶ POST /api/tenant/branding/asset     ──▶ saves logo/favicon, returns /uploads/..
```

The frontend `:root` defaults in `Frontend/src/index.css` mirror `Backend/src/defaults.js`
(`DEFAULT_BRANDING.colors`) exactly, so the app renders correctly even before/without the API.

## Run it (two terminals)

### 1) Backend
```bash
cd Backend
npm install
npm run dev        # or: npm start   → http://localhost:5050
```
The store + an admin user are seeded automatically on first run.

### 2) Frontend
```bash
cd Frontend
npm install
npm run dev        # → http://localhost:5180  (proxies /api and /uploads to :5050)
```

Open http://localhost:5180 and sign in:

| Tenant       | Email                     | Password   |
|--------------|---------------------------|------------|
| calcite      | `admin@calcite.test`      | `admin123` |
| northwood    | `admin@northwood.test`    | `admin123` |

> To preview the second tenant's theme, set `localStorage.setItem('uc.tenant','northwood')` in the
> browser console and reload (or set `VITE_TENANT_CODE=northwood`).

## Branding page

`Admin → Branding` (`/admin/branding`) lets you edit **Identity** (name, logos, favicon),
**Palette** (40+ presets across 4 categories + per-token colour pickers, light/dark), **Typography**
(curated Google fonts per role), **Shape** (corners / borders / shadow), and **Templates**
(one-tap palette+font+shape combos). Every change applies live; **Save** persists it to the backend.

## API reference

| Method | Path                              | Auth  | Notes                                    |
|--------|-----------------------------------|-------|------------------------------------------|
| GET    | `/api/health`                     | —     | Liveness check                           |
| POST   | `/api/auth/login`                 | —     | `{ email, password }` → `{ token, user }`|
| GET    | `/api/auth/me`                    | Bearer| Current user                             |
| GET    | `/api/tenant/branding`            | —     | Resolved branding (by `X-Tenant-Code`)   |
| PUT    | `/api/tenant/branding`            | Bearer| Persist branding edits                   |
| POST   | `/api/tenant/branding/asset`      | Bearer| `multipart/form-data` (`file`, `type`)   |

Every request carries an `X-Tenant-Code` header (default `calcite`).
```
