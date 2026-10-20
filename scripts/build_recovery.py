#!/usr/bin/env python3
"""Phase 2: define major snowfall events from Environment Canada daily data and
compute enforcement recovery per event, per ward, per neighbourhood.

Definitions used (also stated in the UI and README):
- Data source for weather: Environment Canada climate-daily collection,
  station TORONTO INTL A (climate identifier 6158731), retrieved at build time.
- Snow day: TOTAL_SNOW >= 5 cm at that station.
- Event: snow days at most 3 calendar days apart are grouped; the event window
  runs from the first to the last snow day of the group.
- Major event: total snowfall across the window >= 10 cm.
- Baseline: geocoded tickets per day over the 14 calendar days before the event
  started, excluding days that belong to any event window. Weekday adjustment:
  each day is compared with the mean of the same weekday inside that window
  (two samples), not with the overall mean.
- Scored areas: wards need a baseline mean of at least 20 tickets/day,
  neighbourhoods at least 5 tickets/day, and at least 10 valid baseline days.
  Areas below that are marked unscored and never given a recovery time.
- Recovery: the first day after the event window ends where the ticket count
  reaches at least 90% of that weekday's baseline AND the next day also meets
  its own 90% weekday baseline. Recovery days = calendar days from the last
  event day to that recovery day. The search window is 30 days; areas that do
  not recover inside the window (or before the ticket data ends on
  2025-12-31) are reported as such, never backfilled.
"""

import csv
import json
import os
import statistics
from collections import defaultdict
from datetime import date, timedelta

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(BASE, "data")
PUB = os.path.join(BASE, "public", "data")

SNOW_DAY_CM = 5.0
GROUP_GAP_DAYS = 3
MAJOR_TOTAL_CM = 10.0
BASELINE_DAYS = 14
MIN_BASELINE_DAYS = 10
WARD_MIN_BASELINE = 20.0
HOOD_MIN_BASELINE = 5.0
THRESHOLD = 0.90
SEARCH_DAYS = 30

DATA_START = date(2023, 1, 1)
DATA_END = date(2025, 12, 31)


def daterange(a, b):
    d = a
    while d <= b:
        yield d
        d += timedelta(days=1)


def iso(d):
    return d.isoformat()


def parse_iso(s):
    return date.fromisoformat(s)


def load_events():
    raw = json.load(open(os.path.join(DATA, "ec_climate_daily_toronto_intl_a.json")))
    daily = {}  # date -> (total_snow, snow_on_ground)
    for f in raw["features"]:
        p = f["properties"]
        d = parse_iso(p["LOCAL_DATE"][:10])
        daily[d] = (p.get("TOTAL_SNOW") or 0.0, p.get("SNOW_ON_GROUND") or 0)
    snow_days = sorted(d for d, (s, _) in daily.items() if s >= SNOW_DAY_CM)
    groups = []
    for d in snow_days:
        if groups and (d - groups[-1][-1]).days <= GROUP_GAP_DAYS:
            groups[-1].append(d)
        else:
            groups.append([d])
    events = []
    for g in groups:
        start, end = g[0], g[-1]
        total = sum(daily[d][0] for d in daterange(start, end))
        if total < MAJOR_TOTAL_CM:
            continue
        # snow on the ground is measured in the morning, so the peak caused by
        # the storm usually appears the day after the last snow day
        peak_sog = max(daily[d][1] for d in daterange(start, end + timedelta(days=1)) if d in daily)
        events.append({
            "id": iso(start),
            "start": iso(start),
            "end": iso(end),
            "snow_days": [iso(d) for d in g],
            "snow_total_cm": round(total, 1),
            "peak_snow_on_ground_cm": peak_sog,
            "station": "TORONTO INTL A",
            "climate_id": "6158731",
            "source": "Environment Canada climate-daily (api.weather.gc.ca)",
        })
    return events, daily


def load_daily(fn, key):
    counts = defaultdict(dict)  # area -> {date: n}
    with open(os.path.join(DATA, fn), newline="") as f:
        for row in csv.DictReader(f):
            d = parse_iso(f"{row['date'][:4]}-{row['date'][4:6]}-{row['date'][6:8]}")
            counts[row[key]][d] = int(row["count"])
    return counts


