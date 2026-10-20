"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

export type Lang = "en" | "fr";

const en = {
  banner: {
    line: "An open-source civic project by Nshipyard. Not affiliated with the Government of Canada or the City of Toronto.",
    badge: "Open source",
  },
  nav: { explorer: "Recovery map", results: "Results", developers: "Developers", data: "Data", back: "All projects" },
  hero: {
    kicker: "Nshipyard Canada · Parking recovery",
    title: "Toronto parking recovery times by ward",
    lead: "After the February 2025 storm, Beaches-East York recovered in 1 day. Scarborough Centre took 29.",
    sub: "When a major snowstorm hits Toronto, street parking stalls disappear under snow banks and enforcement stops. The City publishes every parking ticket it writes. This project measures, for each major storm from 2023 to 2025, how many days passed before daily ticket counts in each ward returned to at least 90 percent of their normal level for that weekday. Ticket counts are an inference about cleared, usable parking, not a direct measure of cleared streets: officers may be reassigned during a storm, and a quiet day can also mean drivers stayed home.",
    cta1: "See the recovery map",
    cta2: "Read the methodology",
  },
  statsLabels: [
    "major snow events measured, 2023-2025 (Environment Canada, Toronto Intl A)",
    "wards scored for the February 2025 storm, out of 25",
    "days for the slowest ward to get back to 90% after the February 2025 storm (inference, from ticket counts)",
    "centimetres of snow fell in the February 12-16, 2025 window at Toronto Intl A",
  ],
  facts: {
    kicker: "What the cost looks like",
    title: "Snow-covered stalls are parking the city cannot sell or use.",
    items: [
      "Fact: repainting one parking stall costs about $6 (Toronto Parking Authority material, 2026 budget discussion).",
      "Fact: one metered on-street space brings in about $3,200 a year. The Toronto Parking Authority's 2026 budget reports $67.7M of on-street revenue across about 21,000 spaces.",
      "Fact: the February 2025 storm closed 47% of the Parking Authority's on-street inventory for snow removal and cut transactions by 371,000 (Toronto Parking Authority 2026 Operating Budget report).",
      "Inference: a ward whose ticket counts stay below 90% of normal for ten days is a ward where street parking was likely still buried, blocked, or unenforced for most of that period. The ticket data cannot separate those three causes.",
    ],
  },
  explorer: {
    kicker: "Recovery map",
    title: "Days to get back to normal, by ward and by neighbourhood.",
    body: "Pick a storm. The map colours each area by how many days passed after the last snow day before ticket counts reached at least 90% of that weekday's normal level and stayed there for two days in a row. Grey means the area writes too few tickets in normal times to score honestly, so no number is shown.",
    event: "Storm",
    layerWard: "Wards",
    layerHood: "Neighbourhoods",
    cmSnow: "cm of snow",
    snowOnGround: "peak snow on ground",
    legendFast: "Back in 1-3 days",
    legendMid: "4-7 days",
    legendSlow: "8-14 days",
    legendSlowest: "15-30 days",
    legendGrey: "Too few tickets to score",
    caveatTitle: "Read this before citing a number",
    caveat: "Tickets measure enforcement, and enforcement is a stand-in for usable parking. If officers were pulled to other duties, counts fall even on cleared streets. If a ward recovers on paper in two days, that means officers were writing tickets at normal rates again, not that every stall was plowed. Treat every recovery time on this page as an inference with that limit attached.",
    dailyTitle: "Citywide tickets per day, as a share of normal",
    dailyBody: "Each bar is one day, from 14 days before the storm to 30 days after it ends. The dashed line is 90% of normal for that weekday. Red bars are days inside the storm window.",
    baseline: "Normal level (this weekday)",
    resultsTitle: "Slowest and fastest, ward level",
    resultsBody: "Ranked by recovery days for the selected storm. Areas that never reached 90% within 30 days are listed separately, not assigned a fake number.",
    colArea: "Area",
    colBaseline: "Normal tickets/day",
    colDip: "Lowest day vs normal",
    colRecovery: "Recovery",
    colStatus: "Status",
    days: "days",
    day1: "day",
    notBack: "Not back within 30 days",
    unscored: "Not scored",
    hoodTitle: "Slowest and fastest, neighbourhood level",
    hoodBody: "Same measure across the 158 neighbourhoods. Neighbourhoods under 5 tickets a day in normal times are not scored.",
    fastest: "Fastest",
    slowest: "Slowest",
  },
  developers: {
    kicker: "For developers",
    title: "Query it from code, or from an agent.",
    body: "Three consumption paths, same canonical data. REST for applications, OpenAPI for integration, MCP tools over streamable HTTP for AI agents.",
    endpoints: "Endpoints",
    tryIt: "Try it",
    openapi: "OpenAPI spec",
  },
  downloads: {
    kicker: "Data",
    title: "Take the files.",
    body: "The full computed dataset: one row per storm per area, with the baseline, the recovery time, and a flag for areas that could not be scored. MIT licensed.",
    download: "Download",
  },
  methodology: {
    kicker: "Methodology",
    title: "How each recovery time was computed.",
    points: [
      "Storms (fact): daily snowfall from Environment Canada, station Toronto Intl A (climate identifier 6158731). A snow day has at least 5 cm. Snow days at most 3 days apart are grouped into one storm, and a storm counts as major when its window totals at least 10 cm. Nine storms qualify between 2023 and 2025, including February 12-16, 2025, with 51.4 cm in the window.",
      "Tickets (fact): City of Toronto open data, Parking Tickets, calendar years 2023-2025, 6,454,695 tickets. Each ticket address was matched to the City's Address Points file on house number and street name, then placed in a ward and a 158-model neighbourhood by point-in-polygon on the official boundaries. 86.9% of tickets matched; the rest have no house number or no matching address and are excluded.",
      "Normal level: for each area and each storm, the 14 calendar days before the storm, excluding days that belong to any storm window. Each day is compared only with the same weekday in that window, so a Monday is judged against Mondays. This handles the weekday pattern in enforcement without extra modelling.",
      "Recovery (rule): the first day after the storm whose ticket count reaches at least 90% of that weekday's normal level, with the following day also at or above its own 90% level. Recovery days are counted in calendar days from the last day of the storm window. The search stops after 30 days. Days that belong to a different storm window never count toward recovery, which matters in February 2025: the February 8 storm and the February 12-16 storm sit four days apart, so a ward knocked down by both is measured against the calendar, not credited with recovery days that were actually the second storm.",
      "Honesty rules: a ward is scored only if its normal level is at least 20 tickets a day, a neighbourhood only at 5 a day, with at least 10 usable baseline days. Areas under the bar are labelled unscored and are never given an invented recovery time. Areas that do not recover within 30 days say so. The two December 2025 storms can also run into the end of the ticket data on December 31, 2025, which is labelled as its own status.",
      "What tickets cannot show (limit): ticket counts track enforcement activity. During a storm, officers can be reassigned, drivers can stay away, and stalls can be legally unusable because of snow windrows even after the road itself is plowed. A recovery time is therefore an inference about parking being usable and enforced again, not a direct measurement of cleared pavement. The City repaints road markings from June 1 to October 31, which does not affect these winter measures.",
      "Why this proxy (context): there is no public stall-level map of Toronto street parking. SenSen holds a closed contract with the Toronto Parking Authority to map street parking with AI, and the stall inventory itself is not published. The enforcement record is the only stall-adjacent dataset the City releases, which is why this project uses it and labels the inference openly.",
    ],
  },
  footer: {
    line: "An open-source civic project by Nshipyard. Not affiliated with the Government of Canada or the City of Toronto.",
    sources: "Tickets: City of Toronto Open Data (Parking Tickets, 2023-2025). Weather: Environment Canada climate-daily, Toronto Intl A (6158731). Boundaries: City of Toronto Open Data (City Wards, Neighbourhoods 158 model). Costs: Toronto Parking Authority 2026 Operating Budget report.",
  },
  mcp: {
    kicker: "Connect your agent",
    title: "Put this data to work inside your AI tools.",
    body: "Pick your harness, copy the prompt, send it to your agent. Your agent runs the setup itself.",
    tabs: { chatgpt: "ChatGPT", claude: "Claude", claudecode: "Claude Code", cli: "CLI", other: "Other" },
    cardTitle: "Copy and send this to {tab}",
    copy: "Copy",
    copied: "Copied",
    chatgptNote: "ChatGPT connects through the documented REST API rather than MCP directly.",
    pChatgpt:
      "I want to use the {displayName} through its API.\n- OpenAPI spec: {origin}/api/openapi.json\n- REST base: {origin}/api/v1\nFirst tell me in two sentences what this API offers, then {exampleLower}, and show me the result.",
    pClaude:
      "In Claude (claude.ai), open Settings, then Connectors, and add a custom connector:\n- Name: {displayName}\n- URL: {origin}/mcp\nThen list the available tools, {exampleLower}, and show me the result.",
    pClaudeCode:
      "Set up the {displayName} MCP server so I can query it from here.\n1. Run: claude mcp add --transport http {slug} {origin}/mcp\n2. Run `claude mcp list` to confirm it connected.\n3. {example}, and show me the result.",
    pCli:
      "# MCP endpoint (streamable HTTP)\n{origin}/mcp\n\n# List the available tools\ncurl -s -X POST {origin}/mcp -H 'Content-Type: application/json' \\\n  -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\"}'",
    otherTitle: "Everything else",
    otherBody: "Any harness that speaks MCP over streamable HTTP, or plain REST.",
    mcpEndpoint: "MCP endpoint",
    openapiSpec: "OpenAPI spec",
    restBase: "REST base",
  },
};

