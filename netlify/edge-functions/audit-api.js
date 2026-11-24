// Forwards the AI Visibility Audit API calls made from www.floorlineai.com/audit
// to the audit site (floorline-aeo-audit.netlify.app), where the scanner,
// reports, lead storage and API keys live.
//
// Why this exists: a _redirects proxy (status 200) between two Netlify sites
// serves the audit site's static files but never runs its edge functions, so
// /api/* returned 404. Netlify's documented way to reach another Netlify site
// from an edge function is fetch(), which runs the target's functions normally.

const UPSTREAM = "https://floorline-aeo-audit.netlify.app";
const PATHS = ["/api/aeo-audit", "/api/aeo-report", "/api/aeo-lead", "/api/aeo-citation-test"];
const FORWARD_HEADERS = ["content-type", "accept", "accept-language", "user-agent"];

export default async (request) => {
  const url = new URL(request.url);
  if (!PATHS.includes(url.pathname)) {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers();
  for (const name of FORWARD_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const init = { method: request.method, headers, redirect: "manual" };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  let upstream;
  try {
    upstream = await fetch(UPSTREAM + url.pathname + url.search, init);
  } catch {
    return new Response(
      JSON.stringify({ error: "The audit service is temporarily unavailable. Please try again in a minute." }),
      { status: 502, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } },
    );
  }

  // fetch() has already decoded the body, so drop the encoding/length headers.
  const out = new Headers(upstream.headers);
  out.delete("content-encoding");
  out.delete("content-length");
  out.set("cache-control", "no-store");
  return new Response(upstream.body, { status: upstream.status, headers: out });
};

export const config = { path: PATHS };