def load_city():
    counts = {}
    with open(os.path.join(DATA, "daily_city.csv"), newline="") as f:
        for row in csv.DictReader(f):
            d = parse_iso(f"{row['date'][:4]}-{row['date'][4:6]}-{row['date'][6:8]}")
            counts[d] = int(row["count"])
    return counts


def count_on(series, d):
    return series.get(d, 0)


def analyse(series_by_area, event, event_days_all, min_baseline):
    """Return per-area recovery rows for one event."""
    start, end = parse_iso(event["start"]), parse_iso(event["end"])
    base_days = [d for d in daterange(start - timedelta(days=BASELINE_DAYS), start - timedelta(days=1))
                 if d not in event_days_all and DATA_START <= d]
    rows = {}
    for area, series in series_by_area.items():
        base_counts = [count_on(series, d) for d in base_days]
        dow_vals = defaultdict(list)
        for d in base_days:
            dow_vals[d.weekday()].append(count_on(series, d))
        baseline_mean = statistics.fmean(base_counts) if base_counts else 0.0
        dow_base = {k: statistics.fmean(v) for k, v in dow_vals.items()}
        scored = len(base_days) >= MIN_BASELINE_DAYS and baseline_mean >= min_baseline
        row = {
            "baseline_daily_mean": round(baseline_mean, 2),
            "baseline_days": len(base_days),
            "scored": scored,
            "status": "unscored_low_baseline" if not scored else "pending",
            "recovery_days": None,
            "recovery_date": None,
            "dip_ratio": None,
            "dip_date": None,
        }
        if scored:
            # deepest dip across event window and the 2 days after
            best = None
            for d in daterange(start, end + timedelta(days=2)):
                b = dow_base.get(d.weekday(), baseline_mean)
                if b > 0:
                    r = count_on(series, d) / b
                    if best is None or r < best[0]:
                        best = (r, d)
            if best:
                row["dip_ratio"] = round(best[0], 3)
                row["dip_date"] = iso(best[1])

            def ok(d):
                b = dow_base.get(d.weekday(), baseline_mean)
                return d not in event_days_all and b > 0 and count_on(series, d) >= THRESHOLD * b

            # recovery search: days that belong to OTHER storm windows can never
            # count as recovery days; the pair must be two consecutive
            # non-event days both at or above 90% of their weekday baseline
            last_search = min(end + timedelta(days=SEARCH_DAYS), DATA_END - timedelta(days=1))
            found = None
            d = end + timedelta(days=1)
            while d <= last_search:
                nxt = d + timedelta(days=1)
                while nxt <= last_search and nxt in event_days_all:
                    nxt += timedelta(days=1)
                if nxt <= last_search and ok(d) and ok(nxt) and (nxt - d).days == 1:
                    found = d
                    break
                d += timedelta(days=1)
            if found:
                row["status"] = "recovered"
                row["recovery_days"] = (found - end).days
                row["recovery_date"] = iso(found)
            elif end + timedelta(days=SEARCH_DAYS) > DATA_END:
                row["status"] = "not_recovered_before_data_end"
            else:
                row["status"] = "not_recovered_30d"
        rows[area] = row
    return rows


