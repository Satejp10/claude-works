/**
 * claude-works analytics
 * ----------------------
 * A single Cloudflare Worker that collects pageviews from the GitHub Pages
 * gallery and renders the results back into the GitHub profile README as SVG.
 *
 * Why this exists in this shape: GitHub proxies every README image through its
 * Camo service, which fetches the image server-side. An endpoint hit from a
 * README therefore sees Camo's IP and a `github-camo` user-agent, never the
 * visitor's — so region and device simply cannot be measured from a profile
 * README, by anyone. What *can* be measured is the Pages site, where our own
 * JS runs in the real browser. This Worker collects there and displays here.
 *
 * Endpoints
 *   POST /hit         beacon target for works + gallery (CORS-locked)
 *   GET  /badge.svg   demographics card for the profile README
 *   GET  /views.svg   approximate profile-view counter (counts Camo fetches)
 *   GET  /stats.json  aggregates as JSON
 *
 * Privacy: no IP is ever stored. See schema.sql.
 */

const DEVICES = new Set(["mobile", "tablet", "desktop"]);
const CONTINENTS = new Set(["AF", "AN", "AS", "EU", "NA", "OC", "SA"]);

const COUNTRY_NAMES = {
  US: "United States", IN: "India", GB: "United Kingdom", CA: "Canada",
  DE: "Germany", FR: "France", NL: "Netherlands", AU: "Australia",
  JP: "Japan", SG: "Singapore", BR: "Brazil", ES: "Spain", IT: "Italy",
  SE: "Sweden", NO: "Norway", DK: "Denmark", FI: "Finland", PL: "Poland",
  IE: "Ireland", CH: "Switzerland", AT: "Austria", BE: "Belgium",
  PT: "Portugal", CZ: "Czechia", RO: "Romania", UA: "Ukraine",
  RU: "Russia", TR: "Turkey", IL: "Israel", AE: "UAE", SA: "Saudi Arabia",
  ZA: "South Africa", NG: "Nigeria", KE: "Kenya", EG: "Egypt",
  MX: "Mexico", AR: "Argentina", CL: "Chile", CO: "Colombia",
  CN: "China", HK: "Hong Kong", TW: "Taiwan", KR: "South Korea",
  ID: "Indonesia", MY: "Malaysia", TH: "Thailand", VN: "Vietnam",
  PH: "Philippines", PK: "Pakistan", BD: "Bangladesh", LK: "Sri Lanka",
  NZ: "New Zealand", XX: "Unknown",
};

/* ------------------------------------------------------------------ utils */

const utcDay = (d = new Date()) => d.toISOString().slice(0, 10);

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c])
  );

const fmt = (n) => Number(n || 0).toLocaleString("en-US");

