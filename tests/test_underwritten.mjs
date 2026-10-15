// Tests for the Bend, OR underwriting page (no sheets yet: the blank template). Run: node tests/test_underwritten.mjs
// (scripts/build_underwritten.py runs it automatically.)
//  1. Formula check: every underwritten sheet recomputed from its own inputs vs its own outputs.
//  2. CSV export: each sheet exported with its own inputs keeps every non-comp row byte for
//     byte (comp rows come back in revenue order, in US number format); an edited export keeps
//     the amortization block byte for byte, writes inputs where the sheet expects them, and puts
//     each amenity flag under the sheet's own header (110-112 use Firepit / Outdoor Dining / Pack and Play).
//  3. Location rules in the browser (uw-geo.js) match the Python build on every point of
//     tests/fixtures/place_check.json, and every listing's own band / area.
//  4. Comp classes, the picker (Cleaned_Data entire homes only) and copy rows.
//  5. The two matching modes: location keeps to the target's area, bedrooms +/-1, nearest
//     first; amenities rank the whole market (nothing excluded); comp-set tags, no
//     duplicates, the cap of 15.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const M = require(join(ROOT, "js/underwritten/uw-math.js"));
const C = require(join(ROOT, "js/underwritten/uw-csv.js"));
const G = require(join(ROOT, "js/underwritten/uw-geo.js"));
const R = require(join(ROOT, "js/underwritten/uw-rules.js"));
const UW = JSON.parse(readFileSync(join(ROOT, "data/underwritten.json"), "utf8"));
const COMPS = JSON.parse(readFileSync(join(ROOT, "data/comps.json"), "utf8"));
const VILLAGE = JSON.parse(readFileSync(join(ROOT, "data/village.json"), "utf8"));
const FIX = JSON.parse(readFileSync(join(ROOT, "tests/fixtures/place_check.json"), "utf8"));
const src = (f) => readFileSync(join(ROOT, "underwriting/source_csv", f), "utf8");
const tpl = (f) => readFileSync(join(ROOT, "underwriting/template", f), "utf8");

let failures = 0, checks = 0;
const fail = (msg) => { failures++; console.log("  FAIL " + msg); };
const ok = (cond, msg) => { checks++; if (!cond) fail(msg); return cond; };

// ---------------------------------------------------------------------------
console.log("1. FORMULA CHECK: sheets recomputed from their own inputs\n");
const versions = UW.properties.flatMap((p) => p.versions.map((v) => ({ name: "file " + v.label + " (" + p.street + ")", v, p })));
for (const { name, v } of versions) {
  const res = M.verify(v);
  const a = v.sheet.amort, excess = (a.paidLast || 0) - a.loan;
  // The amortization block's Total Paydown column runs a few dollars ahead from its month-2 row;
  // the sheet's Principal Pay Down reads it. Reported on the page, not a formula failure.
  const bad = res.rows.filter((r) => r.result === "FAIL" &&
    !(r.key === "principal" && Math.abs(v.sheet.cases.mid.principal - a.paid12) <= 1 && Math.abs(r.diff) <= Math.abs(excess) + 1.5));
  bad.forEach((r) => fail(`${name} ${r.group} ${r.label}: sheet ${r.sheet} vs recomputed ${r.calc}`));
  checks++;
  const quirk = res.rows.filter((r) => r.result === "FAIL").length - bad.length;
  console.log(`  ${bad.length ? "FAIL" : "ok  "} ${name}: ${res.rows.length} outputs, ${res.rows.filter((r) => r.result === "exact").length} exact, ` +
    `${res.rows.filter((r) => r.result === "rounding").length} within display rounding` + (quirk ? `, ${quirk} Principal Pay Down cells reading the Total Paydown column (reported)` : ""));
}

