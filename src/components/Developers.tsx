"use client";

import { useLang } from "@/i18n";
import McpConnect from "./McpConnect";

const endpoints = [
  {
    method: "GET",
    path: "/api/v1/recovery/by_ward?event=2025-02-12&ward=11",
    desc: "Recovery result for one ward in one storm",
    response: `{
  "event_id": "2025-02-12",
  "ward": "11",
  "ward_name": "University-Rosedale",
  "baseline_daily_mean": 716.77,
  "scored": true,
  "status": "recovered",
  "recovery_days": 19,
  "recovery_date": "2025-03-07",
  "dip_ratio": 0.137
}`,
  },
  {
    method: "GET",
    path: "/api/v1/recovery/events",
    desc: "The nine major storms, with snowfall totals",
    response: `{ "count": 9, "events": [
  { "id": "2025-02-12", "start": "2025-02-12",
    "end": "2025-02-16", "snow_total_cm": 51.4,
    "peak_snow_on_ground_cm": 50 }, … ] }`,
  },
  {
    method: "GET",
    path: "/api/v1/recovery/daily?event=2025-02-12",
    desc: "Citywide daily ticket counts as a share of normal",
    response: `{ "event_id": "2025-02-12",
  "baseline_daily_mean": 5132.4, "daily": [
  { "date": "2025-02-13", "count": 2854,
    "ratio": 0.514, "phase": "event" }, … ] }`,
  },
];

export default function Developers() {
  const { t } = useLang();
  return (
    <section id="developers" className="bg-ink text-white">
      <div className="mx-auto max-w-[1392px] px-6 py-20 md:py-28">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white/60">{t.developers.kicker}</p>
        <h2 className="display mt-4 max-w-[720px] text-[40px] md:text-[52px]">{t.developers.title}</h2>
        <p className="mt-5 max-w-[720px] text-[18px] leading-relaxed text-white/70">{t.developers.body}</p>

        <h3 className="mt-14 text-[13px] font-semibold uppercase tracking-[0.12em] text-white/60">{t.developers.endpoints}</h3>
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          {endpoints.map((e) => (
            <article key={e.path} className="overflow-hidden rounded-[24px] bg-white/[0.06]">
              <div className="border-b border-white/10 px-6 py-4">
                <span className="mr-3 rounded-full bg-canada px-2.5 py-1 font-mono text-[12px] font-semibold">{e.method}</span>
                <code className="font-mono text-[13px] text-white/85 break-all">{e.path}</code>
                <p className="mt-2 text-[14px] text-white/60">{e.desc}</p>
              </div>
              <pre className="overflow-x-auto px-6 py-4 font-mono text-[12.5px] leading-relaxed text-white/75">{e.response}</pre>
            </article>
          ))}
        </div>

        <div className="mt-8">
          <a href="/api/openapi.json" className="block rounded-[24px] bg-white/[0.06] p-6 hover:bg-white/[0.09]">
            <h4 className="text-[19px] font-semibold">{t.developers.openapi}</h4>
            <code className="mt-2 block font-mono text-[13px] text-white/60">GET /api/openapi.json</code>
          </a>
        </div>

        <McpConnect
          config={{
            slug: "toronto-parking-recovery",
            displayName: "Toronto Parking Recovery",
            exampleEn: "Tell me which wards recovered slowest after the February 2025 storm and which were fastest",
            exampleFr: "Dis-moi quels arrondissements se sont rétablis le plus lentement après la tempête de février 2025 et lesquels ont été les plus rapides",
          }}
        />
      </div>
    </section>
  );
}
