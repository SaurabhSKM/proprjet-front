# Proprjet Frontend — Codebase Reference

Scientific fuel property database and blend optimizer — React frontend.

---

## Tech stack

| Concern | Library | Version | Why |
|---|---|---|---|
| Framework | React | 19 | Component model, concurrent features |
| Language | TypeScript | 5.8 | Type safety for complex API responses |
| Build | Vite | 7 | Fast HMR, path aliases, dev proxy |
| Routing | React Router | v7 | Multi-page SPA routing |
| Server state | TanStack Query | v5 | Async data, caching, polling for long-running optimizer runs |
| Client state | Zustand | v5 | Per-session UI state (pool selection, form inputs, active tab) |
| HTTP | Axios | 1.x | Request interceptors for Keycloak token injection |
| Tables | AG Grid Community | v35 | Column pinning, row grouping, filtering — all free tier |
| Charts | Plotly.js + react-plotly.js | 3.x | Scientific plots: distillation curves, Pvap, heatmaps, bar charts |
| Charts (simple) | Chart.js + react-chartjs-2 | 4.x | Lighter bar/line charts where Plotly is overkill |
| Styling | Tailwind CSS | v4 | Utility-first, dark theme |
| UI components | MUI | v7 | Dialog, Drawer, Snackbar |
| Toasts | Sonner | 2.x | Notification toasts |
| File uploads | React Dropzone | 14.x | Drag-and-drop file inputs |
| Testing | Vitest | 4.x | Unit and component tests |
| Auth | Keycloak-js | 26.x | Via `useAuth` hook + `AuthenticatedClientProvider` |
| Form validation | React Hook Form | 7.x | `useForm`, `register`, `handleSubmit` for all forms |
| Schema validation | Zod | 3.x | Runtime type-safe schemas, coercion, server-error shaping |
| RHF + Zod bridge | @hookform/resolvers | 3.x | `zodResolver` connects Zod schemas to RHF |
| Linting | ESLint + Prettier | 9.x / 3.x | Project config |

> **Not installed (despite appearing in early specs):** Framer Motion.

---

## Project structure

```
src/
  api/             # TanStack Query hooks, one file per domain
    client.ts       # Axios singleton + setAuthToken()
    AuthenticatedClientProvider.tsx  # calls setAuthToken on Keycloak token changes
    substances.ts
    analyses.ts
    classifications.ts
    properties.ts
    units.ts
    admin.ts
    optimizer.ts
    models.ts
    gcxgc.ts
    projects.ts
    values.ts       # useDeleteConstant — hard-delete erroneous constant values
  components/
    charts/          # Plotly chart components
      CarbonProfileChart.tsx
      DistillationChart.tsx   # includes PvapChart
      GCxGCHeatmap.tsx
    layout/
      Layout.tsx      # sidebar + main shell + theme toggle
    tables/
      PropertyTable.tsx       # 38-property display, grouped
    ui/
      LoadingScreen.tsx
      Toast.tsx               # context-based toast notifications
  hooks/
    useTheme.ts       # dark/light theme toggle, localStorage persistence
  constants/
    eos.ts           # JETX_SPEC, EOS_DIST_GUIDELINES, SCENARIO_DESCRIPTIONS
  pages/
    substances/
      SubstancesPage.tsx      # AG Grid list + create/upload/delete
      SubstanceDetail.tsx     # 4-tab: Overview/Analyses/Properties/Timeline
      AnalysisCard.tsx        # expandable card: constants, text values (inline edit/delete), composition, series charts
      AnalysisDetailPage.tsx  # standalone /analyses/:id route
    classifications/
      ClassificationsPage.tsx # tree navigator + substance list
    models/
      ModelsPage.tsx          # model CRUD + IO editor + execute panel
    optimizer/
      OptimizerPage.tsx       # shell: PoolSidebar + 6 tabs
      PoolSidebar.tsx         # substance selector + data completeness + availability limits
      Tab1Predefined.tsx      # run config form + results + batch quantities + run history
      Tab2Manual.tsx          # manual blend evaluator
      Tab3Studio.tsx          # per-family profile controls + component caps
      Tab4Distillation.tsx    # EOS distillation + Pvap (blend & target modes)
      Tab5Reference.tsx       # static model documentation
      Tab6History.tsx         # full run history with property table and delete
    gcxgc/                   # GCxGC heatmap, family table, isomer mapping
    projects/                # Project list
    admin/
      AdminPage.tsx           # 3-tab: Injection / Properties / Units+Converter
  store/
    optimizerStore.ts  # Zustand: pool selection, targets, constraints, last run composition
  types/
    index.ts           # TypeScript interfaces for all API responses
  App.tsx              # route definitions
  main.tsx             # QueryClient + ToastProvider + BrowserRouter setup
  index.css            # design tokens, theme blocks, utility classes, animations
report/
  thesis.tex           # Master's thesis LaTeX source (Ecole Polytechnique / IFPEN)
  bibliography.bib     # BibTeX references (15 entries)
```

