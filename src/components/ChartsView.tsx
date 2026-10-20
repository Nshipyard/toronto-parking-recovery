"use client";

import { useLang } from "@/i18n";
import { BIN_COLORS, NOT_BACK_COLOR, UNSCORED_COLOR } from "./RecoveryMap";

export interface FebWard {
  ward: string;
  name: string;
  days: number | null;
  status: string;
}
export interface FebDay {
  date: string;
  count: number;
  baseline: number | null;
  phase: string;
}
export interface HeatCell {
  days: number | null;
  status: string;
}
export interface StormMedian {
  id: string;
  start: string;
  end: string;
  snowCm: number;
  median: number | null;
  recoveredCount: number;
  totalWards: number;
  dataEndCount: number;
}
export interface ChartsData {
  febWards: FebWard[];
  dailyFeb: FebDay[];
  wardList: { ward: string; name: string }[];
  heat: { ward: string; name: string; cells: HeatCell[] }[];
  storms: StormMedian[];
}

const INK = "#0a0f1e";
const CANADA = "#d80621";
const GRID = "rgba(10,15,30,0.12)";

function binColor(days: number): string {
  if (days <= 3) return BIN_COLORS[0];
  if (days <= 7) return BIN_COLORS[1];
  if (days <= 14) return BIN_COLORS[2];
  return BIN_COLORS[3];
}
function binText(days: number): string {
  return days <= 7 ? INK : "#ffffff";
}

function fmtDate(iso: string, lang: "en" | "fr", withYear = false): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA", {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" as const } : {}),
  });
}

function ChartShell({
  title,
  takeaway,
  source,
  children,
}: {
  title: string;
  takeaway: string;
  source: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-16">
      <h2 className="display max-w-[820px] text-[32px] md:text-[40px]">{title}</h2>
      <p className="mt-4 max-w-[760px] text-[18px] leading-relaxed text-ink/75">{takeaway}</p>
      <div className="mt-8 overflow-x-auto rounded-[24px] border border-line bg-paper-warm p-4 md:p-6">
        {children}
      </div>
      <p className="mt-4 max-w-[760px] text-[13.5px] leading-relaxed text-ink/50">{source}</p>
    </section>
  );
}