function allowedOrigins(env) {
  return new Set(
    String(env.ALLOWED_ORIGINS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

function corsHeaders(origin, env) {
  if (!origin || !allowedOrigins(env).has(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

async function visitorId(request, env, day) {
  // One-way, salted, and scoped to a single UTC day. The raw IP never leaves
  // this function, and the digest it produces is unlinkable across days.
  const ip = request.headers.get("CF-Connecting-IP") || "";
  const ua = request.headers.get("User-Agent") || "";
  const salt = env.VISITOR_SALT || "unsalted-dev-only";
  const bytes = new TextEncoder().encode(`${ip}|${ua}|${salt}|${day}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ------------------------------------------------------------ collection */

async function handleHit(request, env, ctx) {
  const origin = request.headers.get("Origin");
  if (!allowedOrigins(env).has(origin)) {
    return new Response("forbidden origin", { status: 403 });
  }

  let body;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return new Response("bad payload", { status: 400 });
  }

  // Normalise everything from the client — it is untrusted input.
  const slug = String(body.s || "gallery").slice(0, 80).replace(/[^\w.-]/g, "") || "gallery";
  const referrer = String(body.r || "direct").slice(0, 120).replace(/[^\w.-]/g, "") || "direct";

  const cf = request.cf || {};
  const country = /^[A-Z]{2}$/.test(cf.country || "") ? cf.country : "XX";
  const region = CONTINENTS.has(cf.continent) ? cf.continent : "XX";

  // Trust the client's own reading of its viewport first, since it knows about
  // zoom and split-screen; fall back to the UA when the hint is missing.
  let device = DEVICES.has(body.d) ? body.d : null;
  if (!device) {
    const ua = request.headers.get("User-Agent") || "";
    device = /Mobi|Android|iPhone/i.test(ua)
      ? "mobile"
      : /iPad|Tablet/i.test(ua)
      ? "tablet"
      : "desktop";
  }

  const day = utcDay();
  const vid = await visitorId(request, env, day);

  // INSERT OR IGNORE tells us, via changes, whether this visitor was already
  // counted today — that is the whole mechanism for unique visitors.
  const seen = await env.DB.prepare(
    "INSERT OR IGNORE INTO seen (vid, day) VALUES (?, ?)"
  )
    .bind(vid, day)
    .run();
  const isNewVisitor = (seen.meta?.changes ?? 0) > 0 ? 1 : 0;

  await env.DB.prepare(
    `INSERT INTO pageviews (day, slug, country, region, device, referrer, views, visitors)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?)
     ON CONFLICT(day, slug, country, region, device, referrer)
     DO UPDATE SET views = views + 1, visitors = visitors + excluded.visitors`
  )
    .bind(day, slug, country, region, device, referrer, isNewVisitor)
    .run();

  // Keep `seen` from growing without bound. Yesterday's hashes are useless —
  // the salt has rotated — so drop them on roughly 1 request in 50.
  if (Math.random() < 0.02) {
    ctx.waitUntil(
      env.DB.prepare("DELETE FROM seen WHERE day < ?").bind(day).run()
    );
  }

  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin, env),
  });
}

/* -------------------------------------------------------------- querying */

async function loadStats(env) {
  const [totals, byCountry, byDevice, byWork, recent] = await env.DB.batch([
    env.DB.prepare(
      "SELECT COALESCE(SUM(views),0) AS views, COALESCE(SUM(visitors),0) AS visitors FROM pageviews"
    ),
    env.DB.prepare(
      `SELECT country, region, SUM(views) AS views FROM pageviews
       GROUP BY country, region ORDER BY views DESC LIMIT 8`
    ),
    env.DB.prepare(
      "SELECT device, SUM(views) AS views FROM pageviews GROUP BY device"
    ),
    env.DB.prepare(
      `SELECT slug, SUM(views) AS views, SUM(visitors) AS visitors FROM pageviews
       GROUP BY slug ORDER BY views DESC LIMIT 20`
    ),
    env.DB.prepare(
      `SELECT day, SUM(views) AS views FROM pageviews
       GROUP BY day ORDER BY day DESC LIMIT 30`
    ),
  ]);

  const devices = { mobile: 0, tablet: 0, desktop: 0 };
  for (const row of byDevice.results) {
    if (row.device in devices) devices[row.device] = row.views;
  }

  return {
    views: totals.results[0]?.views ?? 0,
    visitors: totals.results[0]?.visitors ?? 0,
    countries: byCountry.results,
    devices,
    works: byWork.results,
    daily: recent.results.reverse(),
  };
}

/* --------------------------------------------------------------- badges  */

const SVG_THEME = `
  .bg   { fill:#ffffff; stroke:#e8e8e8; }
  .ink  { fill:#1f1f1f; }
  .mute { fill:#737373; }
  .rail { fill:#f1f1f1; }
  .acc  { fill:#7F4BF3; }
  .acc2 { fill:#c4a9fb; }
  @media (prefers-color-scheme: dark) {
    .bg   { fill:#0d1117; stroke:#30363d; }
    .ink  { fill:#e6edf3; }
    .mute { fill:#8b949e; }
    .rail { fill:#21262d; }
    .acc  { fill:#a680ff; }
    .acc2 { fill:#5b3ea8; }
  }
`;

const FONT =
  "system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

function badgeSvg(stats) {
  const W = 540;
  const H = 196;
  const PAD = 28;
  const { mobile, tablet, desktop } = stats.devices;
  const deviceTotal = mobile + tablet + desktop;
  const handheld = mobile + tablet;

  // Device split: one rail, two segments, clipped so only the outer corners
  // round. Tablets fold into "mobile" here to keep the label to one line.
  const barX = 300;
  const barW = W - barX - PAD;
  const wDesktop = deviceTotal ? (desktop / deviceTotal) * barW : 0;
  const pct = (v) => (deviceTotal ? Math.round((v / deviceTotal) * 100) : 0);

  // Top regions, as bars relative to the busiest one.
  const top = stats.countries.slice(0, 3);
  const maxViews = Math.max(1, ...top.map((c) => c.views));
  const railX = 150;
  const railW = 96;

  const rows = top
    .map((c, i) => {
      const y = 140 + i * 18;
      const name = COUNTRY_NAMES[c.country] || c.country;
      const w = Math.max(2, (c.views / maxViews) * railW);
      return `
  <text x="${PAD}" y="${y + 4}" class="mute" font-size="11" font-family="${FONT}">${esc(name)}</text>
  <rect x="${railX}" y="${y - 5}" width="${railW}" height="7" rx="3.5" class="rail"/>
  <rect x="${railX}" y="${y - 5}" width="${w.toFixed(1)}" height="7" rx="3.5" class="acc"/>
  <text x="${railX + railW + 10}" y="${y + 4}" class="mute" font-size="11" font-family="${FONT}">${fmt(c.views)}</text>`;
    })
    .join("");

  const empty =
    top.length === 0
      ? `\n  <text x="${PAD}" y="144" class="mute" font-size="11" font-family="${FONT}">No visits recorded yet.</text>`
      : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Portfolio analytics: ${fmt(stats.views)} views from ${fmt(stats.visitors)} unique visitors, ${pct(desktop)} percent desktop">
  <style>${SVG_THEME}</style>
  <clipPath id="devbar"><rect x="${barX}" y="40" width="${barW}" height="9" rx="4.5"/></clipPath>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" class="bg" stroke-width="1"/>

  <text x="${PAD}" y="30" class="mute" font-size="9.5" letter-spacing="1.6" font-family="${FONT}" font-weight="600">PORTFOLIO ANALYTICS</text>

  <text x="${PAD}" y="72" class="ink" font-size="34" font-weight="700" font-family="${FONT}">${fmt(stats.views)}<tspan class="mute" font-size="12" font-weight="500" dx="7">views</tspan></text>
  <text x="${PAD}" y="94" class="mute" font-size="11" font-family="${FONT}">${fmt(stats.visitors)} unique visitors</text>

  <text x="${barX}" y="30" class="mute" font-size="9.5" letter-spacing="1.6" font-family="${FONT}" font-weight="600">DEVICE</text>
  <g clip-path="url(#devbar)">
    <rect x="${barX}" y="40" width="${barW}" height="9" class="rail"/>${
      deviceTotal
        ? `
    <rect x="${barX}" y="40" width="${wDesktop.toFixed(1)}" height="9" class="acc"/>
    <rect x="${(barX + wDesktop).toFixed(1)}" y="40" width="${(barW - wDesktop).toFixed(1)}" height="9" class="acc2"/>`
        : ""
    }
  </g>
  <text x="${barX}" y="66" class="mute" font-size="11" font-family="${FONT}">${pct(desktop)}% desktop · ${pct(handheld)}% mobile</text>

  <text x="${PAD}" y="122" class="mute" font-size="9.5" letter-spacing="1.6" font-family="${FONT}" font-weight="600">TOP REGIONS</text>${rows}${empty}
</svg>`;
}

function viewsSvg(count) {
  const label = "Profile views";
  const value = fmt(count);
  // Widths are estimated from character count, the same approach shields.io
  // uses — an SVG served as an <img> cannot measure its own text.
  const lw = 92;
  const vw = Math.max(40, value.length * 8 + 22);
  const W = lw + vw;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="28" viewBox="0 0 ${W} 28" role="img" aria-label="${label}: ${value}">
  <style>
    .l { fill:#f1f1f1; } .lt { fill:#3a3a3a; }
    @media (prefers-color-scheme: dark) { .l { fill:#21262d; } .lt { fill:#c9d1d9; } }
  </style>
  <clipPath id="pill"><rect x="0" y="0" width="${W}" height="28" rx="6"/></clipPath>
  <g clip-path="url(#pill)">
    <rect x="0" y="0" width="${lw}" height="28" class="l"/>
    <rect x="${lw}" y="0" width="${vw}" height="28" fill="#7F4BF3"/>
  </g>
  <text x="14" y="18.5" font-size="11.5" font-family="${FONT}" font-weight="500" class="lt">${label}</text>
  <text x="${lw + vw / 2}" y="18.5" font-size="11.5" font-family="${FONT}" font-weight="700" fill="#ffffff" text-anchor="middle">${value}</text>
</svg>`;
}

/* ---------------------------------------------------------------- router */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin, env) });
    }

    if (url.pathname === "/hit" && request.method === "POST") {
      return handleHit(request, env, ctx);
    }

    if (url.pathname === "/badge.svg") {
      const svg = badgeSvg(await loadStats(env));
      return new Response(svg, {
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          // Camo caches aggressively; this is the shortest TTL it tends to
          // honour. The badge lags real traffic by a few minutes, which is
          // fine for a README.
          "Cache-Control": "max-age=300, s-maxage=300, must-revalidate",
        },
      });
    }

    if (url.pathname === "/views.svg") {
      // Counts Camo fetches, not people: GitHub caches the image and serves
      // many readers from one fetch, so this undercounts and cannot be
      // broken down by region or device. Treat it as a rough gauge.
      await env.DB.prepare(
        `INSERT INTO counters (name, value) VALUES ('profile_views', 1)
         ON CONFLICT(name) DO UPDATE SET value = value + 1`
      ).run();
      const row = await env.DB.prepare(
        "SELECT value FROM counters WHERE name = 'profile_views'"
      ).first();

      return new Response(viewsSvg(row?.value ?? 0), {
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    if (url.pathname === "/stats.json") {
      return new Response(JSON.stringify(await loadStats(env), null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "max-age=300",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};
