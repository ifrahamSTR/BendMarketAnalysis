/**
 * Content/config layer for the Bend, OR market & location page (Sections
 * 2-5; no buy boxes yet). Same template as the Park City and Charlotte
 * sites, organised around bedroom size: every location comparison is made
 * within a size bucket ("vs. typical" = revenue / market median for that
 * size).
 *
 * Prose and config only. Every number shown is read from js/region_data.js
 * (generated from notebooks/bend_overview.ipynb); prose that quotes a number
 * computes it from that data. Qualitative statements were checked against
 * the notebook output for the 2026-10-01 snapshot.
 */
function photo(relPath, alt, caption) {
  return { file: "assets/" + relPath, alt: alt, caption: caption };
}
const MARKET_NAME = "Bend, OR";
const _ls = (s, l) => LOCATION.locSize[s][l];
const _area = (name) => LOCATION.areas.find((a) => a.name === name);
const _lad = (s) => LOCATION.ladder.find((r) => r.size === s);
const _x = (c) => fmtX(c.idx);
const WALK = "Walkable (<1 km)";

// ---------------------------------------------------------------------------
// Overview (top of page)
// ---------------------------------------------------------------------------
const HERO = {
  title: "In Bend, the smaller the home, the more walkability matters",
  sub: (() => {
    const w1 = _ls("Studio-1BR", WALK), f1 = _ls("Studio-1BR", "2–4 km"), w3 = _ls("3BR", WALK), f3 = _ls("3BR", "4 km+");
    return "Bedroom count sets the baseline. Distance to downtown and the Old Mill District decides whether a home beats it, and the effect is strongest for small homes. " +
      "A studio or 1BR within a kilometre of the core earns about " + fmtK(w1.median) + " against " + fmtK(f1.median) + " 2–4 km out; a 3BR, " + fmtK(w3.median) + " against " + fmtK(f3.median) +
      " at the edge of town. Large homes hold up farther out. This page covers the market, location by bedroom size, why guests choose each part of town, and who they are. Buy boxes come next.";
  })(),
};

const FOOTER_NOTE = () =>
  "Preliminary. No property has been underwritten and no buy box has been set. Revenue figures are gross Revenue Potential benchmarks from the market dataset (" +
  MARKET_STATS.n + " listings, " + MARKET_STATS.snapshot + " snapshot), not a full underwriting model.";

// ---------------------------------------------------------------------------
// Section 2 — Market context
// ---------------------------------------------------------------------------
// MARKET_OVERVIEW is defined below the analysis config (research section).

const DISTRIBUTION_NOTE = () => {
  const t = LOCATION.top10BySize;
  const total = Object.values(t).reduce((a, b) => a + b, 0);
  return "Most listings earn under " + fmtK(REVENUE_DISTRIBUTION.p75) + "; the Top 10% starts at " + fmtCurrency(REVENUE_DISTRIBUTION.p90) + ". Size explains most of that tail: " +
    t["4BR+"] + " of the " + total + " Top 10% listings are 4BR+, and only " + t["Studio-1BR"] + " are studios or 1BRs.";
};

const LADDER_NOTE = () => {
  const s = _lad("Studio-1BR"), two = _lad("2BR"), b = _lad("4BR+");
  return "A 2BR earns nearly twice a studio or 1BR (" + fmtK(two.median) + " vs " + fmtK(s.median) + "), and a 4BR+ about " + Math.round(b.median / s.median) + "× (" + fmtK(b.median) +
    "). Occupancy holds near " + _lad("3BR").occ + "% through 3BR and dips for 4BR+ (" + b.occ + "%), where the higher nightly rate does the work. Because size moves revenue this much, every location comparison below is made within the same size.";
};

const DRIVERS_NOTE =
  "<strong>Screening signals, not proven uplift.</strong> Each row compares listings with and without a feature on two measures: how often they reach the top quarter <em>for their size</em>, and what they earn against a typical home their size (1.00× = typical). Hot tubs are more common in the core areas and on the large edge-of-town homes, so part of their signal is location.";

