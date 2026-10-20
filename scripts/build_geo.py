#!/usr/bin/env python3
"""Simplify official ward / neighbourhood geometries into public/geo.

Ward codes in wards25.geojson use AREA_SHORT_CODE ("07") and names in AREA_NAME
("Humber River-Black Creek (7)"); ticket-side ward names come from
ward25_to_hood158.csv, so only the code is kept from geometry plus the name
parsed out of AREA_NAME for convenience.
"""
import json
import os

from shapely.geometry import shape, mapping

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = "/home/hatch/workspace/toronto-geo-concordances/data/raw"
OUT = os.path.join(BASE, "public", "geo")
os.makedirs(OUT, exist_ok=True)
TOL = 0.0008  # degrees (~80 m) - fine for a city-scale choropleth


def simplify(src_fn, out_fn, code_fn, name_fn):
    feats = json.load(open(os.path.join(SRC, src_fn)))["features"]
    out = []
    for ft in feats:
        g = shape(ft["geometry"]).simplify(TOL, preserve_topology=True)
        out.append({
            "type": "Feature",
            "properties": {"code": code_fn(ft["properties"]), "name": name_fn(ft["properties"])},
            "geometry": mapping(g),
        })
    fc = {"type": "FeatureCollection", "features": out}
    path = os.path.join(OUT, out_fn)
    with open(path, "w") as f:
        json.dump(fc, f, separators=(",", ":"))
    print(out_fn, len(out), f"{os.path.getsize(path)/1024:.0f} KB")


simplify("wards25.geojson", "wards_25_simple.geojson",
         lambda p: str(p["AREA_SHORT_CODE"]).strip().zfill(2),
         lambda p: p["AREA_NAME"].rsplit(" (", 1)[0].strip())
simplify("nbh158.geojson", "neighbourhoods_158_simple.geojson",
         lambda p: str(p["AREA_SHORT_CODE"]).strip(),
         lambda p: p["AREA_NAME"].strip())