---

## Theming system

Two themes toggled via `data-theme` attribute on `<html>`, persisted in `localStorage` key `proprjet-theme`.

- **Dark** (default, `:root`): deep navy/slate palette for long working sessions
- **Light** (`[data-theme="light"]`): warm blue-grey for reports and exports

Hook: `src/hooks/useTheme.ts` — reads localStorage on mount (or system preference), writes attribute on toggle.

Anti-flash script in `index.html <head>` sets `data-theme` before React hydrates, preventing white flash.

Toggle button (sun/moon icon) lives in the sidebar bottom zone in `Layout.tsx`.

All design tokens are CSS custom properties (`var(--bg-base)`, `var(--accent)`, etc.). Components use inline styles referencing these tokens — never raw hex. This ensures both themes work without any component changes.

Key tokens: `--bg-base`, `--bg-surface`, `--bg-elevated`, `--bg-overlay`, `--border`, `--border-mid`, `--border-hi`, `--text-primary`, `--text-secondary`, `--text-muted`, `--accent`, `--accent-hover`, `--accent-muted`, `--accent-glow`, `--sidebar-bg`, `--success`, `--warning`, `--danger`.

---

## Typography

- **DM Serif Display** — display headings (login page title, wordmark). Loaded via Google Fonts in `index.html`.
- **Inter** — body text. Served from local `@font-face` (`src/assets/fonts/Inter.ttf`).
- **JetBrains Mono** — numeric cells, code, composition strings. CSS system fallback stack.

Logo images use `.logo-adaptive` class: `brightness(0) invert(0.82)` in dark mode, natural in light mode.

---

## Auth

Keycloak-js via the `useAuth` hook. `AuthenticatedClientProvider` calls `setAuthToken(token)` in a `useEffect` whenever the Keycloak token changes, keeping the Axios singleton authenticated without requiring every hook to call `useAxios()`.

`keycloak.init()` uses `responseMode: "fragment"` and `checkLoginIframe: false`. The fragment mode avoids the third-party iframe block; disabling the login iframe check removes the need for a `silent-check-sso.html` redirect page entirely. 

`AuthContext` exposes: `keycloak`, `initializing`, `authenticated`, `token`, `username`, `roles`, `isAdmin`, `login`, `logout`.

**Role-based access (RBAC):** Roles (`app-admin`, `app-user`) are defined in Keycloak and carried in the JWT under `realm_access.roles`. The frontend reads them from `keycloak.tokenParsed` after init. `isAdmin` is derived from the roles array. **Currently hardcoded to `true`** while Keycloak role assignment is being configured — restore the derivation logic in `AuthProvider.tsx:97` once roles are set up. All RBAC guards (`AdminPage` redirect, delete button visibility, backend write guards) are commented out with `# TODO: re-enable after Keycloak roles configured` markers.

---

## Form validation pattern

All forms use **React Hook Form + Zod**. Schemas live in `src/lib/schemas.ts` (one `z.object` per form, exported with its inferred type).

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { MySchema, type MyFormValues } from '@/lib/schemas'

const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<MyFormValues>({
  resolver: zodResolver(MySchema),
  defaultValues: { field: '' },
})

