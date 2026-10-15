/**
 * Location rules for underwritten.html (Bend, OR), the same as the
 * Python pipeline (../notebooks/market_common.py and scripts/build_underwritten.py):
 *  - distance: straight-line (haversine) km to the nearer of downtown and the Old Mill (data/village.json);
 *  - band: walkable (under 1 km) / 1–2 km / 2–4 km / 4 km+;
 *  - area: the nearest Airbnb listing's (checked leave-one-out by the build); the "zone"
 *    Match by location keeps to is the area;
 *  - Zillow address from the URL slug.
 * Runs in the browser (window.UWGeo) and in Node; tests/test_underwritten.mjs checks it
 * against the build on every point of tests/fixtures/place_check.json.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.UWGeo = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const COS = Math.cos((44.05 * Math.PI) / 180);
  const xy = (lat, lng) => [lat * 111, lng * 111 * COS];  // market_common.coords_km
  const CITIES = ["Bend", "Sunriver", "Redmond", "Tumalo", "La Pine", "Sisters", "Terrebonne", "Powell Butte"];

  let centers = [], breaks = [1, 2, 4], order = [], pts = null;
  function init(anchor, listings) {
    centers = anchor.centers;
    breaks = anchor.breaksKm;
    order = anchor.locOrder;
    pts = listings.map((l) => ({ xy: xy(l.lat, l.lng), area: l.area }));
  }

  function haversineKm(lat1, lng1, lat2, lng2) {
    const rad = Math.PI / 180;
    const a = Math.sin(((lat2 - lat1) * rad) / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(a));
  }
  const centerKm = (lat, lng) => Math.min(...centers.map((c) => haversineKm(lat, lng, c.lat, c.lng)));

  function areaOf(lat, lng) {
    const [x, y] = xy(lat, lng);
    let best = null, bestD = Infinity;
    pts.forEach((p) => {
      const d = (p.xy[0] - x) ** 2 + (p.xy[1] - y) ** 2;
      if (d < bestD) { bestD = d; best = p.area; }
    });
    return best;
  }

  function classify(lat, lng) {
    const km = centerKm(lat, lng), area = areaOf(lat, lng);
    return { centerKm: Math.round(km * 1000) / 1000, area, town: false, zone: area, loc: order[breaks.filter((b) => km > b).length] };
  }

  // Great-circle miles, for the nearest-comp list.
  const miles = (lat1, lng1, lat2, lng2) => haversineKm(lat1, lng1, lat2, lng2) / 1.609344;

  function zillowAddress(url) {
    let path = "";
    try { path = new URL(url).pathname; } catch (e) { return null; }
    const m = path.match(/\/homedetails\/([^/]+)\/(\d+)_zpid/);
    if (!m) return null;
    let tok = m[1].split("-");
    let state = "OR", zip = null;
    if (tok.length >= 4 && /^[A-Z]{2}$/.test(tok[tok.length - 2]) && /^\d{5}$/.test(tok[tok.length - 1])) {
      state = tok[tok.length - 2]; zip = tok[tok.length - 1]; tok = tok.slice(0, -2);
    }
    let city = null;
    for (const c of CITIES) {
      const ct = c.split(" ");
      if (tok.slice(-ct.length).map((t) => t.toLowerCase()).join(" ") === c.toLowerCase()) { city = c; tok = tok.slice(0, -ct.length); break; }
    }
    if (!city && tok.length > 1) { city = tok[tok.length - 1]; tok = tok.slice(0, -1); }
    const st = [];
    tok.forEach((t) => { if (st.length && t === "2" && st[st.length - 1] === "1") st[st.length - 1] = "1/2"; else st.push(t); });
    const street = st.join(" ");
    return { zpid: m[2], street, city, state, zip, address: street + ", " + city + ", " + state + (zip ? " " + zip : "") };
  }

  function zillowKey(url) {
    try {
      const u = new URL(url);
      return (u.host.replace(/^www\./, "") + u.pathname.replace(/\/+$/, "")).toLowerCase();
    } catch (e) { return null; }
  }

  return { xy, init, centerKm, areaOf, classify, miles, zillowAddress, zillowKey };
});
