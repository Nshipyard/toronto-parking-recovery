"use client";

import { useEffect, useMemo, useState } from "react";
import { useLang } from "@/i18n";
import RecoveryMap, { BIN_COLORS, NOT_BACK_COLOR, UNSCORED_COLOR, type AreaValue } from "./RecoveryMap";
import { shortDate, statusLabel } from "@/lib/recovery-client";

interface EventInfo {
  id: string;
  start: string;
  end: string;
  snow_total_cm: number;
  peak_snow_on_ground_cm: number;
}

interface Row {
  baseline_daily_mean: number;
  scored: boolean;
  status: string;
  recovery_days: number | null;
  recovery_date: string | null;
  dip_ratio: number | null;
  dip_date: string | null;
}
interface WardRow extends Row { ward: string; ward_name: string }
interface HoodRow extends Row { hood: string; hood_name: string }
interface CityDay { date: string; count: number; ratio: number | null; phase: string }

function fmt(n: number) {
  return n.toLocaleString("en-CA");
}

function eventLabel(e: EventInfo, lang: "en" | "fr") {
  const a = shortDate(e.start, lang);
  const b = shortDate(e.end, lang);
  return e.start === e.end ? a : `${a} – ${b}`;
}

function RankTable({ title, rows, lang }: {
  title: string;
  rows: { name: string; code: string; r: Row }[];
  lang: "en" | "fr";
}) {
  const { t } = useLang();
  if (!rows.length) return null;
  return (
    <div className="rounded-[24px] border border-line bg-paper p-6">
      <h4 className="text-[15px] font-semibold uppercase tracking-wide text-ink/60">{title}</h4>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-[14px]">
          <thead>
            <tr className="border-b border-line text-[12px] uppercase tracking-wide text-ink/50">
              <th className="py-2 pr-3 font-semibold">{t.explorer.colArea}</th>
              <th className="py-2 pr-3 text-right font-semibold">{t.explorer.colBaseline}</th>
              <th className="py-2 pr-3 text-right font-semibold">{t.explorer.colDip}</th>
              <th className="py-2 text-right font-semibold">{t.explorer.colRecovery}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ name, code, r }) => (
              <tr key={code} className="border-b border-line/50 last:border-0">
                <td className="py-2 pr-3">
                  {name} <span className="font-mono text-[12px] text-ink/45">({code})</span>
                </td>
                <td className="py-2 pr-3 text-right font-mono">{r.baseline_daily_mean.toFixed(1)}</td>
                <td className="py-2 pr-3 text-right font-mono">
                  {r.dip_ratio !== null ? `${Math.round(r.dip_ratio * 100)}%` : "n/a"}
                </td>
                <td className="py-2 text-right font-mono font-semibold text-canada">
                  {r.recovery_days !== null
                    ? `${r.recovery_days} ${r.recovery_days === 1 ? t.explorer.day1 : t.explorer.days}`
                    : statusLabel(r.status, lang)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DailyChart({ days }: { days: CityDay[] }) {
  const { t, lang } = useLang();
  const maxR = 1.25;
  return (
    <div>
      <div className="relative">
        <div className="flex items-end gap-[2px]" style={{ height: 180 }}>
          {days.map((d) => {
            const r = d.ratio ?? 0;
            const h = Math.max(2, (Math.min(r, maxR) / maxR) * 168);
            return (
              <div key={d.date} className="flex flex-1 flex-col items-center justify-end self-stretch" title={`${shortDate(d.date, lang)}: ${fmt(d.count)} (${d.ratio !== null ? Math.round(d.ratio * 100) + "%" : "n/a"})`}>
                <div
                  className={`w-full rounded-t-[2px] ${d.phase === "event" ? "bg-canada" : "bg-ink/35"}`}
                  style={{ height: `${h}px` }}
                />
              </div>
            );
          })}
        </div>
        <div className="pointer-events-none absolute left-0 right-0 border-t-2 border-dashed border-canada/70" style={{ bottom: `${(0.9 / maxR) * 168 + 6}px` }} />
        <span className="absolute left-1 font-mono text-[11px] text-canada" style={{ bottom: `${(0.9 / maxR) * 168 + 12}px` }}>90%</span>
      </div>
      <p className="mt-2 text-[12.5px] text-ink/55">{t.explorer.baseline}: 100% on this chart. Red bars are storm days.</p>
    </div>
  );
}

export default function RecoveryExplorer() {
  const { t, lang } = useLang();
  const [events, setEvents] = useState<EventInfo[]>([]);
  const [eventId, setEventId] = useState("2025-02-12");
  const [layer, setLayer] = useState<"ward" | "hood">("ward");
  const [wards, setWards] = useState<WardRow[]>([]);
  const [hoods, setHoods] = useState<HoodRow[]>([]);
  const [daily, setDaily] = useState<CityDay[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/recovery/events")
      .then((r) => r.json())
      .then((d) => setEvents(d.events))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setSelected(null);
    fetch(`/api/v1/recovery/by_ward?event=${eventId}`)
      .then((r) => r.json())
      .then((d) => setWards(d.wards))
      .catch(() => {});
    fetch(`/api/v1/recovery/by_neighbourhood?event=${eventId}`)
      .then((r) => r.json())
      .then((d) => setHoods(d.neighbourhoods))
      .catch(() => {});
    fetch(`/api/v1/recovery/daily?event=${eventId}`)
      .then((r) => r.json())
      .then((d) => setDaily(d.daily))
      .catch(() => {});
  }, [eventId]);

  const ev = events.find((e) => e.id === eventId);

  const values = useMemo(() => {
    const m: Record<string, AreaValue> = {};
    if (layer === "ward") {
      for (const w of wards) m[w.ward] = { days: w.recovery_days, scored: w.scored, status: w.status };
    } else {
      for (const h of hoods) m[h.hood] = { days: h.recovery_days, scored: h.scored, status: h.status };
    }
    return m;
  }, [layer, wards, hoods]);

  const wardNamed = wards.map((r) => ({ name: r.ward_name, code: r.ward, r }));
  const scoredWards = wardNamed.filter((x) => x.r.scored && x.r.recovery_days !== null);
  const fastestWards = [...scoredWards].sort((a, b) => (a.r.recovery_days ?? 0) - (b.r.recovery_days ?? 0)).slice(0, 5);
  const slowestWards = [...scoredWards].sort((a, b) => (b.r.recovery_days ?? 0) - (a.r.recovery_days ?? 0)).slice(0, 5);
  const notBackWards = wardNamed.filter((x) => x.r.scored && x.r.recovery_days === null);

  const hoodNamed = hoods.map((r) => ({ name: r.hood_name, code: r.hood, r }));
  const scoredHoods = hoodNamed.filter((x) => x.r.scored && x.r.recovery_days !== null);
  const fastestHoods = [...scoredHoods].sort((a, b) => (a.r.recovery_days ?? 0) - (b.r.recovery_days ?? 0)).slice(0, 5);
  const slowestHoods = [...scoredHoods].sort((a, b) => (b.r.recovery_days ?? 0) - (a.r.recovery_days ?? 0)).slice(0, 5);

  const selRow = selected
    ? layer === "ward"
      ? wards.find((w) => w.ward === selected)
      : hoods.find((h) => h.hood === selected)
    : null;
  const selName = selected
    ? layer === "ward"
      ? wards.find((w) => w.ward === selected)?.ward_name
      : hoods.find((h) => h.hood === selected)?.hood_name
    : null;

  return (
    <section id="explorer" className="bg-paper-warm">
      <div className="mx-auto max-w-[1392px] px-6 py-20 md:py-28">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-canada">{t.explorer.kicker}</p>
        <h2 className="display mt-4 max-w-[820px] text-[40px] md:text-[52px]">{t.explorer.title}</h2>
        <p className="mt-5 max-w-[760px] text-[18px] leading-relaxed text-ink/70">{t.explorer.body}</p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <label className="text-[14px] font-semibold uppercase tracking-wide text-ink/55" htmlFor="event-select">
            {t.explorer.event}
          </label>
          <select
            id="event-select"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="rounded-full border border-line bg-paper px-5 py-3 text-[15.5px] font-medium outline-none focus:border-canada"
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {eventLabel(e, lang)} · {e.snow_total_cm} {t.explorer.cmSnow}
              </option>
            ))}
          </select>
          <div className="flex items-center rounded-full border border-line bg-paper text-[14.5px] font-medium">
            {(["ward", "hood"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLayer(l)}
                className={`rounded-full px-4 py-2.5 ${layer === l ? "bg-ink text-white" : "text-ink/60 hover:text-ink"}`}
                aria-pressed={layer === l}
              >
                {l === "ward" ? t.explorer.layerWard : t.explorer.layerHood}
              </button>
            ))}
          </div>
          {ev && (
            <p className="font-mono text-[13.5px] text-ink/60">
              {ev.snow_total_cm} {t.explorer.cmSnow} · {t.explorer.snowOnGround} {ev.peak_snow_on_ground_cm} cm
            </p>
          )}
        </div>

        <div className="mt-6">
          <RecoveryMap
            geoUrl={layer === "ward" ? "/geo/wards_25_simple.geojson" : "/geo/neighbourhoods_158_simple.geojson"}
            values={values}
            selected={selected}
            onSelect={setSelected}
            ariaLabel={layer === "ward" ? "Map of recovery days by ward" : "Map of recovery days by neighbourhood"}
            formatTip={(code, name, v) => {
              if (!v || !v.scored) return t.explorer.unscored;
              if (v.days === null) return statusLabel(v.status, lang);
              return `${v.days} ${v.days === 1 ? t.explorer.day1 : t.explorer.days}`;
            }}
          />
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-ink/65">
            <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded-sm" style={{ background: BIN_COLORS[0] }} />{t.explorer.legendFast}</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded-sm" style={{ background: BIN_COLORS[1] }} />{t.explorer.legendMid}</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded-sm" style={{ background: BIN_COLORS[2] }} />{t.explorer.legendSlow}</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded-sm" style={{ background: BIN_COLORS[3] }} />{t.explorer.legendSlowest}</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded-sm" style={{ background: NOT_BACK_COLOR }} />{t.explorer.notBack}</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded-sm border border-line" style={{ background: UNSCORED_COLOR }} />{t.explorer.legendGrey}</span>
          </div>
          {selRow && selName && (
            <div className="mt-4 rounded-[20px] border border-line bg-paper p-5">
              <p className="text-[17px] font-semibold">
                {selName} <span className="font-mono text-[14px] text-ink/50">({selected})</span>
              </p>
              <p className="mt-1 font-mono text-[15px] text-canada">
                {selRow.scored
                  ? selRow.recovery_days !== null
                    ? `${selRow.recovery_days} ${selRow.recovery_days === 1 ? t.explorer.day1 : t.explorer.days} · ${t.explorer.colBaseline.toLowerCase()} ${selRow.baseline_daily_mean.toFixed(1)}/day`
                    : statusLabel(selRow.status, lang)
                  : t.explorer.unscored}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-[24px] border border-canada/30 bg-canada/[0.04] p-6 md:p-8">
          <h3 className="text-[17px] font-semibold">{t.explorer.caveatTitle}</h3>
          <p className="mt-2 max-w-[860px] text-[15.5px] leading-relaxed text-ink/75">{t.explorer.caveat}</p>
        </div>

        <div className="mt-10 rounded-[24px] border border-line bg-paper p-6 md:p-8">
          <h3 className="display text-[26px]">{t.explorer.dailyTitle}</h3>
          <p className="mt-2 max-w-[720px] text-[14.5px] text-ink/60">{t.explorer.dailyBody}</p>
          <div className="mt-5">
            <DailyChart days={daily} />
          </div>
        </div>

        <div id="results" className="mt-14">
          <h3 className="display text-[30px] md:text-[36px]">{t.explorer.resultsTitle}</h3>
          <p className="mt-3 max-w-[700px] text-[16px] text-ink/70">{t.explorer.resultsBody}</p>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <RankTable title={t.explorer.slowest} rows={slowestWards} lang={lang} />
            <RankTable title={t.explorer.fastest} rows={fastestWards} lang={lang} />
          </div>
          {notBackWards.length > 0 && (
            <p className="mt-4 rounded-[16px] border border-line bg-paper px-5 py-3.5 font-mono text-[13.5px] text-ink/70">
              {t.explorer.notBack}: {notBackWards.map((x) => `${x.name} (${x.code})`).join(", ")}
            </p>
          )}
          <h3 className="display mt-12 text-[30px] md:text-[36px]">{t.explorer.hoodTitle}</h3>
          <p className="mt-3 max-w-[700px] text-[16px] text-ink/70">{t.explorer.hoodBody}</p>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <RankTable title={t.explorer.slowest} rows={slowestHoods} lang={lang} />
            <RankTable title={t.explorer.fastest} rows={fastestHoods} lang={lang} />
          </div>
        </div>
      </div>
    </section>
  );
}