// Server errors:
onError: e => setError('root', { message: e.message })
// Access in JSX: errors.root?.message
```

**Conventions:**
- `register(name)` requires `as const` assertion when `name` comes from a typed array to preserve the literal type.
- `setError('root', ...)` is used for server-side errors returned from mutations (not field-level).
- `reset()` is called in `onSuccess` callbacks and Cancel handlers.
- `project_year` uses `z.preprocess(...)` to coerce empty strings and `NaN` to `null` before number validation.
- Zod v4 error params use `{ error: 'msg' }` — not `{ invalid_type_error: 'msg' }` (v3 API).
- When two `useForm` calls exist in the same module (e.g. `AdminPage`), destructure with prefixed names (`regUnit`, `submitUnit`, `resetUnit`, `unitErrors`) to avoid collisions.

**Forms migrated:**
| File | Form |
|---|---|
| `src/lib/schemas.ts` | Central schema definitions (8 schemas) |
| `pages/projects/ProjectsPage.tsx` | `ProjectForm` — create/edit project |
| `pages/classifications/ClassificationsPage.tsx` | Add classification |
| `pages/models/ModelsPage.tsx` | Create model |
| `pages/substances/SubstancesPage.tsx` | Create substance modal |
| `pages/substances/AnalysisCard.tsx` | `EditMetaForm`, `ConstantValueRow`, `CompositionSection` |
| `pages/admin/AdminPage.tsx` | `PropertiesPanel`, `UnitsPanel` |

---

## State management pattern

```
TanStack Query   →  everything from the server (substances, runs, pool metadata)
Zustand          →  per-session UI state (pool selection, form inputs, active tab,
                     last run composition for EOS calls)
Local useState   →  ephemeral component state (modal open, error messages)
```

Server data never lives in Zustand. Zustand never calls the API directly.

---

## Multi-user considerations

- `useRuns` has `staleTime: 30_000` and `refetchOnWindowFocus: true` so concurrent users see each other's runs within 30 seconds
- No optimistic updates anywhere — all mutations wait for server confirmation
- Zustand state is per-browser-tab, not shared across users
- EOS pseudo-component cache is server-side; `POST /eos/invalidate-cache` is called automatically after every pseudo-library injection

---

## Pages and routes

| Route | Component | Description |
|---|---|---|
| `/` | → `/substances` | Redirect |
| `/substances` | SubstancesPage | Substance library, AG Grid table |
| `/substances/:name` | SubstanceDetail | Detail: Overview, Analyses, Properties, Timeline |
| `/analyses/:id` | AnalysisDetailPage | Standalone analysis view |
| `/classifications` | ClassificationsPage | Tree navigator + substance list |
| `/models` | ModelsPage | Model CRUD, IO editor, execute |
| `/optimizer` | OptimizerPage | Main 6-tab optimizer tool |
| `/gcxgc` | GCxGCPage | GC×GC heatmap, family table, isomer mapping editor |
| `/projects` | ProjectsPage | Project list |
| `/admin` | AdminPage (Injection) | File upload + injection status (admin-only when RBAC enabled) |
| `/admin/properties` | AdminPage (Properties) | Property dictionary CRUD |
| `/admin/units` | AdminPage (Units) | Units CRUD + converter |
| `/admin/status` | AdminPage (Status) | Live DB record counts |

---

## Optimizer tabs

| Tab | Name | Description |
|---|---|---|
| 1 | Predefined | Run config (10 scenarios, sparsity, family/property constraints) + collapsible config panel + results + comparison panel + batch calculator + run history |
| 2 | Manual Evaluator | Arbitrary composition → compute all properties |
| 3 | Studio | Per-family C6-C25 profile controls + component caps — for advanced blend design |
| 4 | Distillation | EOS TBP distillation + Pvap (blend or target spec mode) |
| 5 | Model Reference | Static documentation of all property models and formulas |
| 6 | History | Full run history with property table toggle and delete (admin-only when RBAC enabled) |

**Comparison panel** (Tab 1 bottom): saves results across runs for side-by-side comparison; card view or full property-table view.

**Diagnose button** (Tab 1): `POST /optimizer/diagnose` runs an LP pre-check on availability + family constraints before committing to a full solve. Returns `feasible`, `lp_errors`, `issues`, and per-family `pool_min`/`pool_max` ranges.

---

## TypeScript conventions

- `strict: true` + `noUnusedLocals: true` enforced in CI (`tsc -b` must exit 0).
- All 31 database tables have corresponding interfaces in `src/types/index.ts`.
- Zero `any` in production code. Test files may use `as unknown as T` for partial mock objects that don't satisfy TanStack Query's full `UseQueryResult` shape.
- `ComputedProperties` has no index signature — use `as unknown as Record<string, number | null>` when dynamic key access is needed (e.g., in property table renderers).
- Mapped types filtering function keys: use `(...args: never[]) => unknown` instead of the banned `Function` type (`@typescript-eslint/no-unsafe-function-type`).
- `@ts-ignore` must carry a description comment (`// @ts-ignore -- reason`) to satisfy `@typescript-eslint/ban-ts-comment`.
- Unused destructured parameters in `mutationFn`: prefix with `_` (e.g., `{ noteId, runId: _runId }`).

