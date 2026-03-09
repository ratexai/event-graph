/**
 * Iran War 2026 — Economic Impact Dashboard & Cui Bono Module
 *
 * Day 10 (March 9, 2026) data:
 * - Coalition spending/burn rates
 * - Hormuz impact metrics
 * - Global daily losses ($2-4B/day)
 * - State-by-state vulnerability assessment
 * - Corporate impact assessment
 * - Market indices
 * - Asymmetric cost analysis
 *
 * Sources: CSIS, IISS, Foreign Policy (Tooze), Bloomberg, Reuters,
 * Stimson Center, Atlas Institute, CNBC, Axios, PolitiFact.
 */

// ─── Hormuz Impact ──────────────────────────────────────────────
export const hormuzImpact = {
  preWarFlow: "20M bbl/day oil + 80M tonnes/year LNG",
  currentFlow: "~0 (tanker traffic near zero since Mar 2)",
  supplyRemoved: "20M bbl/day = 20% of global oil consumption",
  lngDisrupted: "20% of global LNG supply (Qatar Ras Laffan shutdown — first in 30 years)",
  bypassCapacity: "~8M bbl/day max (Saudi East-West 5-7M + UAE Fujairah 1.5M)",
  netDeficit: "~12M bbl/day CANNOT be rerouted",
  shipsStalled: "150-200 tankers anchored outside strait",
  insuranceSurge: "+400% war-risk premium. P&I coverage removed Mar 5",
  vlccRate: "$420K/day (was $120K) — 3.5x normal",
  sprRunway: "Global SPR ~2B barrels → exhausted in ~100 days at 20M bbl/day deficit",
} as const;

// ─── Coalition Spending ─────────────────────────────────────────
export const coalitionSpending = {
  usIsrael: {
    label: "US-Israel Coalition",
    members: ["United States", "Israel", "UK (bases)", "France (naval)"],
    dailyBurnRate: "$800M-1.2B/day",
    usDaily: "$600-900M/day",
    israelDaily: "$150-300M/day",
    cumulativeTotal: "$9-12B (10 days)",
    usBreakdown: {
      precisionMunitions: "$200-350M/day",
      airDefenseInterceptors: "$150-250M/day (THAAD $15M/shot, Patriot $4M, SM-3 $12M)",
      aircraftOps: "$80-120M/day (B-2 $130K/hr, F-35 $42K/hr, carriers)",
      navalOps: "$50-80M/day (2 carrier groups, destroyers, Hormuz patrols)",
      logistics: "$40-60M/day (200K+ troops, airlift, fuel)",
      isr: "$30-50M/day (satellites, AWACS, drones, cyber, SIGINT)",
    },
    munitionsConsumed: {
      total: "6,000+ weapons",
      thaadUsed: "100-200 (25% stock burned in June 2025)",
      patriot: "300-500",
      sm3: "50-100",
      tomahawk: "200-400",
      jdam: "2,000+",
      gbu57BunkerBusters: "50-100 (B-2 only)",
    },
    replenishmentConcern:
      "THAAD: single manufacturer, 18-month lead time. Rare earths from China. 3,000+ munitions in 36hrs = unprecedented burn rate.",
  },
  iranAxis: {
    label: "Iran & Axis of Resistance",
    members: ["Iran (IRGC + Army)", "Hezbollah", "Iraqi Shiite militias", "Houthis", "Syrian proxies"],
    dailyBurnRate: "$50-150M/day",
    cumulativeTotal: "$600M-1.7B (10 days)",
    breakdown: {
      missileDrone: "$20-80M/day (Fattah $1-3M, Shahed $20-50K, Khorramshahr $3-5M)",
      hezbollah: "$5-15M/day (192 waves, Katyusha $500-800, Fateh-110 $100-300K)",
      hormuzOps: "$5-15M/day (IRGC Navy patrols, fast boats, mines)",
      airDefense: "$5-20M/day (82+ enemy drones shot down)",
      civilDefense: "$10-20M/day (evacuations, hospitals, infra repair)",
    },
    costAdvantage: "Iran $1 → US/Israel spends $10-100 to counter",
  },
} as const;

