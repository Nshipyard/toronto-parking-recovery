# Toronto parking recovery times by ward

**After the February 2025 storm, Beaches-East York recovered in 1 day. Scarborough Centre took 29.**

For each major Toronto snowstorm from 2023 to 2025, this project measures how many days passed before parking ticket counts in each ward and each of the 158 neighbourhoods returned to at least 90 percent of their normal level for that weekday. It is an accountability instrument for snow clearing performance, built only from data the City and Environment Canada publish.

Live structure mirrors the other Open Nshipyard data projects: an explorer with an SVG choropleth map, ranked tables, a REST API under `/api/v1/*`, an OpenAPI spec at `/api/openapi.json`, and MCP tools at `/mcp`. Interface in English and French.

## The core caveat, in plain words

Tickets measure enforcement activity. Enforcement is a stand-in for parking being usable again, not a direct measure of cleared streets. During a storm, officers can be reassigned to other duties, drivers can stay home, and a stall can be unusable because of a snow windrow even after the road itself is plowed. Every recovery time in this project is therefore labelled an **inference**. Where this README states a number as a **fact**, it comes straight from a published source or a direct count of the published records. The **rule** items are choices this project made; they are stated so anyone can rerun the computation differently.

Why use this proxy at all: there is no public stall-level map of Toronto street parking. SenSen holds a closed contract with the Toronto Parking Authority to map street parking with AI, and the stall inventory itself is not published. The enforcement record is the only stall-adjacent dataset the City releases.

## Headline results (all recovery times are inferences from ticket counts)

February 12-16, 2025 storm, 51.4 cm in the window, citywide normal level 5,132 geocoded tickets a day:

- Citywide daily counts fell to 49-53% of the weekday normal from February 13 to February 17 and did not hold at or above 90% until February 23-24 (with a Saturday relapse on March 1).
- All 25 wards scored. Fastest ward: **Beaches-East York (ward 19), 1 day**. Slowest scored ward: **Scarborough Centre (ward 21), 29 days**. Next slowest: University-Rosedale (ward 11), 19 days; Toronto-St. Paul's (ward 12), 14 days; Parkdale-High Park (ward 04), 13 days; Toronto Centre (ward 13), 11 days. Median ward: 7 days.
- Neighbourhoods: 143 of 158 scored; 15 unscored (baseline under 5 tickets a day). Slowest scored neighbourhood: Kingsview Village-The Westway (006), 28 days; then Yonge-Bay Corridor (170), 26 days; South Parkdale (085), 25 days.

Across all nine storms:

- Ward recovery medians run from 2 days (smaller storms) to 7 days (February 2025). No ward was unscored in 7 of the 9 storms; one ward fell below the floor in each of the two January-March 2024 storms.
- Don Valley North (ward 17) did not return to 90% within 30 days after the March 22, 2024 storm, and University-Rosedale (ward 11) did not within 30 days after the February 8, 2025 storm (the February 12-16 storm arrived four days later; see the storm-overlap rule below).
- After the December 23-26, 2025 storm, 13 of 25 wards were still below 90% when the ticket data ends on December 31, 2025. Those rows say `not_recovered_before_data_end`, not a recovery time.

## Method

### Storms (fact + rule)

- Fact: daily snowfall from Environment Canada, climate-daily collection, station **Toronto Intl A**, climate identifier **6158731**, retrieved October 2026. The full retrieved record ships in `data/ec_climate_daily_toronto_intl_a.json`.
- Rule: a **snow day** has at least 5 cm of new snow. Snow days at most 3 calendar days apart are grouped into one storm; the storm window runs from the first to the last snow day of the group. A storm is **major** when its window totals at least 10 cm of snow.
- Result: nine major storms qualify in 2023-2025. The largest is February 12-16, 2025, with 51.4 cm in the window and snow on the ground peaking at 50 cm. A separate storm on February 8, 2025 (12.6 cm) is measured on its own.
- Cross-check (fact): ticket counts citywide collapse during these windows. For the February 2025 storm, the Toronto Parking Authority's 2026 Operating Budget report states that 47% of on-street inventory was closed for snow removal and transactions fell by 371,000.

### Tickets (fact)

- Source: City of Toronto Open Data, Parking Tickets, calendar years 2023-2025: 6,454,695 tickets.
- Geocoding: each ticket's street address (for example "642 KING ST W") is matched to the City's Address Points (Municipal) file on house number plus normalized street name, and the matched point is placed in a ward and a 158-model neighbourhood by point-in-polygon on the official boundary files. 86.9% of tickets match in the reference pipeline; this project's match count is reported in `data/phase1_stats.json`. Tickets with no house number (street-only locations, intersections) or no matching address point are excluded.
- Daily counts of geocoded tickets per ward and per neighbourhood are the raw material. They are computed once by `scripts/phase1_daily.py` and stored in `data/daily_ward.csv` and `data/daily_hood.csv`.

### Normal level and recovery (rule)