// ---------------------------------------------------------------------------
console.log("\n2. CSV EXPORT\n");
const listings = COMPS.listings;
for (const { v } of versions) {
  const TEXT = src(v.file), S = C.parse(TEXT), L = C.locate(S.rows);
  const compRow = (i) => i >= L.comps.first && i <= L.comps.last;
  const same = C.exportSheet(TEXT, Object.assign({ notes: v.notes, url: v.url }, v.inputs, { comps: v.comps }));
  const O = C.parse(same);
  const other = S.spans.filter((x, i) => !compRow(i) && x !== O.spans[i]).length;
  ok(other === 0, `${v.file}: ${other} non-comp rows changed in an unchanged export`);
  ok(L.comps.flags.join() === v.sheetFlags.join(), `${v.file}: the browser and the build read different amenity columns`);
  // Comp rows: same values (US format), revenue high to low.
  const back = [];
  for (let i = L.comps.first; i <= L.comps.last; i++) if (O.rows[i][L.comps.col]) back.push(O.rows[i].slice(L.comps.col, L.comps.col + 15));
  ok(back.length === v.comps.length, `${v.file}: ${back.length} comp rows written back, ${v.comps.length} in the sheet`);
  ok(back.every((r, i) => !i || +r[1].replace(/[$,]/g, "") <= +back[i - 1][1].replace(/[$,]/g, "")), `${v.file}: comp rows not revenue high to low`);
  const byUrl = new Map(v.comps.map((c) => [c.url, c]));
  ok(back.every((r) => { const c = byUrl.get(r[0]); return c && Math.abs(+r[1].replace(/[$,]/g, "") - c.revenue) < 0.01 && Math.abs(parseFloat(r[5]) / 100 - c.occupancy) < 1e-6 &&
    L.comps.flags.every((f, k) => +r[6 + k] === (c.flags[f] ? 1 : 0)); }), `${v.file}: a comp value or flag changed on export`);
  // Edited: new price, revenue, and four listings as comps.
  const m = Object.assign({ notes: v.notes, url: v.url }, JSON.parse(JSON.stringify(v.inputs)), { price: 512345, revenue: { low: 101000, mid: 121000, high: 141000 },
    comps: [listings[5], listings[0], listings[12], listings[40]].map((l) => R.rowFromListing(l, "note\twith tab")) });
  const out = C.exportSheet(TEXT, m), E = C.parse(out);
  ok(C.amortBlock(out) === C.amortBlock(TEXT), `${v.file}: amortization block differs after an edit`);
  ok(E.rows[L.price[0]][L.price[1]] === " $ 512,345 " && E.rows[L.revenue[1][0]][L.revenue[1][1]] === " $ 121,000 ", `${v.file}: price / revenue not written where the sheet expects`);
  const l0 = listings[5], r0 = E.rows.slice(L.comps.first, L.comps.last + 1).find((r) => r[L.comps.col] === l0.url);
  ok(r0 && L.comps.flags.every((f, k) => +r0[L.comps.col + 6 + k] === (l0.flags.includes(f) ? 1 : 0)), `${v.file}: a listing's flags not under the sheet's own amenity columns`);
  console.log(`  ok   ${v.file}: non-comp rows unchanged; comps back in revenue order; amortization rows ${L.amort.first + 1}-${L.amort.last + 1} identical after an edit; columns ${v.compHeader.slice(6, 14).join(", ")}`);
}