const DRIVER_ROWS = [
  { key: WALK, label: "Walkable to downtown / Old Mill", group: "Location · within 1 km", note: "The strongest location signal in Bend." },
  { key: "Downtown, Westside or Old Mill area", label: "Downtown, Westside or Old Mill area", group: "Location · the three core areas", note: "Outside these three areas, fewer than 1 in 10 reach the top quarter for their size." },
  { key: "2–4 km", label: "Residential Bend, 2–4 km out", group: "Location", note: "The weakest band overall." },
  { key: "4 km+", label: "Edge of town, 4 km+", group: "Location", note: "Weak overall, but large homes on bigger lots hold up (see Section 3)." },
  { key: "hot_tub", label: "Hot tub", group: "Amenity", note: "Common, and a real signal for studios to 2BRs. Most large homes already have one." },
  { key: "sauna", label: "Sauna", group: "Amenity", note: "Few homes have one; half of them reach the top quarter." },
  { key: "waterfront", label: "On the Deschutes River", group: "Amenity · waterfront", note: "River frontage is rare and strong, mostly in the walkable core." },
  { key: "fire_pit", label: "Fire pit", group: "Amenity", note: "Common, but doesn't separate." },
  { key: "game_room", label: "Game room", group: "Amenity", note: "Only a small difference on its own." },
  { key: "Superhost", label: "Superhost", group: "Operations", note: "The clearest operations signal: the few non-Superhosts lag well behind." },
];

// ---------------------------------------------------------------------------
// Section 3 — Location by bedroom size
// ---------------------------------------------------------------------------
const MAP_CONFIG = {
  lede:
    "Bedroom count sets the baseline; location decides whether a home beats it. Every comparison here is within the same size: <strong>1.00× = what a typical Bend home that size earns</strong>. The location effect runs through <strong>distance to the walkable core</strong>: the nearer of downtown (Wall Street) and the Old Mill District, where guests walk to dinner, the river and concerts.",
  marketInterpretation:
    "<strong>Tick one bedroom size</strong> in the bottom-left panel to see where that size earns. Green = top quarter for its size, grey = bottom quarter; bigger dots = more bedrooms. Click an area outline for its numbers by size. The seven areas are clusters of listing coordinates, used as reference geography only.",
};

const LOC_READS = {
  "Studio-1BR": "Walkability is the product: within 1 km earns about 1.45× typical; 2–4 km out, about 0.7×. The gap is mostly nightly rate.",
  "2BR": "Revenue falls with every kilometre from the core.",
  "3BR": "Walkable pays most; the edge of town is weakest.",
  "4BR+": "Two ways to win: walkable, or a large home on a bigger lot out of town. The 2–4 km middle is weakest and fills fewer nights.",
  "All sizes": "Size-adjusted, so this row isn't just the bigger houses talking.",
};

const AREA_GRID_NOTE = () => {
  const core = ["Downtown & Old Bend", "Westside", "Old Mill & Southern Crossing"].map(_area), outer = ["Southwest Bend", "Deschutes River Woods", "Northeast Bend", "Larkspur & Pilot Butte"].map(_area);
  const rng = (arr) => fmtX(Math.min(...arr.map((a) => a.idx))) + "–" + fmtX(Math.max(...arr.map((a) => a.idx)));
  return "<strong>The core versus everywhere else.</strong> The three core areas earn " + rng(core) + " typical for their sizes and hold " + core.reduce((n, a) => n + a.n, 0) + " of the " + MARKET_STATS.n +
    " listings; the four outer areas earn " + rng(outer) + ". Outside the core, large homes are the exception: they come close to typical. A dash means fewer than 3 homes.";
};

