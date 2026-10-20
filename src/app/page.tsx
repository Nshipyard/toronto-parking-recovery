"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/i18n";
import { Banner, Nav, Footer } from "@/components/chrome";
import RecoveryExplorer from "@/components/RecoveryExplorer";
import Developers from "@/components/Developers";

interface Summary {
  events_count: number;
  feb_event: { id: string; snow_total_cm: number; wards_scored: number; slowest_ward_days: number | null };
}

function fmt(n: number) {
  return n.toLocaleString("en-CA");
}

function Hero() {
  const { t } = useLang();
  const [s, setS] = useState<Summary | null>(null);
  useEffect(() => {
    fetch("/api/v1/recovery/summary")
      .then((r) => r.json())
      .then(setS)
      .catch(() => {});
  }, []);
  const stats = s
    ? [
        { value: fmt(s.events_count), label: t.statsLabels[0] },
        { value: `${s.feb_event.wards_scored}/25`, label: t.statsLabels[1] },
        { value: s.feb_event.slowest_ward_days !== null ? fmt(s.feb_event.slowest_ward_days) : "30+", label: t.statsLabels[2] },
        { value: `${s.feb_event.snow_total_cm}`, label: t.statsLabels[3] },
      ]
    : [];
  return (
    <section id="top" className="bg-paper">
      <div className="mx-auto max-w-[1392px] px-6 pb-16 pt-16 md:pb-24 md:pt-24">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-canada">{t.hero.kicker}</p>
        <h1 className="display mt-5 max-w-[920px] text-[52px] md:text-[84px]">{t.hero.title}</h1>
        <p className="mt-6 max-w-[720px] text-[19px] leading-relaxed text-ink/70 md:text-[21px]">{t.hero.lead}</p>
        <p className="mt-6 max-w-[720px] text-[19px] leading-relaxed text-ink/70 md:text-[21px]">{t.hero.sub}</p>
        <div className="mt-9 flex flex-wrap gap-3">
          <a href="#explorer" className="rounded-full bg-canada px-7 py-3.5 text-[16px] font-semibold text-white hover:bg-canada-dark">
            {t.hero.cta1}
          </a>
          <a href="#methodology" className="rounded-full border border-line px-7 py-3.5 text-[16px] font-semibold hover:border-ink">
            {t.hero.cta2}
          </a>
        </div>
        {stats.length > 0 && (
          <div className="mt-16 grid gap-px overflow-hidden rounded-[24px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((st) => (
              <div key={st.label} className="bg-paper p-7">
                <p className="display text-[44px] text-canada">{st.value}</p>
                <p className="mt-2 text-[15px] leading-snug text-ink/65">{st.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Facts() {
  const { t } = useLang();
  return (
    <section className="bg-paper">
      <div className="mx-auto max-w-[1392px] px-6 pb-4 pt-4">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-canada">{t.facts.kicker}</p>
        <h2 className="display mt-4 max-w-[760px] text-[36px] md:text-[44px]">{t.facts.title}</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {t.facts.items.map((it, i) => (
            <div key={i} className="rounded-[20px] border border-line bg-paper-warm p-6">
              <p className="text-[15.5px] leading-relaxed text-ink/75">{it}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Methodology() {
  const { t } = useLang();
  return (
    <section id="methodology" className="bg-paper">
      <div className="mx-auto max-w-[1392px] px-6 py-20 md:py-28">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-canada">{t.methodology.kicker}</p>
        <h2 className="display mt-4 max-w-[720px] text-[40px] md:text-[52px]">{t.methodology.title}</h2>
        <ul className="mt-8 max-w-[820px] space-y-4">
          {t.methodology.points.map((p, i) => (
            <li key={i} className="flex gap-4 rounded-[20px] border border-line bg-paper-warm p-5">
              <span className="display shrink-0 text-[22px] text-canada">{i + 1}</span>
              <p className="text-[16px] leading-relaxed text-ink/75">{p}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Downloads() {
  const { t } = useLang();
  const files = [
    { name: "recovery_by_ward.csv", path: "/data/recovery_by_ward.csv" },
    { name: "recovery_by_neighbourhood.csv", path: "/data/recovery_by_neighbourhood.csv" },
  ];
  return (
    <section id="data" className="bg-paper-warm">
      <div className="mx-auto max-w-[1392px] px-6 py-20 md:py-28">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-canada">{t.downloads.kicker}</p>
        <h2 className="display mt-4 max-w-[720px] text-[40px] md:text-[52px]">{t.downloads.title}</h2>
        <p className="mt-5 max-w-[720px] text-[18px] leading-relaxed text-ink/70">{t.downloads.body}</p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {files.map((f) => (
            <div key={f.name} className="flex items-center justify-between gap-4 rounded-[24px] border border-line bg-paper p-6">
              <code className="font-mono text-[15px] font-medium">{f.name}</code>
              <a href={f.path} download className="shrink-0 rounded-full border border-line px-5 py-2.5 text-[15px] font-semibold hover:border-ink">
                {t.downloads.download}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Banner />
      <Nav />
      <main className="flex-1">
        <Hero />
        <Facts />
        <RecoveryExplorer />
        <Developers />
        <Methodology />
        <Downloads />
      </main>
      <Footer />
    </>
  );
}
