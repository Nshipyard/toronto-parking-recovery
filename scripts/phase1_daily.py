#!/usr/bin/env python3
"""Phase 1: geocode tickets 2023-2025 and build daily counts per ward / neighbourhood.

Reuses the matching rules from the reference project (toronto-parking-tickets-geocoded):
- ticket location2 like "642 KING ST W" matched to the City's Address Points (Municipal)
  file on (house number, normalized street name).
- ward and neighbourhood assigned by point-in-polygon on official geometries:
  wards25.geojson (25 wards) and nbh158.geojson (158 neighbourhoods).

Outputs (under the project data/ dir):
- daily_ward.csv  : date,ward,count
- daily_hood.csv  : date,hood,count
- daily_city.csv  : date,count   (geocoded tickets citywide)
- ward_names.json : {"01": "Etobicoke North", ...}
- hood_names.json : {"001": "West Humber-Clairville", ...}
- phase1_stats.json: totals, match rate, unmatched reasons
"""

import csv
import glob
import json
import os
import re
import sys
from collections import Counter, defaultdict

from shapely.geometry import shape, Point
from shapely.strtree import STRtree

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = "/home/hatch/workspace/toronto-parking-tickets-geocoded/data/raw"
GEO = "/home/hatch/workspace/toronto-geo-concordances/data/raw"
DATA = os.path.join(BASE, "data")
os.makedirs(DATA, exist_ok=True)

SHARED = "/home/hatch/workspace/toronto-parking-tickets-geocoded/data"

TYPE_MAP = {
    "STREET": "ST", "AVENUE": "AVE", "BOULEVARD": "BLVD", "DRIVE": "DR",
    "ROAD": "RD", "LANE": "LN", "TRAIL": "TRL", "CRESCENT": "CRES",
    "PLACE": "PL", "COURT": "CT", "TERRACE": "TERR", "PARKWAY": "PKWY",
    "GROVE": "GRV", "SQUARE": "SQ", "CIRCLE": "CIR", "GATE": "GATE",
    "MEWS": "MEWS", "WAY": "WAY", "HILL": "HILL", "PARK": "PK",
    "GARDENS": "GDNS", "QUAY": "QUAY", "ROW": "ROW",
}


def norm_street(s):
    s = s.upper().strip().rstrip(".")
    s = re.sub(r"\s+", " ", s)
    return " ".join(TYPE_MAP.get(p, p) for p in s.split(" "))


def split_address(loc2):
    loc2 = (loc2 or "").upper().strip().rstrip(".")
    m = re.match(r"^(\d+)\s*(?:[A-Z]\s+)?(.+)$", loc2)
    if not m:
        return None, None
    return m.group(1), norm_street(m.group(2))


def main():
    print("loading ward names...", flush=True)
    ward_names = {}
    with open(os.path.join(SHARED, "ward25_to_hood158.csv"), newline="") as f:
        for row in csv.DictReader(f):
            ward_names[row["ward_25"].strip()] = row["ward_name"].strip()

    print("loading address points...", flush=True)
    ap = {}  # (number, street) -> (lon, lat)
    with open(os.path.join(RAW, "address-points-4326.csv"), newline="") as f:
        for row in csv.DictReader(f):
            num = (row["ADDRESS_NUMBER"] or "").strip()
            if not num:
                continue
            key = (num, norm_street(row["LINEAR_NAME_FULL"] or ""))
            try:
                g = json.loads(row["geometry"])
                coords = g["coordinates"]
                pt = coords[0] if isinstance(coords[0], (list, tuple)) else coords
                ap[key] = (float(pt[0]), float(pt[1]))
            except Exception:
                continue
    print(f"address points: {len(ap)}", flush=True)

    def load_polys(fn, code_field, name_field):
        feats = json.load(open(os.path.join(GEO, fn)))["features"]
        geoms, codes, names = [], [], []
        for ft in feats:
            p = ft["properties"]
            geoms.append(shape(ft["geometry"]))
            codes.append(str(p[code_field]).strip())
            names.append(p[name_field].strip())
        return geoms, codes, names

    print("loading ward polygons...", flush=True)
    wgeoms, wcodes, _ = load_polys("wards25.geojson", "AREA_SHORT_CODE", "AREA_NAME")
    wtree = STRtree(wgeoms)
    print("loading neighbourhood polygons...", flush=True)
    hgeoms, hcodes, hnames = load_polys("nbh158.geojson", "AREA_SHORT_CODE", "AREA_NAME")
    htree = STRtree(hgeoms)

    def ward_of(lon, lat):
        pt = Point(lon, lat)
        for h in wtree.query(pt):
            if wgeoms[h].covers(pt):
                return wcodes[h]
        return None

    def hood_of(lon, lat):
        pt = Point(lon, lat)
        for h in htree.query(pt):
            if hgeoms[h].covers(pt):
                return hcodes[h]
        return None

    cache_path = os.path.join(DATA, "geo_cache.json")
    if os.path.exists(cache_path):
        print("loading geo cache...", flush=True)
        raw_cache = json.load(open(cache_path))
        geo = {tuple(k.split("\x1f")): tuple(v) for k, v in raw_cache.items()}
        hood_name_of = dict(zip(hcodes, hnames))
        print(f"geo cache: {len(geo)}", flush=True)
        return finish(geo, ward_names, hood_name_of)

    print("assigning address points to ward + neighbourhood...", flush=True)
    geo = {}  # key -> (ward, hood); hood may be None
    n_no_ward = 0
    for key, (lon, lat) in ap.items():
        w = ward_of(lon, lat)
        if w is None:
            n_no_ward += 1
            continue
        geo[key] = (w, hood_of(lon, lat))
    del ap
    print(f"geocoded address points: {len(geo)} (outside wards: {n_no_ward})", flush=True)
    hood_name_of = dict(zip(hcodes, hnames))
    json.dump({"\x1f".join(k): list(v) for k, v in geo.items()}, open(cache_path, "w"))
    return finish(geo, ward_names, hood_name_of)