---

## Key type shapes (common gotchas)

| Type | Notes |
|---|---|
| `PropertyConstraint` | `{ mode: 'off'\|'min'\|'max'\|'range', lo: number, hi: number }` — no `value` field |
| `SparsityConfig` | `{ mode: SparsityMode, threshold_pct: number, n_components: number }` — field is `threshold_pct`, not `threshold`; `n_components` is always `number` (use `0` not `null`) |
| `OptimizationResult` | Has `result_id`, not `run_id` (that lives on `OptimizationRun`); required: `eos_distillation_pts`, `eos_pvap_pts`, `sparsity_desc` (all nullable) |
| `Analysis` | No `project_id` or `date_recorded`; use `created_at` for date display |
| `UseQueryResult` (mocks) | Has 20+ required fields — always double-cast: `{ data } as unknown as ReturnType<typeof useHook>` |

---

## Dev setup

```bash
# Create conda environment
conda create -n proprjet-front nodejs=22 -c conda-forge -y
conda activate proprjet-front

# Install dependencies
npm install

# Start dev server (proxies /api to http://localhost:5001)
npm run dev
```

`vite.config.ts` proxies `/api/*` to `http://localhost:5001` so no CORS issues in development.

### Compile thesis report

```bash
cd report
pdflatex thesis && biber thesis && pdflatex thesis && pdflatex thesis
```

Or upload `thesis.tex` + `bibliography.bib` to Overleaf — it handles the biber step automatically.

---

## Key decisions

**TanStack Query over RTK Query** — the optimizer run pattern (submit → poll until results → trigger EOS calls) maps naturally to TanStack's `refetchInterval` and `enabled` options.

**AG Grid over MUI DataGrid** — column pinning and row grouping are paywalled in MUI DataGrid Pro. AG Grid Community provides both free.

**Zustand over Redux** — the only global state needed is optimizer UI state. Redux overhead is not justified.

**No WebSockets** — all real-time updates (run completion, injection status) are handled by polling.

**Inline styles + CSS custom properties over Tailwind color classes** — the two-theme system requires all colors to go through CSS variables. Tailwind's static color classes don't update on `data-theme` change, so all component colors are written as `style={{ color: 'var(--token)' }}`.

---

## Architectural changes & bug fixes

### 2026-05-15 — Initial wiring

**Auth wiring (`App.tsx` + `api/client.ts`)**
`setAuthToken(token)` is now called in a `useEffect` inside `App` whenever the Keycloak token changes. Previously nothing called `setAuthToken`, so all requests were unauthenticated.

**Auth initializing flash (`AuthProvider` + `AuthContext`)**
Added `initializing: boolean` state to `AuthProvider`. `App` shows `<LoadingScreen />` while Keycloak's async `init()` is in-flight, preventing a flash of `<LoginPage />` for already-authenticated users on refresh.

**Missing providers (`main.tsx`)**
Added `<BrowserRouter>` and `<QueryClientProvider client={queryClient}>` wrappers. Both were absent, causing React Router hooks and TanStack Query hooks to throw on mount.

**Keycloak silent SSO fix (`AuthProvider`)**                                                                                                                   
`check-sso` with `responseMode: "query"` hit a browser third-party iframe block. Fixed by switching to `responseMode: "fragment"` and setting 
`checkLoginIframe : false`, which removes the need for a silent SSO redirect page entirely.   

**Keycloak refresh redirect bug (`AuthProvider`)**
`updateToken(60)` returns `false` when the token is still valid. The old code called `keycloak.login()` on `false`, causing a hard redirect every 60 seconds. Fixed: `false` is now a no-op.

**Substance field name mismatch (`api/substances.ts`)**
Backend returns `type` but the frontend `Substance` interface uses `substance_type`. Both `useSubstances` and `useSubstance` now remap `type → substance_type` at the API boundary.