// The blank template a new listing starts from (until this market has its own sheets).
for (const T of UW.templates || []) {
  const TEXT = tpl(T.file), S = C.parse(TEXT), L = C.locate(S.rows);
  const same = C.exportSheet(TEXT, Object.assign({ notes: S.rows[L.notes[0]][L.notes[1]], url: S.rows[L.url[0]][L.url[1]] }, T.sheetInputs));
  ok(same === TEXT, `template ${T.file}: exported with its own inputs is not byte-identical`);
  const I = T.inputs;
  ok(I.price == null && I.setup.length === 5 && I.setup.every((x) => R.STANDARD_SETUP.some((s) => s.label === x.label && s.amount === x.amount)) && I.opex.every((o) => o.cleaning || o.amount != null) && I.cleaningCost === 275 && ["low", "mid", "high"].every((c) => I.revenue[c] == null),
    "template: revenue not blank, an OPEX line unpriced, or setup isn't exactly the five standard lines");
  ok(Object.keys(T.kept).every((k) => I[k] === T.kept[k] && T.kept[k] === T.sheetInputs[k]), "template: financing / tax assumptions differ from the sheet's");
  const m = Object.assign(JSON.parse(JSON.stringify(I)), { notes: "Property Details:\n-- Bed / Bath (projected): 3 / 2", url: "https://www.zillow.com/homedetails/1-Test-Rd-Bend-OR-97703/1_zpid/", price: 650000,
    comps: [listings[5], listings[0], listings[12]].map((l) => R.rowFromListing(l, "n")) });
  const out = C.exportSheet(TEXT, m), O = C.parse(out);
  ok(C.amortBlock(out) === C.amortBlock(TEXT), "template: amortization block differs after a new-listing export");
  let left = 0;
  for (let i = L.setup.first; i <= L.setup.last; i++) if ((O.rows[i][L.setup.col] || O.rows[i][L.setup.col + 1]) && !R.STANDARD_SETUP.some((s) => R.setupKey(s.label) === R.setupKey(O.rows[i][L.setup.col]))) left++;
  for (let i = L.opex.first; i <= L.opex.last; i++) if (O.rows[i][L.opex.col].trim() && !O.rows[i][L.opex.col + 1].trim()) left++;
  ok(left === 0 && O.rows[L.cleaningCost[0]][L.cleaningCost[1]] === " $ 275 ", `template: ${left} other-market setup lines left in or OPEX lines left empty`);
  ok(L.comps.flags.join() === UW.sheetFlags.join(), "template: copy rows and the template's comp columns differ");
  console.log(`  ok   template ${T.file}: byte-identical with its own inputs; new listing keeps the amortization block, standard setup and OPEX, cleaning; columns ${L.comps.header.slice(6, 14).join(", ")}`);
}

// ---------------------------------------------------------------------------
console.log("\n3. LOCATION RULES: browser vs build\n");
G.init(VILLAGE, listings);
{
  let bad = 0;
  for (const p of FIX.points) {
    const c = G.classify(p.lat, p.lng);
    if (c.loc !== p.loc || c.zone !== p.zone || c.town !== p.town || c.area !== p.area || Math.abs(c.centerKm - p.centerKm) > 0.0015) {
      bad++;
      if (bad <= 5) fail(`point ${p.lat},${p.lng}: browser ${c.loc}/${c.zone}/${c.area}/${c.centerKm} vs build ${p.loc}/${p.zone}/${p.area}/${p.centerKm}`);
    }
  }
  checks++;
  if (bad) fail(`${bad} of ${FIX.points.length} points disagree`);
  const counts = {};
  FIX.points.forEach((p) => (counts[p.loc] = (counts[p.loc] || 0) + 1));
  console.log(`  ${bad ? "FAIL" : "ok  "} ${FIX.points.length} points agree on setting, zone, area and distance (${Object.entries(counts).map(([k, v]) => k + " " + v).join(", ")})`);
  let own = 0;
  listings.forEach((l) => { const c = G.classify(l.lat, l.lng); if (c.loc === l.loc && c.town === l.town && c.zone === l.zone && c.area === l.area) own++; });
  ok(own === listings.length, `listings: ${own} of ${listings.length} get their own band / area`);
  console.log(`  ok   every listing's own point gives its setting, zone and area (${own} of ${listings.length})`);
  const a = G.zillowAddress("https://www.zillow.com/homedetails/61234-Fall-Creek-Rd-Bend-OR-97702/232874173_zpid/");
  ok(a && a.street === "61234 Fall Creek Rd" && a.city === "Bend" && a.state === "OR" && a.zip === "97702" && a.zpid === "232874173", "Zillow slug not read: " + JSON.stringify(a));
  const pl = UW.properties.map((p) => [p, G.classify(p.geo.lat, p.geo.lng)]);
  ok(pl.every(([p, c]) => c.area === p.place.area && c.loc === p.place.loc), "a target's area / band differs between the browser and the build");
}

