# Bend, OR — STR Market & Location Analysis

Static site (no build step), same template as the Park City and Charlotte market sites. It covers **Sections 2–5 only**: Market, Location Analysis by Bedroom Size, Why Location Changes the Rate, and Traveller Demographics. **No buy boxes yet.**

## Pipeline

1. `../notebooks/market_common.py` holds the market specifics:
   - workbook `../Bend - OR.xlsx` → `Cleaned_Data`;
   - the 7 Ward-clustered reference areas, named from centroids;
   - the bedroom-size buckets;
   - the main location variable: distance to the walkable core (nearer of downtown Wall St and the Old Mill District: walkable <1 km / 1–2 km / 2–4 km / 4 km+).
2. `python ../notebooks/build_overview_notebook.py`, then `jupyter nbconvert --to notebook --execute --inplace ../notebooks/bend_overview.ipynb`. This writes:
   - `region_stats.json`;
   - the interactive folium map `bend_overview_map.html`.
   The builder is identical across markets.
3. `python scripts/generate_webpage_data.py` writes:
   - `js/region_data.js`;
   - `assets/overview/bend_overview_map.html`;
   - `data/listings.json`.
   Don't hand-edit these files.

## Files

| File | Role |
|---|---|
| `js/data.js` | Market-specific prose and config: hero, market card (researched, with sources), screening-signal rows, location reads, size guide, destination areas, season strip, bridge. Prose that quotes a number computes it from `region_data.js`. |
| `js/location.js` | Section 2 size ladder and screening signals; Section 3 bedroom × location table, area × bedroom grid, size cards, reference table. |
| `js/destination.js` | Section 4 Leaflet map with side panel, season strip, bridge. |
| `js/render.js`, `js/charts.js`, `js/main.js` | Helpers, market card, Chart.js charts, bootstrap. |

`location.js`, `destination.js`, `render.js`, `charts.js`, `main.js` and `css/styles.css` are shared, unchanged, across the market sites.

## Method notes

- **Location is always compared within the same bedroom size.**
  - "vs. typical" = a listing's Revenue Potential ÷ the market median for its size bucket. 1.00× means it earns what its size predicts.
  - Cells under 8 listings are muted ("few homes"); under 3 are hidden.
- **Map colours show performance against same-size homes.**
  - Top 25% for its size, Middle 50%, Bottom 25%.
  - Filters: bedrooms × band × area (AND).
- **Screening signals are not proven uplift.**
  - They compare the share reaching the top quarter for their size, with vs. without a feature.
  - Features with fewer than 10 listings on either side are dropped.
- **Presentation rules:** plain English, no statistical notation on the page, and conclusions → evidence → what to look for.

## Underwriting (`underwritten.html`, added 2026-10-15)

This is the same Underwritten Properties page as the Galveston, Island Park and Bozeman sites. The main page has an Underwriting section under the hero, which links to it. There are no Bend UW sheets yet, so the page starts empty. **+ Add listing** puts a Zillow listing on the map so you can rank its comps, build a comp set and download a UW CSV.

- **Comps:** the 381 entire homes in `Cleaned_Data`. The main page's analysis keeps all 409 rows, but its 26 private, 1 hotel and 1 shared room are left out here. Areas, distance bands and tiers are the main page's.
- **Location:** the same rule as the main page, straight-line km to the nearer of downtown (Wall St) and the Old Mill District, banded under 1 / 1–2 / 2–4 / 4+ km. A new target takes its area from the nearest listing; this gives every listing its own area in a leave-one-out test. Match by location keeps to the target's area, with bedrooms ±1, revenue $90k+ (56 homes) and nearest first.
- **New sheets start from `underwriting/template/UW'ing - template (from Island Park 112).csv`:**
  - only the team's financing and tax assumptions carry over;
  - every sheet carries the five standard setup lines and all fifteen OPEX lines, at Galveston file 101's amounts (OPEX rounded, $4,850 a month);
  - revenue cases and comps start empty.
- **Pipeline:**
  - Run `python scripts/build_underwritten.py`. It uses the `str` venv and `../notebooks/market_common.py`, whose `TOWNS`, `LOC_BREAKS_KM`, `LOC_COLORS` and `town_km` were added for this page. It writes `data/*.json` and runs `node tests/test_underwritten.mjs`.
  - Browser test: `NODE_PATH=<playwright-core node_modules> node tests/test_underwritten_browser.mjs`.
  - Drop "UW'ing - NN.csv" exports into `underwriting/source_csv/` and rebuild to add underwritten targets.
- **View control (top right of the map, 2026-10-15):** declutters the map. It changes only what's drawn: filters, rankings and copies stay the same, and ranked matches and the comp set always show. The choice is remembered in the browser (`bendUW.view` in localStorage).
  - Airbnb comps: All / Hide bottom 25% / Top 25% only, against same-size homes.
  - Toggles: filtered-out dots, area outlines, area names, distance rings, rank numbers, search ring.
  - One-click **Clean map** and **Show everything**.