const fr: Dict = {
  banner: {
    line: "Un projet civique à code source ouvert par Nshipyard. Sans affiliation avec le gouvernement du Canada ni la Ville de Toronto.",
    badge: "Code source ouvert",
  },
  nav: { explorer: "Carte de reprise", results: "Résultats", developers: "Développeurs", data: "Données", back: "Tous les projets" },
  hero: {
    kicker: "Nshipyard Canada · Reprise du stationnement",
    title: "Délais de rétablissement du stationnement à Toronto, par arrondissement",
    lead: "Après la tempête de février 2025, Beaches-East York s'est rétabli en 1 jour. Scarborough Centre a pris 29 jours.",
    sub: "Quand une tempête majeure frappe Toronto, les places de stationnement disparaissent sous la neige et l'application des règlements s'arrête. La Ville publie chaque contravention qu'elle émet. Ce projet mesure, pour chaque tempête majeure de 2023 à 2025, combien de jours il a fallu avant que le nombre quotidien de contraventions dans chaque arrondissement revienne à au moins 90 pour cent de son niveau normal pour ce jour de semaine. Ces comptes sont une inférence sur le stationnement dégagé et utilisable, pas une mesure directe des rues déneigées : les agents peuvent être réaffectés pendant une tempête, et une journée calme peut aussi signifier que les conducteurs sont restés chez eux.",
    cta1: "Voir la carte de reprise",
    cta2: "Lire la méthodologie",
  },
  statsLabels: [
    "tempêtes de neige majeures mesurées, 2023-2025 (Environnement Canada, Toronto Intl A)",
    "arrondissements notés pour la tempête de février 2025, sur 25",
    "jours pour l'arrondissement le plus lent avant de revenir à 90 % après la tempête de février 2025 (inférence, à partir des contraventions)",
    "centimètres de neige tombés du 12 au 16 février 2025 à Toronto Intl A",
  ],
  facts: {
    kicker: "Ce que cela coûte",
    title: "Des places couvertes de neige, c'est du stationnement que la ville ne peut ni vendre ni utiliser.",
    items: [
      "Fait : repeindre une place de stationnement coûte environ 6 $ (documents de la Toronto Parking Authority, budget 2026).",
      "Fait : une place sur rue avec parcomètre rapporte environ 3 200 $ par année. Le budget 2026 de la Toronto Parking Authority déclare 67,7 M$ de revenus sur rue pour environ 21 000 places.",
      "Fait : la tempête de février 2025 a fermé 47 % de l'inventaire sur rue de la Parking Authority pour le déneigement et réduit les transactions de 371 000 (rapport du budget de fonctionnement 2026 de la Toronto Parking Authority).",
      "Inférence : un arrondissement dont les contraventions restent sous 90 % de la normale pendant dix jours est un arrondissement où le stationnement sur rue était probablement encore enseveli, bloqué ou non verbalisé pendant la majeure partie de cette période. Les données ne permettent pas de distinguer ces trois causes.",
    ],
  },
  explorer: {
    kicker: "Carte de reprise",
    title: "Jours pour revenir à la normale, par arrondissement et par quartier.",
    body: "Choisissez une tempête. La carte colore chaque secteur selon le nombre de jours après le dernier jour de neige avant que les contraventions atteignent au moins 90 % du niveau normal de ce jour de semaine, deux jours de suite. Le gris signifie que le secteur reçoit trop peu de contraventions en temps normal pour être noté honnêtement, donc aucun chiffre n'est affiché.",
    event: "Tempête",
    layerWard: "Arrondissements",
    layerHood: "Quartiers",
    cmSnow: "cm de neige",
    snowOnGround: "neige au sol maximale",
    legendFast: "Retour en 1 à 3 jours",
    legendMid: "4 à 7 jours",
    legendSlow: "8 à 14 jours",
    legendSlowest: "15 à 30 jours",
    legendGrey: "Trop peu de contraventions pour être noté",
    caveatTitle: "À lire avant de citer un chiffre",
    caveat: "Les contraventions mesurent l'application des règlements, qui sert ici d'indicateur du stationnement utilisable. Si les agents ont été réaffectés à d'autres tâches, les comptes chutent même sur des rues dégagées. Si un arrondissement semble rétabli en deux jours, cela signifie que les agents verbalisaient de nouveau à un rythme normal, pas que chaque place était déneigée. Chaque temps de reprise sur cette page est une inférence assortie de cette limite.",
    dailyTitle: "Contraventions quotidiennes à l'échelle de la ville, en part de la normale",
    dailyBody: "Chaque barre est un jour, de 14 jours avant la tempête à 30 jours après sa fin. La ligne pointillée indique 90 % de la normale pour ce jour de semaine. Les barres rouges sont les jours dans la fenêtre de la tempête.",
    baseline: "Niveau normal (ce jour de semaine)",
    resultsTitle: "Les plus lents et les plus rapides, par arrondissement",
    resultsBody: "Classement par jours de reprise pour la tempête choisie. Les secteurs qui n'ont jamais atteint 90 % sous 30 jours sont listés séparément, sans chiffre inventé.",
    colArea: "Secteur",
    colBaseline: "Contraventions normales/jour",
    colDip: "Jour le plus bas vs normale",
    colRecovery: "Reprise",
    colStatus: "Statut",
    days: "jours",
    day1: "jour",
    notBack: "Pas de retour sous 30 jours",
    unscored: "Non noté",
    hoodTitle: "Les plus lents et les plus rapides, par quartier",
    hoodBody: "Même mesure pour les 158 quartiers. Les quartiers à moins de 5 contraventions par jour en temps normal ne sont pas notés.",
    fastest: "Les plus rapides",
    slowest: "Les plus lents",
  },
  developers: {
    kicker: "Pour les développeurs",
    title: "Interrogez-les depuis du code, ou depuis un agent.",
    body: "Trois façons de consommer les mêmes données canoniques. REST pour les applications, OpenAPI pour l'intégration, outils MCP en HTTP continu pour les agents IA.",
    endpoints: "Points de terminaison",
    tryIt: "Essayer",
    openapi: "Spécification OpenAPI",
  },
  downloads: {
    kicker: "Données",
    title: "Prenez les fichiers.",
    body: "Le jeu de données complet calculé : une ligne par tempête et par secteur, avec la normale, le temps de reprise et un indicateur pour les secteurs qui n'ont pas pu être notés. Licence MIT.",
    download: "Télécharger",
  },
  methodology: {
    kicker: "Méthodologie",
    title: "Comment chaque temps de reprise a été calculé.",
    points: [
      "Tempêtes (fait) : chutes de neige quotidiennes d'Environnement Canada, station Toronto Intl A (identifiant climatique 6158731). Un jour de neige compte au moins 5 cm. Les jours de neige espacés d'au plus 3 jours sont regroupés en une tempête, et une tempête est majeure quand sa fenêtre totalise au moins 10 cm. Neuf tempêtes se qualifient entre 2023 et 2025, dont celle du 12 au 16 février 2025, avec 51,4 cm dans la fenêtre.",
      "Contraventions (fait) : données ouvertes de la Ville de Toronto, contraventions de stationnement, années civiles 2023-2025, 6 454 695 contraventions. Chaque adresse a été appariée au fichier Points d'adresse de la Ville sur le numéro civique et le nom de rue, puis placée dans un arrondissement et un quartier du modèle 158 par jointure point-dans-polygone sur les limites officielles. 86,9 % des contraventions ont été appariées; les autres n'ont pas de numéro civique ou d'adresse correspondante et sont exclues.",
      "Niveau normal : pour chaque secteur et chaque tempête, les 14 jours civils précédant la tempête, en excluant les jours appartenant à toute fenêtre de tempête. Chaque jour n'est comparé qu'au même jour de semaine dans cette fenêtre, donc un lundi est jugé contre des lundis. Cela tient compte du rythme hebdomadaire de l'application sans modélisation supplémentaire.",
      "Reprise (règle) : le premier jour après la tempête dont le compte atteint au moins 90 % du niveau normal de ce jour de semaine, le jour suivant atteignant aussi son propre seuil de 90 %. Les jours de reprise sont comptés en jours civils à partir du dernier jour de la fenêtre de tempête. La recherche s'arrête après 30 jours. Les jours appartenant à une autre fenêtre de tempête ne comptent jamais pour la reprise, ce qui compte en février 2025 : la tempête du 8 février et celle du 12 au 16 février sont à quatre jours d'intervalle, donc un arrondissement frappé par les deux est mesuré au calendrier, sans jours de reprise qui étaient en fait la deuxième tempête.",
      "Règles d'honnêteté : un arrondissement n'est noté que si son niveau normal est d'au moins 20 contraventions par jour, un quartier d'au moins 5 par jour, avec au moins 10 jours de référence utilisables. Les secteurs sous le seuil sont marqués non notés et ne reçoivent jamais un temps inventé. Les secteurs qui ne se rétablissent pas sous 30 jours le disent. Les deux tempêtes de décembre 2025 peuvent aussi buter sur la fin des données, le 31 décembre 2025, ce qui porte son propre statut.",
      "Ce que les contraventions ne montrent pas (limite) : les comptes suivent l'activité d'application. Pendant une tempête, les agents peuvent être réaffectés, les conducteurs peuvent s'abstenir, et des places peuvent être légalement inutilisables à cause des andains même après le déneigement de la chaussée. Un temps de reprise est donc une inférence sur le stationnement de nouveau utilisable et verbalisé, pas une mesure directe du déneigement. La Ville repeint le marquage routier du 1er juin au 31 octobre, ce qui ne touche pas ces mesures hivernales.",
      "Pourquoi cet indicateur (contexte) : il n'existe aucune carte publique des places de stationnement sur rue à Toronto, place par place. SenSen détient un contrat fermé avec la Toronto Parking Authority pour cartographier le stationnement sur rue par intelligence artificielle, et l'inventaire des places lui-même n'est pas publié. Le registre des contraventions est le seul jeu de données proche des places que la Ville diffuse, d'où son usage ici, avec l'inférence signalée ouvertement.",
    ],
  },
  footer: {
    line: "Un projet civique à code source ouvert par Nshipyard. Sans affiliation avec le gouvernement du Canada ni la Ville de Toronto.",
    sources: "Contraventions : Données ouvertes de la Ville de Toronto (contraventions de stationnement, 2023-2025). Météo : Environnement Canada, données climatiques quotidiennes, Toronto Intl A (6158731). Limites : Données ouvertes de la Ville de Toronto (arrondissements, quartiers modèle 158). Coûts : rapport du budget de fonctionnement 2026 de la Toronto Parking Authority.",
  },
  mcp: {
    kicker: "Connectez votre agent",
    title: "Exploitez ces données dans vos outils d'IA.",
    body: "Choisissez votre plateforme, copiez l'invite, envoyez-la à votre agent. Votre agent exécute la configuration lui-même.",
    tabs: { chatgpt: "ChatGPT", claude: "Claude", claudecode: "Claude Code", cli: "CLI", other: "Autre" },
    cardTitle: "Copiez et envoyez ceci à {tab}",
    copy: "Copier",
    copied: "Copié",
    chatgptNote: "ChatGPT se connecte via l'API REST documentée plutôt que directement en MCP.",
    pChatgpt:
      "Je veux utiliser {displayName} via son API.\n- Spécification OpenAPI : {origin}/api/openapi.json\n- Base REST : {origin}/api/v1\nD'abord, dis-moi en deux phrases ce que cette API offre, puis {exampleLower}, et montre-moi le résultat.",
    pClaude:
      "Dans Claude (claude.ai), ouvre les paramètres, puis Connecteurs, et ajoute un connecteur personnalisé :\n- Nom : {displayName}\n- URL : {origin}/mcp\nEnsuite, liste les outils disponibles, {exampleLower}, et montre-moi le résultat.",
    pClaudeCode:
      "Configure le serveur MCP {displayName} pour que je puisse l'interroger d'ici.\n1. Exécute : claude mcp add --transport http {slug} {origin}/mcp\n2. Exécute `claude mcp list` pour confirmer la connexion.\n3. {example}, et montre-moi le résultat.",
    pCli:
      "# Point de terminaison MCP (HTTP continu)\n{origin}/mcp\n\n# Lister les outils disponibles\ncurl -s -X POST {origin}/mcp -H 'Content-Type: application/json' \\\n  -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\"}'",
    otherTitle: "Tout le reste",
    otherBody: "Toute plateforme qui parle MCP en HTTP continu, ou REST tout court.",
    mcpEndpoint: "Point de terminaison MCP",
    openapiSpec: "Spécification OpenAPI",
    restBase: "Base REST",
  },
};

export type Dict = typeof en;

const dicts: Record<Lang, Dict> = { en, fr };

const LangCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: Dict }>({
  lang: "en",
  setLang: () => {},
  t: en,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return <LangCtx.Provider value={{ lang, setLang, t: dicts[lang] }}>{children}</LangCtx.Provider>;
}

export function useLang() {
  return useContext(LangCtx);
}