// ---------------------------------------------------------------------------
console.log("\n4. COMP CLASSES, PICKER, COPY ROWS\n");
const byId = new Map(listings.map((l) => { l.flagSet = new Set(l.flags); return [l.id, l]; }));
const ctx = { byId, index: UW.audit.index || {}, badUrls: UW.audit.badUrls || {} };
{
  const l = listings[0];
  ok(R.classify({ url: "https://www.zillow.com/homedetails/1-Main-St-Bend-OR-97703/1_zpid/" }, ctx).cls === "zillow", "a Zillow URL is not an error");
  ok(R.classify({ url: "Cozy cabin - Cabins for Rent in Bend" }, ctx).cls === "badurl", "a title is not flagged as a bad URL");
  ok(["usable", "possibly"].includes(R.classify(R.rowFromListing(l, ""), ctx).cls), "a listing's own row is not usable");
  ok(R.classify(R.rowFromListing(l, ""), ctx).changes.length === 0, "a listing's own row shows value changes");
  ok(!R.canPick(COMPS.otherRooms[0], byId) && COMPS.otherRooms.length === 28, "a private / hotel / shared room can be picked as a comp");
  const tsv = C.compsTSV([R.rowFromListing(listings[3], "a"), R.rowFromListing(listings[0], "b")]).split("\n");
  ok(tsv.length === 2 && tsv.every((r) => r.split("\t").length === 15) && +tsv[0].split("\t")[1] >= +tsv[1].split("\t")[1], "copied rows are not 15 columns in revenue order");
  ok(COMPS.n === 381 && listings.every((x) => x.quality === "Good" || x.quality === "Possibly Good"), "comps.json is not the 381 Good / Possibly Good entire homes");
  console.log("  ok   Zillow URL / title / workbook row classes; private room not pickable; copy rows 15 columns, revenue high to low");
}

// ---------------------------------------------------------------------------
console.log("\n5. MATCHING\n");
{
  const prof = (beds, flags) => ({ beds, baths: 1, sleeps: beds * 2 + 2, flags: Object.fromEntries(R.PROFILE_FLAGS.map((f) => [f, (flags || []).includes(f) ? 1 : 0])) });
  // A target at Henrys Lake and one on the Reservoir side, from the listings' own area centres.
  const at = (id) => { const ls = listings.filter((l) => l.area === id); const lat = ls.reduce((x, l) => x + l.lat, 0) / ls.length, lng = ls.reduce((x, l) => x + l.lng, 0) / ls.length; return Object.assign({ lat, lng }, G.classify(lat, lng)); };
  const vt = at("westside"), ct = at("downtown");
  ok(vt.zone === "westside" && ct.zone === "downtown", "test targets are not in the expected areas: " + vt.zone + ", " + ct.zone);
  const above = listings.filter((l) => l.revenue >= COMPS.minRevDefault);
  const vm = R.matchLocation(above, { lat: vt.lat, lng: vt.lng, zone: vt.zone, beds: 3 }, { zone: true });
  const cm = R.matchLocation(above, { lat: ct.lat, lng: ct.lng, zone: ct.zone, beds: 3 }, { zone: true });
  ok(vm.length > 0 && vm.every((x) => x.l.zone === "westside" && Math.abs(x.l.bedrooms - 3) <= 1), "Westside target: a match from another area or beyond bedrooms +/-1");
  ok(cm.length > 0 && cm.every((x) => x.l.zone === "downtown" && Math.abs(x.l.bedrooms - 3) <= 1), "Downtown target: a match from another area or beyond bedrooms +/-1");
  ok([vm, cm].every((m) => m.every((x, i) => !i || x.d >= m[i - 1].d)), "location matches are not nearest first");
  const off = R.matchLocation(above, { lat: vt.lat, lng: vt.lng, zone: vt.zone, beds: 3 }, { zone: false });
  ok(off.length > vm.length && off.some((x) => x.l.zone !== "westside"), "turning 'same area' off does not widen the match");
  console.log(`  ok   location: Westside 3BR target ${vm.length} matches (all Westside), Downtown & Old Bend 3BR target ${cm.length} (all Downtown & Old Bend), $90k+, nearest first; area off widens to ${off.length}`);
  const am = R.matchAmenity(listings, prof(2, ["hot_tub"]), { bedsExact: true, sleepsWindow: 2, pool: null, prefs: Object.fromEntries(R.AMENITY_ORDER.map((f) => [f, "prefer"])) });
  ok(am.length === listings.length, "amenity ranking dropped homes (it must rank the whole market)");
  const firstOff = am.findIndex((x) => x.bedsTier > 0);
  ok(firstOff < 0 || am.slice(firstOff).every((x) => x.bedsTier > 0), "amenity ranking: an off-bedroom home ranks above an exact one");
  ok(am[0].l.bedrooms === 2 && am[0].l.flagSet.has("hot_tub") && !am[0].l.flagSet.has("pool"), "amenity ranking: the top home is not a 2BR with a hot tub and no pool");
  ok(am.findIndex((x) => x.l.bedrooms !== 2) === listings.filter((l) => l.bedrooms === 2).length, "amenity ranking: not every 2BR ranks first");
  console.log(`  ok   amenities: all ${am.length} homes ranked, bedrooms first; top: ${am[0].l.title} (${am[0].l.bedrooms}BR, hot tub)`);
  // Comp set: tags, no duplicates, cap of 15.
  const t = { lat: ct.lat, lng: ct.lng, street: "123 Example Rd" };
  const note = (mode) => (l) => R.autoNote(l, "Northeast Bend", t, mode, null);
  let rows = [];
  ({ rows } = R.addToSet(rows, cm[0].l, { byId, mode: "location", note: note("location") }));
  let r2 = R.addToSet(rows, cm[0].l, { byId, mode: "location", note: note("location") });
  ok(r2.result === "duplicate" && r2.rows.length === 1, "adding the same comp twice duplicated it");
  r2 = R.addToSet(rows, cm[0].l, { byId, mode: "amenity", note: note("amenity") });
  ok(r2.result === "both" && /^\[Location \+ Amenity match\] /.test(r2.rows[0].notes), "a comp found by both modes is not retagged");
  ok(/^\[Location match\] \d+\.\d mi from 123 Example Rd · \d+BR\/[\d.]+BA · sleeps \d+/.test(rows[0].notes) && / · (Walkable \(<1 km\)|1–2 km|2–4 km|4 km\+) · Northeast Bend$/.test(rows[0].notes),
    "auto note not in the expected form: " + rows[0].notes);
  let full = [];
  listings.slice(0, 20).forEach((l) => { full = R.addToSet(full, l, { byId, mode: "location", note: note("location") }).rows; });
  ok(full.length === 15, "the comp set is not capped at 15");
  console.log("  ok   comp set: no duplicates, retag to [Location + Amenity match], note: " + rows[0].notes);
}