def finish(geo, ward_names, hood_name_of):

    total = 0
    matched = 0
    no_number = 0
    no_addr_match = 0
    by_ward_day = Counter()
    by_hood_day = Counter()
    by_city_day = Counter()
    files = sorted(glob.glob(os.path.join(RAW, "parking-tickets-20*/Parking_Tags_Data_*.csv")))
    print(f"ticket files: {len(files)}", flush=True)

    def norm_rows(fp):
        for enc in ("utf-8-sig", "cp1252"):
            try:
                with open(fp, newline="", encoding=enc) as f:
                    reader = csv.DictReader((ln for ln in f if ln.strip()))
                    if reader.fieldnames:
                        reader.fieldnames = [h.strip().lower() for h in reader.fieldnames]
                    rows = list(reader)
                break
            except UnicodeDecodeError:
                continue
        for row in rows:
            yield {k.strip().lower(): (v or "") for k, v in row.items()}

    for fp in files:
        for row in norm_rows(fp):
            total += 1
            date = (row.get("date_of_infraction") or "")
            if len(date) != 8 or not date.isdigit():
                continue
            num, street = split_address(row.get("location2"))
            if num is None:
                no_number += 1
                continue
            hit = geo.get((num, street))
            if not hit:
                no_addr_match += 1
                continue
            matched += 1
            ward, hood = hit
            by_ward_day[(date, ward)] += 1
            if hood:
                by_hood_day[(date, hood)] += 1
            by_city_day[date] += 1
        print(f"  {os.path.basename(fp)}: total={total} matched={matched}", flush=True)

    def atomic_csv(name, header, rows):
        tmp = os.path.join(DATA, name + ".tmp")
        with open(tmp, "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(header)
            for r in rows:
                w.writerow(r)
        os.replace(tmp, os.path.join(DATA, name))

    atomic_csv("daily_city.csv", ["date", "count"],
               ([date, by_city_day[date]] for date in sorted(by_city_day)))
    atomic_csv("daily_ward.csv", ["date", "ward", "count"],
               ([date, ward, c] for (date, ward), c in sorted(by_ward_day.items())))
    atomic_csv("daily_hood.csv", ["date", "hood", "count"],
               ([date, hood, c] for (date, hood), c in sorted(by_hood_day.items())))
    json.dump(ward_names, open(os.path.join(DATA, "ward_names.json"), "w"))
    json.dump(hood_name_of, open(os.path.join(DATA, "hood_names.json"), "w"))
    stats = {
        "total_tickets": total,
        "geocoded_tickets": matched,
        "match_rate": round(matched / total, 4) if total else 0,
        "unmatched_no_house_number": no_number,
        "unmatched_no_address_match": no_addr_match,
        "ward_date_cells": len(by_ward_day),
        "hood_date_cells": len(by_hood_day),
    }
    json.dump(stats, open(os.path.join(DATA, "phase1_stats.json"), "w"), indent=2)
    print(json.dumps(stats, indent=1), flush=True)


if __name__ == "__main__":
    sys.exit(main())