**Admin — Status tab (`AdminPage.tsx`, `api/admin.ts`, `types/index.ts`)**
`GET /admin/status` returns DB counts, not an injection job tracker. Replaced wrong types with `DbStatus`. Added `StatusPanel` showing all counts, a substances-by-type bar, and a GCxGC bins-per-family grid.

**Admin — FileCard nested component bug (`AdminPage.tsx`)**
`FileCard` was defined inside `InjectionPanel`, causing remount on every parent render. Moved to module level.

**Admin — pseudo-library category as query param (`api/admin.ts`)**
Backend expects `category` as a URL query parameter, not a `FormData` field.

---

### 2026-05-16 — Theme system, API fixes, missing endpoints

**Two-theme system (`src/hooks/useTheme.ts`, `src/index.css`, `index.html`)**
Added dark/light theme with `data-theme` toggle. `useTheme` hook manages state + localStorage. Anti-flash init script in `<head>`. Sidebar bottom zone has sun/moon toggle button. All tokens defined as CSS custom properties in `:root` (dark) and `[data-theme="light"]` blocks.

**Login page redesign (`LoginPage.tsx`)**
Rewritten with split-panel layout: left panel (DM Serif Display heading, animation, Keycloak sign-in button), right panel (SVG molecular network illustration — anthracene-like fused hexagonal rings with alkane chains, floating animation). Google Fonts for DM Serif Display added to `index.html`.

**Substance properties/leaves response shape (`api/substances.ts`)**
`useSubstanceProperties` and `useSubstanceLeaves` now correctly parse the actual backend response `{ analyses: { [id]: { data_source, properties/components: [...] } } }` instead of the standard `{ data: [...] }` wrapper that these endpoints don't use.

**Unit conversion payload (`api/admin.ts`, `types/index.ts`)**
`ConvertPayload` changed from `from_unit_id`/`to_unit_id` (UUIDs) to `from_symbol`/`to_symbol` (string symbols like "mm²/s"). Admin page select values changed from `u.unit_id` to `u.symbol`.

**Classification payload field names (`api/classifications.ts`)**
`useAddSubstanceClassification` and `useSearchByClassifications` were sending `classification_ids`. Backend requires `classifications`. Field renamed.

**New API hooks — analysis metadata edit (`api/analyses.ts`)**
- `useUpdateAnalysis()` — `PATCH /analyses/{id}` (updated_by, project_id, source_metadata, created_at)
- `useUpdateTextValue(analysisId)` — `PATCH /text/{text_val_id}` with `{ value }`
- `useDeleteTextValue(analysisId)` — `DELETE /text/{text_val_id}`

**New API hooks — composition management (`api/substances.ts`)**
- `useGetCompositions(analysisId)` — `GET /substances/analyses/{id}/getcompositions`
- `useAddComposition()` — `POST /substances/analyses/{id}/addcomposition` with `{ composition_string, fraction_type }`

**AnalysisCard full rewrite (`pages/substances/AnalysisCard.tsx`)**
Three new module-level sub-components:
- `EditMetaForm` — collapsible metadata edit form using `useUpdateAnalysis`
- `TextValueRow` — inline-editable row with hover-revealed edit/delete, two-click delete confirmation (3 s timeout, resets on mouse leave)
- `CompositionSection` — composition management with link form (composition string + fraction type), stacked fraction bar visualization (HSL color wheel), per-component horizontal bars, and sum validation warning

---

### 2026-05-17 — Optimizer features, RBAC, UI polish

**Optimizer: Tab 6 History (`Tab6History.tsx`)**
New tab showing all user runs. Each run expands to show results, a compact 17-property grid, and a toggle to the full `PropertyTable` (38-property grouped view). Delete button present, gated by `isAdmin`.

**Optimizer: Comparison panel (`Tab1Predefined.tsx`)**
Bottom panel in Tab 1. Results from any run can be pinned; panel shows card view or a full sticky-column table view (`TABLE_ROWS_COMP`, 25 properties). `addToComparison`/`removeFromComparison` deduplicate by `result_id`.