// ---------------------------------------------------------------------------
console.log("\nSTANDARD SETUP LINES: every new sheet carries the five, at Galveston file 101's amounts\n");
{
  const bad = (m) => fail("standard setup: " + m);
  const WANT = [["Furniture / Decor / Essentials", 50000, 5], ["Misc", 25000, 16], ["CoHost Essentials", 3500, 17], ["Design/Project Management", 25000, 18], ["Install/Staging/Warehousing", 18250, 19]];
  const key = (s) => R.setupKey(s);
  const fresh = R.withStandardSetup([]);
  if (!(fresh.length === 5 && WANT.every(([l, a]) => fresh.some((x) => key(x.label) === key(l) && x.amount === a)))) bad("an empty setup doesn't get the five lines at 101's amounts");
  const kept = R.withStandardSetup([{ label: "Furniture / Decor / Essentials", amount: 15000 }, { label: "Hot Tub", amount: 16000 }, { label: "Misc", amount: 50000 }, { label: "Misc", amount: null }]);
  if (!(kept.find((x) => key(x.label) === key("Furniture / Decor / Essentials")).amount === 15000 && kept.filter((x) => key(x.label) === "misc").map((x) => x.amount).join() === "50000," && kept.length === 7))
    bad("a priced line was changed, or a second Misc was filled");
  const filled = R.withStandardSetup([{ label: "Misc", amount: null }]);
  if (filled.find((x) => key(x.label) === "misc").amount !== 25000) bad("a blank Misc line wasn't given 101's amount");
  // Exported from this site's new-listing template, the five land in rows 5 and 16-19 with their amounts.
  const tdir = (UW.templates || []).some((t) => t.file === UW.templateFile) ? "underwriting/template" : "underwriting/source_csv";
  const TT = readFileSync(join(ROOT, tdir, UW.templateFile), "utf8"), P0 = C.parse(TT), L0 = C.locate(P0.rows);
  const base = (UW.templates || []).find((t) => t.file === UW.templateFile);
  const inputs = base ? JSON.parse(JSON.stringify(base.inputs)) : JSON.parse(JSON.stringify(UW.properties.flatMap((p) => p.versions).find((v) => v.file === UW.templateFile).inputs));
  inputs.setup = R.withStandardSetup(inputs.setup);
  const out = C.parse(C.exportSheet(TT, Object.assign(inputs, { notes: "n", url: "https://www.zillow.com/homedetails/1-Test-Rd/1_zpid/", price: 400000, comps: [] })));
  const cell = (r) => [out.rows[r - 1][L0.setup.col].trim(), out.rows[r - 1][L0.setup.col + 1].trim()];
  const placed = WANT.every(([l, a, r]) => key(cell(r)[0]) === key(l) && (base ? cell(r)[1].replace(/[$\s,]/g, "") === String(a) : cell(r)[1] !== ""));
  if (!placed) bad("exported template rows 5/16-19: " + WANT.map(([, , r]) => cell(r).join(" ")).join(" | "));
  console.log("  " + (placed ? "ok  " : "FAIL") + " " + UW.templateFile + ": rows 5, 16, 17, 18, 19 hold " + WANT.map(([, , r]) => cell(r).join(" ")).join(" · "));
}