// ─── Global Daily Losses ────────────────────────────────────────
export const globalDailyLosses = {
  totalEstimated: "$2-4B/day",
  breakdown: {
    oilPremium: { amount: "$600M-1.2B/day", calc: "20M bbl/day × $30-60 premium" },
    lngPremium: { amount: "$200-400M/day", calc: "Qatar 20% global LNG offline" },
    shippingCosts: { amount: "$150-300M/day", calc: "VLCC $420K/day, 200+ stalled, insurance +400%" },
    equityLoss: { amount: "$200B-500B/day peak", calc: "Global $110T equity, 0.5-2% daily swings" },
    aviationDisruption: { amount: "$50-100M/day", calc: "Gulf airspace closures, rerouting, tourism collapse" },
    supplyChain: { amount: "$100-300M/day", calc: "33% fertilizers/aluminium/sugar via Hormuz" },
    militaryOps: { amount: "$850M-1.35B/day", calc: "US-Israel + Iran combined" },
  },
  cumulative10Days: {
    totalEconomicDamage: "$20-40B",
    oilPremiumPaid: "$6-12B",
    equityMarketLoss: "$3-5T in market cap",
    militaryUsIsrael: "$9-12B",
    militaryIran: "$600M-1.7B",
    shippingExtra: "$1.5-3B",
    lngPremiumExtra: "$2-4B",
    insuranceExtra: "$500M-1B",
  },
  if30Days: {
    oilAt120: "$1.2B/day premium → $36B in 30 days",
    sprDepletion: "G7 releases 2-3M bbl/day → buys ~2 months max",
    recessionRisk:
      "Full closure >1 month → 'demand destruction pushing crude well into triple digits, gas toward 2022 crisis levels'",
    globalGdpHit: "Each 10% oil rise → -0.5% GDP for net importers (Thailand, India, Japan)",
    foodCrisis: "Fertilizer price spike → agricultural costs → food insecurity",
  },
} as const;

// ─── State Impact Assessments (Right Panel) ─────────────────────
export interface StateAssessment {
  flag: string;
  name: string;
  role: string;
  spending: string;
  dailyCost: string;
  losses: string;
  gains: string;
  netAssessment: string;
  vulnerability: string;
}

export const stateAssessments: StateAssessment[] = [
  {
    flag: "🇺🇸",
    name: "United States",
    role: "Coalition Lead",
    spending: "$7.5-9B (10 days)",
    dailyCost: "$600-900M/day military",
    losses: "7 KIA, 18+ wounded, munitions depleting, diplomatic isolation growing",
    gains: "Air superiority, 50+ Iranian officials killed, regime decapitation",
    netAssessment: "Military dominance but strategic objectives (regime change) unmet. Economic cost escalating.",
    vulnerability: "Munitions shortage (THAAD, SM-3), China controls rare earth supply chain",
  },
  {
    flag: "🇮🇱",
    name: "Israel",
    role: "Strike Lead",
    spending: "$1.5-3B (10 days)",
    dailyCost: "$150-300M/day",
    losses: "12 civilians killed, 1,900 injured, 3,000 displaced, 2 IDF KIA Lebanon",
    gains: "80% Iran air def destroyed, 3,000+ targets, Khamenei killed",
    netAssessment: "Most militarily successful. But: Hezbollah 192 waves, Lebanon front open, elections exploited.",
    vulnerability: "Iron Dome under sustained barrage, Hezbollah escalation",
  },
  {
    flag: "🇮🇷",
    name: "Iran",
    role: "Defender / Asymmetric",
    spending: "$500M-1.5B (10 days)",
    dailyCost: "$50-150M/day",
    losses: "Supreme Leader + 50+ officials killed, 1,332+ civilians, 80% air def, 43 warships",
    gains: "Hormuz closed (20% world oil hostage), 27 waves, succession completed, Axis active, cost ratio 1:10-100",
    netAssessment: "Catastrophic losses BUT strategic leverage (Hormuz) intact. Costlier for US/world than expected.",
    vulnerability: "Cannot sustain military losses long-term, new leader untested",
  },
  {
    flag: "🇨🇳",
    name: "China",
    role: "Interested Observer / Iran Lifeline",
    spending: "$0 military",
    dailyCost: "Absorbing oil premium: ~$200-300M/day extra",
    losses: "50% oil imports exposed to Hormuz, 30% LNG from Qatar, 1 national killed",
    gains: "Preferential Hormuz passage, discounted Iranian oil, US munitions/attention diverted from Pacific",
    netAssessment: "Short-term pain (energy) but long-term strategic winner. Taiwan window widens.",
    vulnerability: "If Hormuz fully closes even to Chinese vessels",
  },
  {
    flag: "🇸🇦",
    name: "Saudi Arabia",
    role: "Reluctant Participant",
    spending: "Defense costs unknown",
    dailyCost: "Oil revenue paradox: higher prices BUT lower volume (Ras Tanura disrupted)",
    losses: "2 civilians killed, US embassy damaged, drone strikes on refineries",
    gains: "Yanbu pipeline critical bypass ($$$). Higher price on non-disrupted exports.",
    netAssessment: "Mixed. Revenue could go either way. Security risk severe.",
    vulnerability: "99% of Pakistan LNG depends on Saudi/UAE routes",
  },
  {
    flag: "🇯🇵",
    name: "Japan",
    role: "Vulnerable Bystander",
    spending: "$0 military",
    dailyCost: "~$150M/day extra oil costs",
    losses: "95% crude from ME, 1.6M bbl/day via Hormuz. Yen weakening. 2 nationals detained.",
    gains: "None",
    netAssessment: "Among biggest losers. Stagflation risk.",
    vulnerability: "87% of energy is imported fossil fuels",
  },
  {
    flag: "🇰🇷",
    name: "South Korea",
    role: "Vulnerable Bystander",
    spending: "$0 military",
    dailyCost: "~$100M/day extra + KOSPI -11% wealth destruction",
    losses: "68% crude via Hormuz (1.7M bbl/day). Circuit breaker triggered.",
    gains: "200-day SPR buffer",
    netAssessment: "Severe short-term shock. Industrial production at risk.",
    vulnerability: "Semiconductor fabs need stable energy",
  },
  {
    flag: "🇮🇳",
    name: "India",
    role: "Vulnerable + Exposed",
    spending: "$0 military",
    dailyCost: "~$200M/day extra (dual oil + LNG shock)",
    losses: "60% oil from ME, 53% LNG via Hormuz. 3 nationals killed. Nomura: 10% oil rise = -0.5% CA.",
    gains: "None",
    netAssessment: "Dual physical AND financial shock. Largest combined exposure.",
    vulnerability: "Subsidy regime + current account deficit",
  },
  {
    flag: "🇪🇺",
    name: "EU / Europe",
    role: "Indirect Victim + Divided",
    spending: "UK/France naval deployments, RAF Akrotiri under fire",
    dailyCost: "~$100-200M/day extra (LNG spot premium, gas prices)",
    losses: "Qatar LNG offline → spot scramble. Norway embassy bombed. UK Akrotiri hit. Divided on support.",
    gains: "UK/France defense industry contracts",
    netAssessment: "Not directly in war but economically hit. Iran warned: 'legitimate targets' if they join.",
    vulnerability: "Post-Russia-pivot LNG dependency",
  },
  {
    flag: "🇹🇷",
    name: "Turkey",
    role: "NATO Buffer / Concerned",
    spending: "F-16 deployment to Cyprus",
    dailyCost: "Minor military, energy costs rising",
    losses: "Iranian missile near Turkish airspace. Regional instability.",
    gains: "Strategic positioning, defense corridor role",
    netAssessment: "Positioning defensively while avoiding direct involvement.",
    vulnerability: "NATO Article 5 gray zone if Iran targets Cyprus/Turkey",
  },
];