const SIZE_GUIDE = {
  "Studio-1BR": {
    head: "Walkable, or not at all.",
    look: "Within 1 km of downtown or the Old Mill: Downtown & Old Bend and the near Westside.",
    avoid: "Residential Bend 2–4 km out, and Southwest Bend, where this size earns about 0.7× typical.",
    proof: () => "Walkable " + fmtK(_ls("Studio-1BR", WALK).median) + " (" + _x(_ls("Studio-1BR", WALK)) + ") · 2–4 km " + fmtK(_ls("Studio-1BR", "2–4 km").median) + " (" + _x(_ls("Studio-1BR", "2–4 km")) + ")",
  },
  "2BR": {
    head: "Close in. The Westside is the deepest pool.",
    look: "Walkable, or within 2 km. The Westside is the strongest area for this size.",
    avoid: "Edge-of-town 2BRs and Northeast Bend.",
    proof: () => "Walkable " + fmtK(_ls("2BR", WALK).median) + " · 1–2 km " + fmtK(_ls("2BR", "1–2 km").median) + " · 4 km+ " + fmtK(_ls("2BR", "4 km+").median) + " (" + _x(_ls("2BR", "4 km+")) + ")",
  },
  "3BR": {
    head: "Walkable pays most; the Westside is the safe middle.",
    look: "Within 1 km of the core, or the Westside.",
    avoid: "Southwest Bend and the edge of town.",
    proof: () => {
      const w = areaCellOf("Westside", "3BR");
      return "Walkable " + fmtK(_ls("3BR", WALK).median) + " (" + _x(_ls("3BR", WALK)) + ") · Westside " + fmtK(w.median) + " · 4 km+ " + fmtK(_ls("3BR", "4 km+").median) + " (" + _x(_ls("3BR", "4 km+")) + ")";
    },
  },
  "4BR+": {
    head: "Two routes: walkable, or a big lot out of town.",
    look: "A large home near downtown or the Old Mill, or a larger property at the edge of town (Deschutes River Woods, Northeast Bend).",
    avoid: "The 2–4 km residential middle, where large homes earn below typical and fill fewer nights.",
    proof: () => {
      const w = _ls("4BR+", WALK), m = _ls("4BR+", "2–4 km"), f = _ls("4BR+", "4 km+");
      return "Walkable " + fmtK(w.median) + " (" + w.n + " homes) · 4 km+ " + fmtK(f.median) + " · 2–4 km " + fmtK(m.median) + " at " + m.occ + "% occupancy";
    },
  },
};

// ---------------------------------------------------------------------------
// Section 5 — Demographics
// ---------------------------------------------------------------------------
const DEMOGRAPHICS_NOTE = () => {
  const b = DEMOGRAPHICS.byBedroom, s = b.find((r) => r.label === "Studio-1BR"), big = b.find((r) => r.label === "6BR+");
  const edge = DEMOGRAPHICS.byLoc.find((r) => r.label === "4 km+"), walk = DEMOGRAPHICS.byLoc.find((r) => r.label === WALK);
  return "These are review-derived signals, not verified demographics. Bend is an adult market: kids appear in only " + Math.round(DEMOGRAPHICS.marketWide.kids) + "% of reviews, and " +
    Math.round(DEMOGRAPHICS.marketWide.other) + "% are \"Other\" trips (couples, friends, solo). Group trips climb with size, from almost none at studio–1BR (" + s.group + "%) to " + Math.round(big.group) + "% at 6BR+. " +
    "Pets show up across the market (" + Math.round(DEMOGRAPHICS.marketWide.pet) + "%). The walkable core is the most couple-heavy (" + Math.round(walk.other) + "% \"Other\"), and the edge of town the most group-heavy (" + Math.round(edge.group) + "% group trips).";
};