def main():
    events, _daily = load_events()
    print(f"major events: {len(events)}")
    for e in events:
        print(f"  {e['start']}..{e['end']} total {e['snow_total_cm']} cm")
    event_days_all = set()
    for e in events:
        for d in daterange(parse_iso(e["start"]), parse_iso(e["end"])):
            event_days_all.add(d)

    ward_names = json.load(open(os.path.join(DATA, "ward_names.json")))
    hood_names = json.load(open(os.path.join(DATA, "hood_names.json")))
    ward_series = load_daily("daily_ward.csv", "ward")
    hood_series = load_daily("daily_hood.csv", "hood")
    city_series = load_city()

    ward_rows, hood_rows = [], []
    city_block = {}
    for e in events:
        wr = analyse(ward_series, e, event_days_all, WARD_MIN_BASELINE)
        for ward in sorted(wr):
            ward_rows.append({
                "event_id": e["id"], "event_start": e["start"], "event_end": e["end"],
                "ward": ward, "ward_name": ward_names.get(ward, ""),
                **wr[ward],
            })
        hr = analyse(hood_series, e, event_days_all, HOOD_MIN_BASELINE)
        for hood in sorted(hr):
            hood_rows.append({
                "event_id": e["id"], "event_start": e["start"], "event_end": e["end"],
                "hood": hood, "hood_name": hood_names.get(hood, ""),
                **hr[hood],
            })
        # citywide daily ratios around the event for the chart
        start, end = parse_iso(e["start"]), parse_iso(e["end"])
        base_days = [d for d in daterange(start - timedelta(days=BASELINE_DAYS), start - timedelta(days=1))
                     if d not in event_days_all]
        dow_vals = defaultdict(list)
        for d in base_days:
            dow_vals[d.weekday()].append(city_series.get(d, 0))
        dow_base = {k: statistics.fmean(v) for k, v in dow_vals.items()}
        series = []
        for d in daterange(start - timedelta(days=14), end + timedelta(days=30)):
            if d < DATA_START or d > DATA_END:
                continue
            b = dow_base.get(d.weekday(), 0)
            c = city_series.get(d, 0)
            series.append({
                "date": iso(d), "count": c,
                "ratio": round(c / b, 3) if b else None,
                "phase": "event" if d in event_days_all and start <= d <= end else ("post" if d > end else "pre"),
            })
        city_block[e["id"]] = {"baseline_daily_mean": round(statistics.fmean([city_series.get(d, 0) for d in base_days]), 1), "daily": series}

    out = {
        "events": events,
        "citywide": city_block,
        "wards": ward_rows,
        "neighbourhoods": hood_rows,
        "method": {
            "snow_source": "Environment Canada climate-daily, TORONTO INTL A (6158731), via api.weather.gc.ca",
            "tickets_source": "City of Toronto Open Data, Parking Tickets 2023-2025, geocoded by address match (see README)",
            "snow_day_cm": SNOW_DAY_CM,
            "group_gap_days": GROUP_GAP_DAYS,
            "major_total_cm": MAJOR_TOTAL_CM,
            "baseline_days": BASELINE_DAYS,
            "threshold": THRESHOLD,
            "hold_days": 2,
            "search_days": SEARCH_DAYS,
            "ward_min_baseline_per_day": WARD_MIN_BASELINE,
            "hood_min_baseline_per_day": HOOD_MIN_BASELINE,
        },
    }
    json.dump(out, open(os.path.join(DATA, "recovery.json"), "w"))

    with open(os.path.join(PUB, "recovery_by_ward.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["event_id", "event_start", "event_end", "ward", "ward_name", "baseline_daily_mean",
                    "baseline_days", "scored", "status", "recovery_days", "recovery_date", "dip_ratio", "dip_date"])
        for r in ward_rows:
            w.writerow([r["event_id"], r["event_start"], r["event_end"], r["ward"], r["ward_name"],
                        r["baseline_daily_mean"], r["baseline_days"], int(r["scored"]), r["status"],
                        r["recovery_days"] if r["recovery_days"] is not None else "",
                        r["recovery_date"] or "", r["dip_ratio"] if r["dip_ratio"] is not None else "", r["dip_date"] or ""])
    with open(os.path.join(PUB, "recovery_by_neighbourhood.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["event_id", "event_start", "event_end", "hood", "hood_name", "baseline_daily_mean",
                    "baseline_days", "scored", "status", "recovery_days", "recovery_date", "dip_ratio", "dip_date"])
        for r in hood_rows:
            w.writerow([r["event_id"], r["event_start"], r["event_end"], r["hood"], r["hood_name"],
                        r["baseline_daily_mean"], r["baseline_days"], int(r["scored"]), r["status"],
                        r["recovery_days"] if r["recovery_days"] is not None else "",
                        r["recovery_date"] or "", r["dip_ratio"] if r["dip_ratio"] is not None else "", r["dip_date"] or ""])

    feb = [r for r in ward_rows if r["event_id"] == "2025-02-12" and r["scored"]]
    feb_sorted = sorted(feb, key=lambda r: (r["recovery_days"] is None, r["recovery_days"]))
    print("\nFeb 2025 wards (slowest last):")
    for r in feb_sorted:
        print(f"  ward {r['ward']} {r['ward_name']}: baseline {r['baseline_daily_mean']}/day, recovery {r['recovery_days']} d, dip {r['dip_ratio']}")
    feb_h = [r for r in hood_rows if r["event_id"] == "2025-02-12"]
    print(f"Feb 2025 hoods: {sum(1 for r in feb_h if r['scored'])} scored of {len(feb_h)}")
    print(f"ward rows {len(ward_rows)}, hood rows {len(hood_rows)}")


if __name__ == "__main__":
    main()