**Optimizer: Diagnose constraints (`Tab1Predefined.tsx`, `api/optimizer.ts`)**
`useDiagnoseConstraints()` mutation — `POST /optimizer/diagnose`. Returns `{ feasible, lp_errors, issues[], pool_size, family_ranges }`. Inline "Diagnose" button appears on optimizer error; structured results panel shows LP verdict, per-issue list, and per-family min/max ranges from the current pool.

**Optimizer: Batch calculator (`Tab1Predefined.tsx`, `api/optimizer.ts`)**
`useBatchQuantities()` mutation — `POST /optimizer/blend/batch-quantities`. Given a composition and target volume (mL), returns mass_g and volume_ml per component plus blend density.

**RBAC structure (`AuthProvider.tsx`, `AuthContext.ts`, backend)**
- Frontend: `roles: string[]` and `isAdmin: boolean` exposed from `AuthContext`. `isAdmin` currently hardcoded `true`; restore role-based logic at `AuthProvider.tsx:97` after Keycloak setup.
- Backend `optimizer_controller.py`: `_get_current_user()`, `_get_roles()`, `_is_admin()` helpers decode JWT payload (already validated by middleware). `run_optimizer` sets `created_by` from token. `list_runs` filters by `created_by`. All guards currently commented out.
- Backend `gcxgc_controller.py`: `_is_admin()` guards on all write endpoints (create entry, upload, create/update/delete isomer mapping). All currently commented out.
- Re-enable: uncomment the `TODO` blocks and restore `AuthProvider.tsx:97`.

**User strip in sidebar (`Layout.tsx`)**
Bottom of the sidebar nav now shows: avatar circle (initial), username (ellipsis), role badge (`admin`/`user`), and a sign-out button (SVG arrow icon + "Out" label, red on hover).

**GCxGC write endpoint guards (`gcxgc_controller.py`)**
`_is_admin()` check added (and commented out) on: `create_entry`, `upload_file`, `create_isomer_mapping`, `update_isomer_mapping`, `delete_isomer_mapping`.

**Admin page guard (`AdminPage.tsx`)**
`Navigate` redirect for non-admins added and commented out. Re-enable two lines at `AdminPage.tsx:912-913`.

**UI polish**
- `.page-title` `font-weight` bumped to 700; `.section-label` to 700 with `--text-secondary` color
- Optimizer tab bar: 11→13 px, 40→44 px height
- Pool sidebar: substance names 12→13 px, search input 13 px, group labels bold
- Tab 1 config labels: 11→12 px; result card names: 12→13 px
- Tab 6 property rows: label and value 12→13 px

**Test suite expansion**
- `optimizerStore.test.ts`: added tests for `setFamilyConstraint`, `setTarget`, `setSparsity`, `setPropertyConstraint`, `setComponentCap`, `setTargetFuelId`, `addToComparison` (dedup), `removeFromComparison`, `clearComparison`
- `optimizer.test.ts`: added tests for `useRuns` (URL params), `useDeleteRun` (DELETE endpoint + error), `useBatchQuantities` (payload + response shape), `useDiagnoseConstraints` (feasible/infeasible paths)
- `useAuth.spec.ts`: rewritten — mock now includes `roles`, `isAdmin`, `initializing`; tests cover `isAdmin` derivation, dev fallback (empty roles → admin)
- `AuthProvider.spec.tsx`: added three tests — roles extracted from `tokenParsed.realm_access.roles`, empty roles when no `realm_access`, `isAdmin=true` dev fallback

---

### 2026-05-17 — Backend schema audit, new endpoints, constant value editing

**SQL migration V4 (`db/migrations/V4__integrity_and_indexes.sql`)**
Schema integrity and performance improvements applied via Flyway:
- Partial unique index on `constant_values(analysis_id, property_id) WHERE superseded_by IS NULL` — enforces exactly one active value per (analysis, property); prevents silent duplicates in the versioning chain
- Plain unique index on `text_values(analysis_id, property_id)` — text values have no versioning, so one observation per (analysis, property)
- Compound indexes `(analysis_id, property_id)` on both value tables — 10–100× faster for the `get_substance_properties` query which filters both columns simultaneously
- Sparse indexes on `constant_values.superseded_by` and `substance_coefficients.superseded_by` (WHERE NOT NULL) — history traversal was a full table scan
- CHECK constraint `substance_type IN ('fuel','solvent','molecule','blend','pseudo_component')` — rejects typos and unknown categories at the DB level
- Trigger `trg_dense_curve_array_lengths` — raises an exception if `x_values` and `y_values` are stored with different lengths, which would corrupt any chart
- Trigger `trg_analyses_updated_at` — auto-sets `analyses.updated_at` on every UPDATE so the timestamp stays accurate regardless of which code path touches the row
- Indexes on `optimization_runs(created_by)`, `(project_id)`, `(run_type)` — `list_runs` filter queries were doing full table scans
- New `optimization_run_notes` table with CASCADE FK to `optimization_runs` and `idx_run_notes_run_id` index