// ─── Corporate Impact (Right Panel) ─────────────────────────────
export interface CorpImpact {
  name: string;
  impact: string;
  note: string;
}

export const corpImpacts: CorpImpact[] = [
  { name: "Saudi Aramco", impact: "+/-", note: "Higher price but lower volume. Ras Tanura disrupted. Yanbu bypass critical." },
  { name: "Exxon / Chevron / Shell", impact: "+", note: "US/EU oil majors benefit from $100+ oil on non-Gulf production." },
  { name: "Raytheon / Lockheed / Northrop", impact: "+++", note: "THAAD $15M/shot, Patriot $4M, Tomahawk — replenishment = tens of billions." },
  { name: "Maersk / CMA CGM / Hapag-Lloyd", impact: "---", note: "Suspended Hormuz transits. Fleet idle. VLCC rates $420K/day for operators." },
  { name: "Lloyd's / Munich Re", impact: "+/-", note: "War-risk premiums +400% = revenue. But claims exposure enormous." },
  { name: "Tesla / Renewables", impact: "+", note: "Tooze: 'How many more times do we need to learn that depending on fossil fuel is bad?'" },
  { name: "NVIDIA / AI", impact: "-", note: "Data center energy costs spike. NVDA -8%. AI CapEx at risk if recession." },
  { name: "Boeing / Airbus", impact: "-", note: "Gulf aviation hub disrupted. Flight rerouting. Jet fuel costs surge." },
  { name: "Halliburton", impact: "-", note: "Basra HQ struck by Iraqi militia drones. Regional ops disrupted." },
  { name: "QatarEnergy", impact: "---", note: "Ras Laffan shutdown (first in 30 years). 20% global LNG offline. Force majeure." },
];

// ─── Asymmetry Summary ──────────────────────────────────────────
export const asymmetrySummary = {
  militaryCostRatio: "Iran $1 → US/Israel $10-100",
  economicLeverage: "Hormuz closure ($5-15M/day enforce) inflicts $2-4B/day = 200-800x leverage",
  strategicParadox:
    "US has overwhelming military superiority but Iran's asymmetric tools (Hormuz, oil weapon, proxy network, cost ratio) make 'winning' extremely expensive for the world",
  examples: [
    "Shahed drone ($20-50K) vs Patriot interceptor ($4M) = 80-200x ratio",
    "Fattah missile ($1-3M) vs THAAD interceptor ($15M) = 5-15x ratio",
    "Hormuz closure ($5-15M/day) vs global cost ($600M+/day) = 40-120x",
    "IRGC speedboat ($100K) vs US destroyer ($2.2B) operating cost",
  ],
  whoActuallyWins:
    "Russia (oil revenue + US distracted), Defense industry (replenishment), Renewables (long-term pivot). Nobody 'wins' the war itself.",
} as const;

// ─── Aggregate export for use in narrative ──────────────────────
export const iranWarEconomics = {
  hormuzImpact,
  coalitionSpending,
  globalDailyLosses,
  stateAssessments,
  corpImpacts,
  asymmetrySummary,
} as const;
