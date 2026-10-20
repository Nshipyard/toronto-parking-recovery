#!/usr/bin/env python3
"""Spot checks for the recovery computation, recomputed independently from
data/daily_ward.csv and data/daily_city.csv with plain loops (no shared code
with build_recovery.py beyond reading the same daily CSVs).

Checks:
1. Internal consistency: sum(daily_ward) == sum(daily_city) == phase1 matched.
2. For three (event, ward) pairs, recompute baseline + recovery by hand and
   compare with data/recovery.json.
3. Citywide Feb 2025: print daily counts Feb 1-28 vs weekday baseline so a
   human can eyeball the dip and the return.
"""
import csv
import json
import os
import statistics
from collections import defaultdict
from datetime import date, timedelta

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(BASE, "data")


def rd(s):
    return date(int(s[:4]), int(s[5:7]), int(s[8:10]))


ward = defaultdict(dict)
with open(os.path.join(DATA, "daily_ward.csv")) as f:
    for row in csv.DictReader(f):
        d = date(int(row["date"][:4]), int(row["date"][4:6]), int(row["date"][6:8]))
        ward[row["ward"]][d] = int(row["count"])
city = {}
with open(os.path.join(DATA, "daily_city.csv")) as f:
    for row in csv.DictReader(f):
        d = date(int(row["date"][:4]), int(row["date"][4:6]), int(row["date"][6:8]))
        city[d] = int(row["count"])

stats = json.load(open(os.path.join(DATA, "phase1_stats.json")))
sw = sum(sum(v.values()) for v in ward.values())
sc = sum(city.values())
print(f"check1 ward_sum={sw} city_sum={sc} phase1_matched={stats['geocoded_tickets']} ->",
      "OK" if sw == sc == stats["geocoded_tickets"] else "MISMATCH")

rec = json.load(open(os.path.join(DATA, "recovery.json")))
events = {e["id"]: e for e in rec["events"]}
event_days = set()
for e in rec["events"]:
    d = rd(e["start"])
    while d <= rd(e["end"]):
        event_days.add(d)
        d += timedelta(days=1)


def hand(series, ev):
    start, end = rd(ev["start"]), rd(ev["end"])
    base = [start - timedelta(days=k) for k in range(14, 0, -1)]
    base = [d for d in base if d not in event_days]
    dow = defaultdict(list)
    for d in base:
        dow[d.weekday()].append(series.get(d, 0))
    dowb = {k: statistics.fmean(v) for k, v in dow.items()}
    mean = statistics.fmean([series.get(d, 0) for d in base])

    def ok(d):
        return series.get(d, 0) >= 0.9 * dowb[d.weekday()]

    d = end + timedelta(days=1)
    while d <= end + timedelta(days=30):
        if ok(d) and ok(d + timedelta(days=1)):
            return round(mean, 2), (d - end).days, d.isoformat()
        d += timedelta(days=1)
    return round(mean, 2), None, None


pairs = [("2025-02-12", "11"), ("2025-02-12", "03"), ("2023-03-03", "10"), ("2025-02-08", "22")]
rows = {(r["event_id"], r["ward"]): r for r in rec["wards"]}
for eid, w in pairs:
    mean, days, rdate = hand(ward[w], events[eid])
    r = rows[(eid, w)]
    okflag = (abs(mean - r["baseline_daily_mean"]) < 0.011 and days == r["recovery_days"] and rdate == r["recovery_date"])
    print(f"check2 {eid} ward {w}: hand baseline={mean} recovery={days}d on {rdate} | stored baseline={r['baseline_daily_mean']} recovery={r['recovery_days']}d on {r['recovery_date']} ->",
          "OK" if okflag else "MISMATCH")

print("\ncheck3 citywide Feb 2025 (count, weekday-baseline, ratio):")
ev = events["2025-02-12"]
start = rd(ev["start"])
base = [start - timedelta(days=k) for k in range(14, 0, -1) if (start - timedelta(days=k)) not in event_days]
dow = defaultdict(list)
for d in base:
    dow[d.weekday()].append(city.get(d, 0))
dowb = {k: statistics.fmean(v) for k, v in dow.items()}
d = date(2025, 2, 8)
while d <= date(2025, 3, 10):
    b = dowb[d.weekday()]
    print(f"  {d} {d.strftime('%a')} count={city.get(d,0):5d} base={b:7.1f} ratio={city.get(d,0)/b:.2f}")
    d += timedelta(days=1)