// ---------------------------------------------------------------------------
// Section 2 — Market context. Researched 2026-10-02 from Visit Bend (FY2026
// and FY2027 strategic plans, FAQs), Dean Runyan / Travel Oregon (2025),
// the FAA, Mt. Bachelor, Bend Parks & Recreation, Oregon DEQ via KTVZ and
// the Bend Bulletin. Conflicting or secondary-only figures are left out.
// ---------------------------------------------------------------------------
const MARKET_OVERVIEW = {
  heroImage: photo(
    "overview/bend-from-pilot-butte.jpg",
    "Downtown Bend seen from Pilot Butte, with snow-capped Mt. Bachelor, Broken Top and the Three Sisters on the horizon",
    "Bend from Pilot Butte, with Mt. Bachelor and the Three Sisters behind. Photo: MARELBU, Wikimedia Commons (CC BY 3.0)."
  ),
  chips: [
    { label: "$408M Visitor Spending (2025)" },
    { label: "22 Miles to Mt. Bachelor" },
    { label: "50+ Riverside Concerts a Summer" },
    { label: "17 Miles from Redmond Airport" },
  ],
  attractions: [
    "<strong>Summer on the Deschutes</strong>: more than 250,000 people use the river each summer. The classic float runs from Riverbend Park through the Bend Whitewater Park to Drake Park downtown.",
    "<strong>Hayden Homes Amphitheater</strong> in the Old Mill District: 8,000 seats and 50+ shows a season, mid-May to September.",
    "<strong>Mt. Bachelor</strong>, about 25 minutes up Century Drive: 4,323 skiable acres and 12 chairlifts, plus lift-served biking in summer.",
    "<strong>Trails, lakes and beer</strong>: the Phil's Trail mountain-bike network minutes from the Westside, the 66-mile Cascade Lakes Scenic Byway, Smith Rock (26 miles), and 30+ breweries on the Bend Ale Trail.",
  ],
  visitorStats: {
    headline: "~2M overnight visits · $408M travel spending (Bend, 2025)",
    breakdown: [
      { value: "$28.5M", label: "Travel-Generated Tax Revenue (2025)" },
      { value: "~$15M", label: "City Lodging-Tax Forecast, FY27 (10.4% Rate)" },
      { value: "646K", label: "Redmond Airport Boardings, 2025 (+7.4%)" },
      { value: "~85%", label: "Of Visitors From Oregon, Washington and California" },
    ],
  },
  watchOuts: [
    "🔥 <strong>Wildfire smoke can hit the peak</strong> (late July to early September). Bend had 101 smoky days at \"unhealthy for sensitive groups\" or worse in 2013–2025, against 6 in 2000–2012, and smoke episodes returned in July and August 2026.",
    "❄️ <strong>2025–26 was a very poor snow year.</strong> Mt. Bachelor opened Dec 23 and closed April 19, its earliest close on record. That winter is inside this dataset's trailing year, so winter revenue likely understates a normal season.",
    "📉 <strong>Commercial lodging nights in Deschutes County fell about 14% from 2023 to 2025</strong>, and county STR spending slipped from $248M (2022) to $229M (2025). City lodging tax then rebounded 5.3% in FY26 once summer marketing resumed.",
    "📋 <strong>City STR rules constrain supply.</strong> Residential-zone STRs need a city license and must sit 500 ft from the next one (since 2022). Deschutes River Woods is outside city limits, so county rules apply there.",
  ],
  sources: [
    { label: "Visit Bend FY2027 plan", url: "https://bendoregon.gov/wp-content/uploads/2026/05/visit-bend-business-plan-fy2027-DRAFT-v4.pdf" },
    { label: "Visit Bend FY2026 plan", url: "https://bendoregon.gov/wp-content/uploads/2025/12/visit-bend-business-plan-fy2026-web-draft-v2.pdf" },
    { label: "Dean Runyan / Travel Oregon (2025)", url: "https://industry.traveloregon.com/wp-content/uploads/2026/05/Travel-Impacts-2025-Oregon_2026_04_09.pdf" },
    { label: "FAA (2025 boardings)", url: "https://www.faa.gov/airports/planning_capacity/passenger_allcargo_stats/passenger/arp-cy2025-commercial-service-enplanements-preliminary.pdf" },
    { label: "Mt. Bachelor (mountain stats)", url: "https://www.mtbachelor.com/the-mountain/resort-policies-safety/mountain-stats/" },
    { label: "Visit Bend (FAQs)", url: "https://visitbend.com/faqs/" },
    { label: "Visit Bend (getting here)", url: "https://visitbend.com/journal/traveling-to-and-around-bend-oregon/" },
    { label: "Bend Parks & Rec (river float)", url: "https://www.bendparksandrec.org/float/" },
    { label: "Visit Bend (concert season)", url: "https://visitbend.com/journal/heres-what-you-should-know-for-bends-summer-concert-season/" },
    { label: "KTVZ (wildfire smoke, DEQ)", url: "https://ktvz.com/news/fire/2026/03/13/wildfire-smoke-hit-bend-other-oregon-cities-less-during-2025-wildfire-season-bucking-long-term-trend-deq-says/" },
    { label: "KTVZ (Mt. Bachelor early close)", url: "https://ktvz.com/news/central-oregon/2026/04/09/low-snow-shuts-down-mt-bachelor-early-alters-iconic-event-impacts-local-businesses/" },
    { label: "City of Bend (STR rules, 2022)", url: "https://bendoregon.gov/news/bend-city-council-approves-changes-to-short-term-rental-rules/" },
  ],
};