- Baseline window: the 14 calendar days before the storm starts, excluding any day that belongs to any storm window.
- Weekday adjustment: each day is compared only with the same weekday inside the baseline window (two samples per weekday). A Monday after a storm is judged against normal Mondays, not against the all-days average. This handles the known weekday cycle in enforcement without extra modelling. The two-sample weekday baseline is noisy for small areas, which is one reason for the scoring floor below.
- Recovery: the first day after the storm window ends whose ticket count reaches at least 90% of that weekday's baseline, where the next day also reaches at least 90% of its own weekday baseline. Two consecutive qualifying days are required so a single busy day does not count as recovery. Recovery days are counted in calendar days from the last day of the storm window.
- Search window: 30 days after the storm ends. An area that does not qualify inside the window is reported as **not back within 30 days**. No number is invented for it.
- Days belonging to a different storm window never count toward recovery. This matters in February 2025: the February 8 storm (12.6 cm) and the February 12-16 storm (51.4 cm) sit four days apart, so a ward knocked down by both is measured against the calendar, not credited with recovery days that were actually the second storm.
- Scoring floor: a ward is scored only if its baseline is at least 20 tickets a day, a neighbourhood only at 5 a day, and only when at least 10 baseline days are usable. Areas under the floor are marked **unscored** in every output. All 25 wards clear the floor for every storm; between 12 and 23 of the 158 neighbourhoods do not (for example 15 are unscored for the February 2025 storm).
- End of data: the ticket record ends December 31, 2025. The December 10, 2025 and December 23-26, 2025 storms have recovery searches that can run into that boundary; areas still below 90% at the boundary carry the status `not_recovered_before_data_end`, which is different from failing a full 30-day search.

### Cost context (fact)

- Repainting one parking stall costs about $6.
- A metered on-street space returns about $3,200 a year: the Toronto Parking Authority's 2026 budget reports $67.7M of on-street revenue over about 21,000 spaces (off-street: $97.4M over about 41,000 spaces). The Authority's 2025 forecast was $177.3M of revenue on 32.4M transactions, about $5.47 per transaction.
- The City repaints road markings between June 1 and October 31 with two coats (City of Toronto pavement markings page). Marking condition does not affect these winter measures.

## Outputs

- `data/recovery.json`: the canonical computed dataset used by the site and the API.
- `public/data/recovery_by_ward.csv`: one row per storm per ward (225 rows).
- `public/data/recovery_by_neighbourhood.csv`: one row per storm per neighbourhood (1,422 rows).
- Each row carries: event window, baseline daily mean, number of baseline days, scored flag, status, recovery days, recovery date, and the lowest day in the storm window as a share of its weekday baseline (the dip).

Row statuses: `recovered`, `not_recovered_30d`, `not_recovered_before_data_end`, `unscored_low_baseline`.

## API

- `GET /api/v1/recovery/summary`
- `GET /api/v1/recovery/events`
- `GET /api/v1/recovery/by_ward?event=2025-02-12[&ward=11]`
- `GET /api/v1/recovery/by_neighbourhood?event=2025-02-12[&hood=095]`
- `GET /api/v1/recovery/daily?event=2025-02-12` (citywide daily counts as a share of the weekday baseline)
- `GET /api/openapi.json`
- MCP at `/mcp` (tools: `recovery_events`, `recovery_ward`, `recovery_neighbourhood`, `recovery_ranking`)

## Rebuild the data

```bash
python3 -m venv .venv && .venv/bin/pip install shapely
.venv/bin/python scripts/phase1_daily.py   # daily geocoded counts (slow, ~15 min)
.venv/bin/python scripts/build_geo.py       # simplified map geometries
.venv/bin/python scripts/build_recovery.py  # events + recovery computation
```

Phase 1 reads the shared ticket and address-point files from `~/workspace/toronto-parking-tickets-geocoded/data/` and the boundary files from `~/workspace/toronto-geo-concordances/data/raw/`. It does not modify them.

## Verification

- `npx tsc --noEmit`: clean. `npm run build`: green (Next.js 16.4.0, all routes generated).
- Data consistency: `daily_ward.csv`, `daily_hood.csv`, and `daily_city.csv` each sum to 5,606,483 geocoded tickets, exactly the reference pipeline's matched total for the same slice (86.9% of 6,454,695). Unmatched counts: 454,177 with no house number, 394,034 with no address match.
- Spot checks (`scripts/spot_check.py`, independent recomputation from the daily CSVs): baselines and recovery days/dates matched the stored dataset for ward 11 and ward 03 (February 12-16, 2025), ward 10 (March 3-4, 2023), and ward 22 (February 8, 2025). The citywide February 2025 series was printed day by day and matches the shape reported by the Parking Authority (counts at 49-53% of normal on February 13-17, back at 90% on February 23-24).
- Live checks against the production build (`next start`): summary, events, by_ward, by_neighbourhood, daily, OpenAPI, and the MCP tools list all respond; unknown events return 404 and a missing event parameter returns 400. The storm switcher, the ward/neighbourhood layer toggle, and the EN/FR toggle were exercised in a browser with no console errors.
- Screenshots (`docs/screenshots/`): `desktop.png` and `mobile.png` (hero, 1440px and 390px), `desktop-map.png` (February 2025 ward choropleth), `desktop-feb8.png` (same map switched to the February 8, 2025 storm), `desktop-results.png` and `mobile-results.png` (ranked tables), `mobile-map.png`, `fr-hero.png` (French interface).

## Licence and sources

Code and computed data: MIT. Ticket source data: City of Toronto Open Data (Open Government Licence, Toronto). Weather: Environment Canada. Boundaries: City of Toronto Open Data. Cost figures: Toronto Parking Authority 2026 Operating Budget report (City of Toronto council document, background file 260741).
