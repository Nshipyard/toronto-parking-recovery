"use client";

import { useEffect, useMemo, useState } from "react";

interface Feature {
  type: string;
  properties: { code: string; name: string };
  geometry: { type: string; coordinates: number[][][] | number[][][][] };
}

export interface AreaValue {
  days: number | null;
  scored: boolean;
  status: string;
}

// Recovery scale: light = fast, deep red = slow. Unscored and not-recovered handled separately.
export const BIN_COLORS = ["#fde8e8", "#f5b5b5", "#e97f7f", "#d80621"];
export const NOT_BACK_COLOR = "#8f0416";
export const UNSCORED_COLOR = "#e9e9e9";

export function colorForValue(v: AreaValue | undefined): string {
  if (!v || !v.scored) return UNSCORED_COLOR;
  if (v.days === null) return NOT_BACK_COLOR;
  if (v.days <= 3) return BIN_COLORS[0];
  if (v.days <= 7) return BIN_COLORS[1];
  if (v.days <= 14) return BIN_COLORS[2];
  return BIN_COLORS[3];
}

function ringPath(ring: number[][], px: (x: number, y: number) => [number, number]) {
  return ring.map((c, i) => `${i === 0 ? "M" : "L"}${px(c[0], c[1]).join(",")}`).join(" ") + " Z";
}

export default function RecoveryMap({
  geoUrl,
  values,
  selected,
  onSelect,
  formatTip,
  ariaLabel,
}: {
  geoUrl: string;
  values: Record<string, AreaValue>;
  selected: string | null;
  onSelect: (code: string | null) => void;
  formatTip: (code: string, name: string, v: AreaValue | undefined) => string;
  ariaLabel: string;
}) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch(geoUrl)
      .then((r) => r.json())
      .then((d) => {
        if (live) setFeatures(d.features);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [geoUrl]);

  const { paths, names } = useMemo(() => {
    if (!features.length) return { paths: [], names: {} as Record<string, string> };
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (const f of features) {
      const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
      for (const poly of polys as number[][][][])
        for (const ring of poly)
          for (const c of ring) {
            if (c[0] < minX) minX = c[0];
            if (c[0] > maxX) maxX = c[0];
            if (c[1] < minY) minY = c[1];
            if (c[1] > maxY) maxY = c[1];
          }
    }
    const W = 1000, H = 620;
    const sx = W / (maxX - minX), sy = H / (maxY - minY);
    const s = Math.min(sx, sy);
    const ox = (W - (maxX - minX) * s) / 2, oy = (H - (maxY - minY) * s) / 2;
    const px = (x: number, y: number): [number, number] => [ox + (x - minX) * s, oy + (maxY - y) * s];
    const paths: { code: string; d: string }[] = [];
    const names: Record<string, string> = {};
    for (const f of features) {
      const code = f.properties.code;
      names[code] = f.properties.name;
      const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
      const d = (polys as number[][][][]).map((poly) => poly.map((ring) => ringPath(ring, px)).join(" ")).join(" ");
      paths.push({ code, d });
    }
    return { paths, names };
  }, [features]);

  const hoverCode = hover ?? selected;

  return (
    <div className="relative">
      <svg viewBox="0 0 1000 620" className="w-full rounded-[24px] border border-line bg-paper" role="img" aria-label={ariaLabel}>
        {paths.map((p) => (
          <path
            key={p.code}
            d={p.d}
            fill={colorForValue(values[p.code])}
            stroke={selected === p.code ? "#0a0f1e" : "#ffffff"}
            strokeWidth={selected === p.code ? 2.5 : 1}
            className="cursor-pointer transition-colors"
            onMouseEnter={() => setHover(p.code)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onSelect(selected === p.code ? null : p.code)}
          />
        ))}
      </svg>
      {hoverCode && names[hoverCode] && (
        <div className="pointer-events-none absolute left-4 top-4 max-w-[300px] rounded-[16px] bg-ink px-4 py-3 text-white shadow-lg">
          <p className="text-[14px] font-semibold">{names[hoverCode]}</p>
          <p className="mt-0.5 font-mono text-[13px] text-white/75">{formatTip(hoverCode, names[hoverCode], values[hoverCode])}</p>
        </div>
      )}
    </div>
  );
}
