# Navlo

**Live: https://navlo-frontend.onrender.com**

A road-freight rate calculator built for Glorier's spedition/sales teams —
pick a route, get a real-data-backed price in seconds instead of digging
through spreadsheets. Built for a practical take-home task; the full
reasoning behind the product decisions is in [`PLAN.md`](PLAN.md) and the
one-page pitch summary.

The API + database live in a separate repo:
[`Glorier-Backend`](https://github.com/PavelTarlev1/Glorier-Backend).

## What it does

Pick a loading/unloading country (+ optional city, picked from real cities in
the data or typed freely), postcode, company and vehicle category — the
result **recalculates instantly on every change**, no "Calculate" button:

- **Data-backed pricing** — median €/km from 782 anonymized past shipments
  in the dataset provided for this task, via a fallback chain (exact
  route+category → route-only → category-only → overall average), with a
  confidence indicator showing how many matching records back the number.
- **Real road distance**, not just a straight line — pulled from OSRM (the
  same routing engine drawing the map), used for pricing itself, not only the
  map; falls back to a country-centroid approximation only while that's
  loading or for a route that genuinely can't be road-routed (e.g. across a
  sea gap).
- **Directly editable results** — click the distance, €/km, or total price on
  the result cards themselves to override any of them with a known real
  number; the model's own prediction stays visible right underneath for
  comparison, and overriding the total takes precedence over overriding the
  rate.
- **Real road map** — [Leaflet](https://leafletjs.com/) + OpenStreetMap tiles,
  with actual OSRM-routed roads; for a ferry-required relation, draws the real
  road route to the port, a dashed sea crossing, then the real road route from
  the other port onward — not one straight guess across the whole trip.
- **Toll/bridge/tunnel/ferry/customs costs** — opt-in, named line items (a
  trip can cross more than one bridge or ferry), *not* auto-added to the base
  price: the provided TMS data shows these costs are already reflected in the
  historical rate for a route that typically needs them, so auto-adding a
  suggested amount on top would double-count. A "+ Add" button still
  pre-fills the known figure for a route with a well-documented crossing.
- **EU driving-time-aware ETA** — loading date/time → estimated arrival,
  respecting the EU 9h/day driving limit (Regulation 561/2006) and the
  mandatory 11h daily rest for any overnight leg, plus ferry crossing/wait
  time where relevant.
- **Service tags & tail lift** — Direct delivery / Express / Standard FTL /
  Groupage (mutually exclusive with each other — a truck is either shared
  with other customers' freight or dedicated, never both) and tail lift,
  each with a price multiplier *measured* from the provided data, not guessed.
- Search past shipments by company, city, country code or category, across
  the historical records provided for this task.
- BG / EN, light / dark theme.

## Running locally

Requires Node 22+.

```bash
npm install
npm run dev   # http://localhost:5173
```

Talks to a local backend on `:4000` by default (proxied in dev, see
`vite.config.ts`) — see the backend repo's README to run that side too. To
point at a different backend (e.g. when building a static deploy), set
`VITE_API_BASE` at build time to the backend's full URL.

## Testing

```bash
npm run test        # vitest — the pricing engine + toll/ferry/customs logic
npm run typecheck    # npx tsc -b
npm run build        # typecheck + production build
npm run lint          # oxlint
```

`src/calc.test.ts` and `src/tollRates.test.ts` cover the fallback chain,
confidence levels, all three distance sources and their precedence, both
manual price overrides and their precedence, service-tag multipliers, ferry
evaluation, arrival-time date handling, and the toll/bridge/customs logic —
against a small hand-built fixture, not the full 782-record dataset.

## Architecture

```
src/
├── main.tsx, App.tsx, styles.css
├── types.ts        — shared types (RatesData, Calculation, FormState, …)
├── i18n.ts          — BG/EN dictionary + reference data (countries, categories)
├── api.ts           — typed fetch client to the backend
├── calc.ts          — the pricing model itself: fallback chain, distance,
│                      driving time, ferry evaluation — pure functions, tested
├── tollRates.ts     — national toll rates, fixed bridge/tunnel tolls, ferry
│                      fares, EU customs-border logic — also pure, tested
├── geocode.ts        — shared city→coordinates resolver (backend-proxied)
├── routing.ts        — real road distance via OSRM
└── components/       — RouteForm, ResultPanel, RouteMap, HistoryTable,
                        CompanySearch, HowItWorksModal, …
```

**Why the pricing logic lives client-side, not server-side**: instant
recalculation on every keystroke needs zero network round-trip, and the
underlying rate data is already served openly via `/api/rates` regardless of
where the formula runs. The real tradeoff this creates: the backend doesn't
currently re-validate a saved calculation's numbers against the model before
storing them — acceptable for a small trusted internal tool, but the first
thing to change if this became a system other tools rely on as a source of
truth.

## Deployment

Deployed on [Render](https://render.com) (free static-site tier, no card
required) — see `render.yaml`. Render auto-deploys on every push to `main`
via its own GitHub integration; `.github/workflows/ci.yml` runs tests +
typecheck + build as a gate, it doesn't deploy anything itself. Static sites
on Render's free tier have no cold-start (unlike the backend web service).