**Backend model: `OptimizationRunNote` (`optimization_models.py`)**
New SQLAlchemy model for `optimization_run_notes`. `OptimizationRun` gains a `notes` relationship (cascade delete-orphan, lazy dynamic).

**Backend service/controller changes**
- `OptimizerService.list_runs()` — new `offset: int` and `run_type: str | None` params; `.offset(offset)` applied before `.limit()`
- `PoolService.get_available_substances()` — new `search: str | None` param; applies `Substance.nom.ilike(f'%{search}%')` when provided
- `optimizer_controller.py` — `list_runs` handler reads `?offset` and `?run_type`; `list_pool_substances` reads `?search`; three new run-notes routes (`GET/POST /runs/<id>/notes`, `DELETE /notes/<note_id>`); new `GET /completeness/<substance_id>` for per-substance completeness check
- `substance_service.py` — `update_substance(substance_id, payload)`: updates `nom`, `substance_type`, `is_breakable` on a substance without breaking FK references; `get_substance_classifications(substance_name)`: returns full classification objects (`classification_id`, `name`, `entity_type`, `role`)
- `substance_controller.py` — `PATCH /<substance_id>` and `GET /<name>/classifications` routes added
- `values_controller.py` — `DELETE /constants/<constant_id>`: hard-deletes an erroneously entered value, re-links the `superseded_by` chain so history remains consistent (predecessors pointing to the deleted row now point to its successor)

**New and updated frontend API hooks**
- `usePoolSubstances(category?, search?)` — passes `?search` query param for name filtering
- `useRuns(projectId?, limit?, offset?, runType?)` — passes `?offset` and `?run_type` for pagination and tab filtering
- `useUpdateConstantValue(analysisId)` — `PATCH /values/constants/<id>` with `{ value, change_reason, updated_by, reported_unit }`; creates a new versioned row and supersedes the old one; invalidates `analysisKeys.constants(analysisId)`
- `useRunNotes(runId)` — `GET /optimizer/runs/<id>/notes`
- `useAddRunNote()` — `POST /optimizer/runs/<id>/notes` with `{ note_text }`
- `useDeleteRunNote()` — `DELETE /optimizer/notes/<note_id>`; invalidates notes query for the run
- `useSubstanceCompleteness(substanceId)` — `GET /optimizer/completeness/<id>`; per-substance alternative to the all-substances completeness endpoint
- `useUpdateSubstance()` — `PATCH /substances/<id>` with `{ nom?, substance_type?, is_breakable? }`
- `useSubstanceClassifications(name)` — `GET /substances/<name>/classifications`; returns `[{ classification_id, name, entity_type, role }]`
- `useDeleteConstant()` (new `src/api/values.ts`) — `DELETE /values/constants/<id>`; invalidates all substance property queries

**Inline constant value editing (`AnalysisCard.tsx`)**
New `ConstantValueRow` component (follows the same pattern as `TextValueRow`):
- View mode: pencil icon (✎) appears on hover at the right edge of each constant row
- Edit mode: row expands in-place to a 4-column form — new value (number input), unit, change reason (required), updated by (required)
- `Enter` saves, `Escape` cancels; inline error display for validation failures
- On success the backend versions the value (new row, old row superseded) and the constants list refreshes automatically

---

### 2026-05-18 — React Hook Form + Zod integration

**Packages installed:** `react-hook-form`, `zod`, `@hookform/resolvers`

**New file `src/lib/schemas.ts`** — central Zod schema definitions for all forms: `ProjectSchema`, `ClassificationSchema`, `ModelSchema`, `CreateSubstanceSchema`, `EditMetaSchema`, `ConstantValueSchema`, `CompositionSchema`, `CreatePropertySchema`, `CreateUnitSchema`. Each schema exports its inferred TypeScript type.