// ---------------------------------------------------------------------------
// Section 4 — Why location changes the rate (js/destination.js engine).
// Five combined areas only; "Why it matters here" lines compute from LOCATION.
// ---------------------------------------------------------------------------
const DEST_LEDE = "Why guests pay more near downtown and the Old Mill, and why large homes still work farther out. Click an area.";
const DEST_RESEARCHED = "2026-10-02";
const DEST_KIND = {
  core: ["Walkable core", "#C0473F"],
  river: ["River & concerts", "#D07A1F"],
  west: ["Gateway to the mountain", "#2E7D6B"],
  east: ["Residential east side", "#3C6E9E"],
  south: ["Pines & river, south", "#7A5C2E"],
};
function DEST_AREAS() {
  const dt1 = areaCellOf("Downtown & Old Bend", "Studio-1BR"), w1 = _ls("Studio-1BR", WALK), f1 = _ls("Studio-1BR", "2–4 km");
  const om = _area("Old Mill & Southern Crossing"), om4 = areaCellOf("Old Mill & Southern Crossing", "4BR+");
  const river = LOCATION.drivers.find((d) => d.driver === "waterfront");
  const ws = _area("Westside"), ws2 = areaCellOf("Westside", "2BR"), ws3 = areaCellOf("Westside", "3BR");
  const ne = _area("Northeast Bend"), lk = _area("Larkspur & Pilot Butte"), ne4 = areaCellOf("Northeast Bend", "4BR+");
  const sw = _area("Southwest Bend"), drw4 = areaCellOf("Deschutes River Woods", "4BR+");
  return [
    {
      id: "downtown", name: "Downtown & Old Bend", kind: "core", tags: ["Walkable", "Strongest for studios & 1BRs"],
      zones: [{ lat: 44.0585, lng: -121.315, r: 700, tip: "Downtown", dir: "top" }],
      why: "Walkable dining and breweries around Wall and Bond Streets, and Drake Park, where the river float ends.",
      season: "Year-round: summer weekends and events, mostly couples and friends; a ski-trip base in winter.",
      matters: "Where small homes earn most: a studio or 1BR within 1 km of the core earns " + fmtK(w1.median) + " (" + fmtX(w1.idx) + ") against " + fmtK(f1.median) + " 2–4 km out; downtown's own studios and 1BRs run " + fmtX(dt1.idx) + ".",
    },
    {
      id: "oldmill", name: "Old Mill District & the river", kind: "river", tags: ["Walkable", "River frontage"],
      zones: [{ lat: 44.0465, lng: -121.318, r: 700, tip: "Old Mill & amphitheater", dir: "bottom" }],
      why: "The Hayden Homes Amphitheater (50+ summer shows), the float put-in at Riverbend Park, shopping and the river trail.",
      season: "Mid-May to September: concert weekends, summer groups and families.",
      matters: "Old Mill-area homes earn about typical for their size (" + fmtX(om.idx) + "), and large homes do well here (4BR+ " + fmtK(om4.median) + "). River-frontage homes are rare and strong: " + river.topWith + "% reach the top quarter for their size.",
    },
    {
      id: "westside", name: "Westside (toward Mt. Bachelor)", kind: "west", tags: ["Deepest pool of 2–3BRs"],
      zones: [{ lat: 44.0565, lng: -121.3455, r: 1500, tip: "Westside", dir: "top", off: [0, -20] }],
      why: "Closest to Century Drive for Mt. Bachelor and to the Phil's Trail network, with Shevlin Park, NorthWest Crossing and golf nearby.",
      season: "Two peaks: winter ski weeks, and summer biking, hiking and lakes.",
      matters: "The strongest area overall (" + fmtX(ws.idx) + " typical, " + ws.n + " listings) and the deepest pool of mid-size homes: 2BRs " + fmtX(ws2.idx) + ", 3BRs " + fmtX(ws3.idx) + ".",
    },
    {
      id: "east", name: "East side (Pilot Butte, Orchard, Larkspur)", kind: "east", tags: ["Context"],
      zones: [{ lat: 44.0635, lng: -121.2785, r: 1700, tip: "East side", dir: "right" }],
      why: "Mostly residential neighbourhoods with quick US-97 access to Redmond Airport and Smith Rock, near St. Charles hospital.",
      season: "Year-round, and less tied to downtown events and the river.",
      matters: "Earns below typical for its size (Northeast " + fmtX(ne.idx) + ", Larkspur " + fmtX(lk.idx) + "), with small homes lagging most. Large homes are the exception (Northeast 4BR+ " + fmtK(ne4.median) + ", " + ne4.n + " homes).",
    },
    {
      id: "south", name: "Southwest & Deschutes River Woods", kind: "south", tags: ["Large homes only"],
      zones: [{ lat: 44.024, lng: -121.341, r: 1100, tip: "Southwest Bend", dir: "left" }, { lat: 43.99, lng: -121.364, r: 1500, tip: "Deschutes River Woods", dir: "bottom" }],
      why: "Quiet pines and river access on the way to Sunriver, with a quick run to Century Drive.",
      season: "Summer river and nature trips plus winter ski. Deschutes River Woods draws the highest share of group trips in the market.",
      matters: "Southwest Bend earns the least for its size of any area (" + fmtX(sw.idx) + "). Large homes on bigger lots in Deschutes River Woods come close to typical (4BR+ " + fmtK(drw4.median) + ", " + fmtX(drw4.idx) + "); it sits outside city limits, under county STR rules.",
    },
  ];
}
// Context markers (lat, lng, label, color).
const DEST_POINTS = [
  [44.0593, -121.3138, "Downtown (Wall St)"], [44.0585, -121.3222, "Drake Park (float take-out)"],
  [44.0465, -121.318, "Hayden Homes Amphitheater", "#D07A1F"], [44.0421, -121.3221, "Riverbend Park (float put-in)", "#D07A1F"],
  [44.0501, -121.3213, "Bend Whitewater Park", "#D07A1F"], [44.048, -121.33, "Century Drive to Mt. Bachelor (22 mi)", "#2E7D6B"],
  [44.0434, -121.3858, "Phil's Trailhead", "#2E7D6B"], [44.0589, -121.3511, "NorthWest Crossing", "#2E7D6B"],
  [44.0886, -121.3678, "Shevlin Park", "#2E7D6B"], [44.0606, -121.2833, "Pilot Butte", "#3C6E9E"], [44.0675, -121.2693, "St. Charles Bend", "#3C6E9E"],
];
// Month bands from Bend lodging-tax collections by month (Visit Bend FY2027
// plan heat map: Jun-Aug $1.8M+, May and Sep $1.4-1.6M, Nov-Feb $0.6-0.8M).
const DEST_SEASON = {
  months: ["low", "low", "mid", "mid", "high", "peak", "peak", "peak", "high", "mid", "low", "low"],
  marks: ["", "", "Spring break", "", "Concerts begin", "", "July 4th", "", "", "", "", "Ski season"],
  legend: [["peak", "Summer peak: river, concerts, trails"], ["high", "May and September"], ["mid", "Shoulder"], ["low", "Winter: skiing, but the lowest lodging months"]],
  caption: "<strong>Two things to price in:</strong> wildfire smoke can hit the peak (late July to early September), and winter swings with snow. The 2025–26 season opened Dec 23 and closed April 19, the earliest close on record, and it is inside this dataset's trailing year. Bands from Bend lodging-tax collections by month.",
};
const DEST_BRIDGE = [
  ["Near downtown and the Old Mill, guests pay to walk: to dinner, the river and concerts.", "Studios to 3BRs need the walkable core, and the smaller the home, the more it matters."],
  ["Farther out, the house has to do more of the work.", "Large homes on bigger lots hold up at the edge of town; the residential middle is weakest."],
];
const DEST_SOURCES = [
  { label: "Visit Bend FY2027 plan (lodging tax by month)", url: "https://bendoregon.gov/wp-content/uploads/2026/05/visit-bend-business-plan-fy2027-DRAFT-v4.pdf" },
  { label: "Bend Parks & Rec (river float)", url: "https://www.bendparksandrec.org/float/" },
  { label: "Visit Bend (mountain biking)", url: "https://visitbend.com/journal/mountain-biking-in-bend-oregon/" },
  { label: "Visit Bend (Cascade Lakes Byway)", url: "https://visitbend.com/journal/cascade-lakes-scenic-byway/" },
  { label: "Visit Bend (FAQs)", url: "https://visitbend.com/faqs/" },
  { label: "KTVZ (Fourth of July lodging)", url: "https://ktvz.com/news/2026/07/01/fourth-of-july-brings-tourism-boost-booked-hotels/" },
  { label: "Bend Bulletin (thin-snow winter)", url: "https://bendbulletin.com/2026/02/05/no-powder-no-panic-bend-businesses-pivot-through-thin-winter/" },
  { label: "OPB (STR licensing, 2025)", url: "https://www.opb.org/article/2025/06/12/bend-informal-deal-property-manager-short-term-rentals/" },
];