function FebWardChart({ data }: { data: ChartsData }) {
  const { t } = useLang();
  const rows = data.febWards;
  const W = 1160;
  const labelW = 320;
  const plotX = labelW;
  const plotW = W - plotX - 190;
  const rowH = 34;
  const top = 8;
  const H = top * 2 + rows.length * rowH;
  const maxDays = 30;
  const x = (days: number) => plotX + (days / maxDays) * plotW;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[760px]" role="img" aria-label={t.charts.c1title}>
      {[0, 5, 10, 15, 20, 25, 30].map((g) => (
        <g key={g}>
          <line x1={x(g)} y1={top} x2={x(g)} y2={H - top} stroke={GRID} strokeWidth={1} />
          <text x={x(g)} y={H - 0} fontSize={11} fill={INK} opacity={0.5} textAnchor="middle">
            {g}
          </text>
        </g>
      ))}
      {rows.map((r, i) => {
        const y = top + i * rowH;
        const days = r.days ?? 0;
        const isSlowest = i === 0;
        const isFastest = i === rows.length - 1;
        return (
          <g key={r.ward}>
            <text x={labelW - 12} y={y + 21} fontSize={14.5} fill={INK} textAnchor="end" fontWeight={isSlowest || isFastest ? 600 : 400}>
              {r.name} ({parseInt(r.ward, 10)})
            </text>
            <rect x={plotX} y={y + 5} width={Math.max(3, x(days) - plotX)} height={23} rx={4} fill={r.days === null ? NOT_BACK_COLOR : binColor(days)} />
            <text x={x(days) + 10} y={y + 22} fontSize={14.5} fill={INK} fontWeight={isSlowest || isFastest ? 700 : 500}>
              {r.days === null ? "30+" : `${r.days} ${t.charts.daysUnit}`}
              {isSlowest ? ` · ${t.charts.slowest}` : ""}
              {isFastest ? ` · ${t.charts.fastest}` : ""}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function FebDailyChart({ data }: { data: ChartsData }) {
  const { t, lang } = useLang();
  const days = data.dailyFeb;
  const W = 1160;
  const H = 430;
  const left = 64;
  const right = 16;
  const topPad = 34;
  const bottom = 52;
  const plotW = W - left - right;
  const plotH = H - topPad - bottom;
  const maxY = 7000;
  const px = (i: number) => left + (i / (days.length - 1)) * plotW;
  const py = (v: number) => topPad + plotH - (v / maxY) * plotH;
  const line = (vals: (number | null)[]) =>
    vals
      .map((v, i) => (v === null ? null : `${i === 0 ? "M" : "L"}${px(i).toFixed(1)},${py(v).toFixed(1)}`))
      .filter(Boolean)
      .join(" ");
  const stormStart = days.findIndex((d) => d.date === "2025-02-12");
  const stormEnd = days.findIndex((d) => d.date === "2025-02-16");
  const lowest = days.reduce((a, b) => (b.count < a.count ? b : a), days[0]);
  const lowestIdx = days.indexOf(lowest);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[760px]" role="img" aria-label={t.charts.c2title}>
      {stormStart >= 0 && stormEnd >= 0 && (
        <rect x={px(stormStart)} y={topPad} width={px(stormEnd) - px(stormStart)} height={plotH} fill={CANADA} opacity={0.08} />
      )}
      {[0, 2000, 4000, 6000].map((g) => (
        <g key={g}>
          <line x1={left} y1={py(g)} x2={W - right} y2={py(g)} stroke={GRID} strokeWidth={1} />
          <text x={left - 8} y={py(g) + 4} fontSize={12} fill={INK} opacity={0.55} textAnchor="end">
            {g.toLocaleString(lang === "fr" ? "fr-CA" : "en-CA")}
          </text>
        </g>
      ))}
      <text x={left} y={16} fontSize={12.5} fill={INK} opacity={0.6}>
        {t.charts.ticketsPerDay}
      </text>
      <path d={line(days.map((d) => d.baseline))} fill="none" stroke={CANADA} strokeWidth={2} strokeDasharray="7 5" />
      <path d={line(days.map((d) => d.count))} fill="none" stroke={INK} strokeWidth={2.5} />
      {days.map((d, i) =>
        i % 4 === 0 || i === days.length - 1 ? (
          <text key={d.date} x={px(i)} y={H - 28} fontSize={12} fill={INK} opacity={0.6} textAnchor="middle">
            {fmtDate(d.date, lang)}
          </text>
        ) : null
      )}
      <circle cx={px(lowestIdx)} cy={py(lowest.count)} r={5} fill={CANADA} />
      <text x={px(lowestIdx)} y={py(lowest.count) + 26} fontSize={13} fontWeight={600} fill={CANADA} textAnchor="middle">
        {lowest.count.toLocaleString(lang === "fr" ? "fr-CA" : "en-CA")} · {fmtDate(lowest.date, lang)}
      </text>
      <g fontSize={13.5}>
        <line x1={left} y1={H - 8} x2={left + 30} y2={H - 8} stroke={INK} strokeWidth={2.5} />
        <text x={left + 38} y={H - 4} fill={INK}>
          {t.charts.ticketsWritten}
        </text>
        <line x1={left + 190} y1={H - 8} x2={left + 220} y2={H - 8} stroke={CANADA} strokeWidth={2} strokeDasharray="7 5" />
        <text x={left + 228} y={H - 4} fill={INK}>
          {t.charts.normalLevel}
        </text>
        <rect x={left + 520} y={H - 15} width={22} height={13} fill={CANADA} opacity={0.12} />
        <text x={left + 550} y={H - 4} fill={INK}>
          {t.charts.stormWindow}
        </text>
      </g>
    </svg>
  );
}

function Heatmap({ data }: { data: ChartsData }) {
  const { t, lang } = useLang();
  const W = 1160;
  const labelW = 300;
  const topPad = 108;
  const colW = (W - labelW - 12) / data.storms.length;
  const cellH = 27;
  const gap = 3;
  const H = topPad + data.heat.length * cellH + 132;
  const cellFill = (c: HeatCell): string => {
    if (c.status === "unscored_low_baseline") return UNSCORED_COLOR;
    if (c.status === "not_recovered_30d") return NOT_BACK_COLOR;
    if (c.status === "not_recovered_before_data_end") return "#c9ccd4";
    return binColor(c.days ?? 0);
  };
  const cellText = (c: HeatCell): string => {
    if (c.status === "unscored_low_baseline") return "·";
    if (c.status === "not_recovered_30d") return "30+";
    if (c.status === "not_recovered_before_data_end") return "*";
    return String(c.days);
  };
  const cellTextColor = (c: HeatCell): string => {
    if (c.status === "not_recovered_30d") return "#ffffff";
    if (c.days !== null) return binText(c.days);
    return INK;
  };
  const legend: { swatch: React.ReactNode; label: string }[] = [
    { swatch: <rect width={18} height={18} rx={3} fill={BIN_COLORS[0]} />, label: t.charts.legendFast },
    { swatch: <rect width={18} height={18} rx={3} fill={BIN_COLORS[1]} />, label: t.charts.legendMid },
    { swatch: <rect width={18} height={18} rx={3} fill={BIN_COLORS[2]} />, label: t.charts.legendSlow },
    { swatch: <rect width={18} height={18} rx={3} fill={BIN_COLORS[3]} />, label: t.charts.legendSlowest },
    {
      swatch: (
        <>
          <rect width={18} height={18} rx={3} fill={NOT_BACK_COLOR} />
          <path d="M-4,22 L22,-4 M-4,8 L8,-4 M10,22 L22,10" stroke="#ffffff" strokeWidth={2.4} />
        </>
      ),
      label: t.charts.legendNotBack,
    },
    {
      swatch: (
        <>
          <rect width={18} height={18} rx={3} fill="#c9ccd4" />
          <circle cx={4.5} cy={4.5} r={1.6} fill={INK} opacity={0.45} />
          <circle cx={13.5} cy={4.5} r={1.6} fill={INK} opacity={0.45} />
          <circle cx={9} cy={11} r={1.6} fill={INK} opacity={0.45} />
          <circle cx={4.5} cy={17} r={1.6} fill={INK} opacity={0.45} />
          <circle cx={13.5} cy={17} r={1.6} fill={INK} opacity={0.45} />
        </>
      ),
      label: t.charts.legendDataEnd,
    },
    { swatch: <rect width={18} height={18} rx={3} fill={UNSCORED_COLOR} />, label: t.charts.legendUnscored },
  ];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[820px]" role="img" aria-label={t.charts.c3title}>
      <defs>
        <pattern id="hatchNotBack" width={7} height={7} patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <rect width={7} height={7} fill={NOT_BACK_COLOR} />
          <line x1={0} y1={0} x2={0} y2={7} stroke="#ffffff" strokeWidth={2.2} />
        </pattern>
        <pattern id="dotsDataEnd" width={8} height={8} patternUnits="userSpaceOnUse">
          <rect width={8} height={8} fill="#c9ccd4" />
          <circle cx={2} cy={2} r={1.5} fill={INK} opacity={0.4} />
          <circle cx={6} cy={6} r={1.5} fill={INK} opacity={0.4} />
        </pattern>
      </defs>
      {data.storms.map((s, j) => {
        const cx = labelW + j * colW + 8;
        return (
          <text
            key={s.id}
            x={cx}
            y={topPad - 12}
            fontSize={13}
            fill={INK}
            textAnchor="start"
            transform={`rotate(-50 ${cx} ${topPad - 12})`}
          >
            {fmtDate(s.start, lang, true)}
          </text>
        );
      })}
      {data.heat.map((row, i) => {
        const y = topPad + i * cellH;
        return (
          <g key={row.ward}>
            <text x={labelW - 10} y={y + cellH / 2 + 5} fontSize={13.5} fill={INK} textAnchor="end">
              {row.name} ({parseInt(row.ward, 10)})
            </text>
            {row.cells.map((c, j) => {
              const x = labelW + j * colW;
              const fill =
                c.status === "not_recovered_30d"
                  ? "url(#hatchNotBack)"
                  : c.status === "not_recovered_before_data_end"
                    ? "url(#dotsDataEnd)"
                    : cellFill(c);
              return (
                <g key={j}>
                  <rect x={x + gap / 2} y={y + gap / 2} width={colW - gap} height={cellH - gap} rx={4} fill={fill} />
                  <text x={x + colW / 2} y={y + cellH / 2 + 5} fontSize={12.5} fontWeight={600} fill={cellTextColor(c)} textAnchor="middle">
                    {cellText(c)}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
      {legend.map((item, i) => {
        const y = topPad + data.heat.length * cellH + 22 + (i % 4) * 24;
        const x = i < 4 ? 0 : W / 2;
        return (
          <g key={item.label} transform={`translate(${x}, ${y})`}>
            <svg width={18} height={18} viewBox="0 0 18 18">
              {item.swatch}
            </svg>
            <text x={26} y={14} fontSize={12.5} fill={INK} opacity={0.75}>
              {item.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function MedianChart({ data }: { data: ChartsData }) {
  const { t, lang } = useLang();
  const W = 1160;
  const H = 440;
  const left = 56;
  const topPad = 30;
  const bottom = 92;
  const plotW = W - left - 16;
  const plotH = H - topPad - bottom;
  const maxY = 8;
  const py = (v: number) => topPad + plotH - (v / maxY) * plotH;
  const slot = plotW / data.storms.length;
  const barW = Math.min(84, slot - 28);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[760px]" role="img" aria-label={t.charts.c4title}>
      {[0, 2, 4, 6, 8].map((g) => (
        <g key={g}>
          <line x1={left} y1={py(g)} x2={W - 16} y2={py(g)} stroke={GRID} strokeWidth={1} />
          <text x={left - 8} y={py(g) + 4} fontSize={12} fill={INK} opacity={0.55} textAnchor="end">
            {g}
          </text>
        </g>
      ))}
      <text x={left} y={16} fontSize={12.5} fill={INK} opacity={0.6}>
        {t.charts.medianDays}
      </text>
      {data.storms.map((s, i) => {
        const cx = left + slot * i + slot / 2;
        const v = s.median ?? 0;
        const isFeb = s.id === "2025-02-12";
        return (
          <g key={s.id}>
            <rect x={cx - barW / 2} y={py(v)} width={barW} height={py(0) - py(v)} rx={5} fill={isFeb ? CANADA : "#3c4356"} />
            <text x={cx} y={py(v) - 9} fontSize={16} fontWeight={700} fill={INK} textAnchor="middle">
              {s.median}
              {s.dataEndCount > 0 ? "*" : ""}
            </text>
            <text x={cx} y={py(0) + 22} fontSize={12.5} fill={INK} opacity={0.7} textAnchor="middle">
              {fmtDate(s.start, lang)}
            </text>
            <text x={cx} y={py(0) + 40} fontSize={12.5} fill={INK} opacity={0.55} textAnchor="middle">
              {s.start.slice(0, 4)} · {s.snowCm} cm
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function ChartsView({ data }: { data: ChartsData }) {
  const { t } = useLang();
  return (
    <section className="bg-paper">
      <div className="mx-auto max-w-[1392px] px-6 pb-20 pt-14 md:pt-20">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-canada">{t.charts.kicker}</p>
        <h1 className="display mt-5 max-w-[920px] text-[44px] md:text-[64px]">{t.charts.title}</h1>
        <p className="mt-6 max-w-[760px] text-[18px] leading-relaxed text-ink/70">{t.charts.intro}</p>
        <ChartShell title={t.charts.c1title} takeaway={t.charts.c1takeaway} source={t.charts.c1source}>
          <FebWardChart data={data} />
        </ChartShell>
        <ChartShell title={t.charts.c2title} takeaway={t.charts.c2takeaway} source={t.charts.c2source}>
          <FebDailyChart data={data} />
        </ChartShell>
        <ChartShell title={t.charts.c3title} takeaway={t.charts.c3takeaway} source={t.charts.c3source}>
          <Heatmap data={data} />
        </ChartShell>
        <ChartShell title={t.charts.c4title} takeaway={t.charts.c4takeaway} source={t.charts.c4source}>
          <MedianChart data={data} />
        </ChartShell>
      </div>
    </section>
  );
}