**7 files migrated from `useState`-based forms to `useForm + zodResolver`:**
- `ProjectsPage.tsx` — removed 3 state vars, added `useForm` with `project_year` preprocess
- `ClassificationsPage.tsx` — removed `newName`/`newRole` state; `reset()` on success
- `ModelsPage.tsx` — removed 3 state vars; input map updated to use `register(name as const)`
- `SubstancesPage.tsx` — removed `newName`/`newType` state; destructured with `registerCreate` prefix to avoid collision
- `AnalysisCard.tsx` — `EditMetaForm`, `ConstantValueRow`, `CompositionSection` all migrated; `setError('root')` used for server errors
- `AdminPage.tsx` — `PropertiesPanel` and `UnitsPanel` both migrated; `UnitsPanel` uses prefixed names (`regUnit`, `submitUnit`, `resetUnit`, `unitErrors`)

All forms now validate at submit (not on change), show per-field error messages, and are reset automatically on success/cancel.

---

### 2026-05-18 — TypeScript strict mode audit, ESLint fixes, thesis report

**Full `tsc -b` + ESLint pass (zero errors/warnings)**
CI pipeline runs both `tsc -b` and ESLint 9 with `noUnusedLocals: true`. All 26 ESLint warnings and ~30 TypeScript errors were resolved:

- `optimizerStore.ts`: mapped type filtered function keys using the banned `Function` type — replaced with `(...args: never[]) => unknown` (`@typescript-eslint/no-unsafe-function-type`)
- `Tab1Predefined.tsx`: `ComputedProperties` has no index signature — two casts changed to `as unknown as Record<string, number | null>`
- `Tab3Studio.tsx`: `PROP_CONSTRAINTS` array had a `key:` field that conflicted with React's reserved `key` prop when spread onto `<PropConstraintRow>` — renamed to `propKey:` throughout (array definition, map call, constraint check references); also removed unused imports (`useRun`, `useBatchQuantities`, `CarbonProfileChart`, `useEffect`, `OptimizationRun`) and dead state variables (`deleteMut`, `runs`, `showHistory`, `setShowHistory`)
- `AdminPage.tsx`: removed unused `Navigate` and `useAuth` imports (associated RBAC guard is commented out); deleted unused `StatRow` function component
- `api/optimizer.ts`: removed unused `PaginatedResponse` import; prefixed unused destructured param `runId: _runId` in `useSaveRunNote` mutationFn
- `api/substances.ts`: removed unused `PaginatedResponse` import
- `components/charts/PropertyRadarChart.tsx`: unused map index `ri` → `_ri`
- `AuthProvider.spec.tsx`: four bare `@ts-ignore` directives given required descriptions (`// @ts-ignore -- override global.setInterval signature for test control`)
- `__tests__/hooks/useChartColors.test.ts`: removed unused `vi` from vitest import
- `__tests__/components/PoolSidebar.test.tsx`: removed unused React import; all 5 partial mock casts changed to `as unknown as ReturnType<typeof usePool>`
- `__tests__/api/optimizer.test.ts`: `data?.results[0]` → `data?.results?.[0]` (results possibly undefined)
- `services/useAxios.spec.ts`: added `InternalAxiosRequestConfig` import; all interceptor call results cast to the type; `{ headers: undefined }` → `{ headers: new axios.AxiosHeaders() }`
- `pages/projects/ProjectsPage.tsx`: `project_year: number | null` coerced to `number | undefined` with `?? undefined` before passing to mutation
- `pages/substances/AnalysisDetailPage.tsx`: `analysis.date_recorded` (non-existent field) → `analysis.created_at` with `toLocaleDateString()`
- `__tests__/components/AnalysisCard.test.tsx`: removed `project_id` from `makeAnalysis` factory (field not in `Analysis` type)
- `__tests__/store/optimizerStore.test.ts`: aligned all test fixtures with actual interface shapes — `PropertyConstraint` uses `{ lo, hi }` not `{ value }`; `SparsityConfig` uses `threshold_pct` not `threshold`; `OptimizationResult` requires `eos_distillation_pts`, `eos_pvap_pts`, `sparsity_desc`; removed `run_id` (lives on `OptimizationRun`, not `OptimizationResult`)