// ---------------------------------------------------------------------------
console.log("\nSTANDARD OPEX LINES: every new sheet carries all fifteen, priced (Galveston file 101, rounded)\n");
{
  const bad = (m) => fail("standard OPEX: " + m);
  const fresh = R.withStandardOpex({ opex: [], cleaningCost: null, cleaningTurns: null });
  if (!(fresh.opex.length === 15 && fresh.opex.every((o) => o.cleaning || typeof o.amount === "number") && fresh.cleaningCost === 275 && fresh.cleaningTurns === 6)) bad("an empty OPEX list isn't filled");
  if (M.opexMonthly(fresh) !== 4850) bad("the defaults total $" + M.opexMonthly(fresh) + " a month, not $4,850");
  const kept = R.withStandardOpex({ opex: [{ label: "Property Taxes (Monthly)", amount: 385 }, { label: "PMI", amount: null }], cleaningCost: 150, cleaningTurns: 8 });
  if (!(kept.opex.find((o) => o.label === "Property Taxes (Monthly)").amount === 385 && kept.opex.find((o) => o.label === "PMI").amount === 0 && kept.cleaningCost === 150 && kept.cleaningTurns === 8))
    bad("a priced line or the cleaning cost changed, or a blank line wasn't filled");
  // Exported from this site's new-listing template (blank lines and all), every OPEX row has a value; zeros show as "$ -".
  const tdir = (UW.templates || []).some((t) => t.file === UW.templateFile) ? "underwriting/template" : "underwriting/source_csv";
  const TT = readFileSync(join(ROOT, tdir, UW.templateFile), "utf8"), L0 = C.locate(C.parse(TT).rows);
  const base = (UW.templates || []).find((t) => t.file === UW.templateFile) || UW.properties.flatMap((p) => p.versions).find((v) => v.file === UW.templateFile);
  const inputs = R.withStandardOpex(Object.assign(JSON.parse(JSON.stringify(base.inputs)), { setup: R.withStandardSetup(base.inputs.setup) }));
  const out = C.parse(C.exportSheet(TT, Object.assign(inputs, { notes: "n", url: "https://www.zillow.com/homedetails/1-Test-Rd/1_zpid/", price: 400000, comps: [] })));
  const empty = [];
  for (let i = L0.opex.first; i <= L0.opex.last; i++) if (out.rows[i][L0.opex.col].trim() && !out.rows[i][L0.opex.col + 1].trim()) empty.push(out.rows[i][L0.opex.col].trim());
  if (empty.length) bad("exported OPEX lines left empty: " + empty.join(", "));
  const shown = [];
  for (let i = L0.opex.first; i <= L0.opex.last; i++) shown.push(out.rows[i][L0.opex.col].trim() + " " + out.rows[i][L0.opex.col + 1].trim());
  console.log("  " + (empty.length ? "FAIL" : "ok  ") + " " + UW.templateFile + ": " + shown.join(" · "));
}

console.log(`\n${failures ? failures + " FAILURE" + (failures === 1 ? "" : "S") : "All " + checks + " checks passed"}.`);
process.exit(failures ? 1 : 0);
