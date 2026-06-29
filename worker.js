// Optional conditional-caching endpoint for bounded.tools.
//
// The canonical site stays PURE STATIC: Cloudflare's static-asset server handles
// every real route directly and this Worker is NOT invoked for them (no
// run_worker_first). The Worker only runs for requests that don't match an asset
// — and it gives meaning to ONE such namespace, the "/c/" prefix:
//
//   /c/<path>  → the same asset as /<path>, but served WITH a strong content
//                ETag and full RFC 9110 §13.1.2 / RFC 9111 conditional handling
//                (If-None-Match → 304). Cloudflare's static-asset server already
//                does ETag/304 for CSS/JSON/etc. but deliberately OMITS it for
//                text/html; this opt-in path supplies it without making the
//                production site depend on a runtime.
//
// So `integrity.http-rfc9110`'s conditional check can be exercised by pointing the
// post-deploy http-probe at /c/ — while the bytes everyone else gets are unchanged,
// unsigned-by-a-runtime, static. Anything outside /c/ defers to the asset server.
const PREFIX = "/c/";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith(PREFIX)) {
      // Only reached for non-asset paths (typos) — defer to the asset 404 handling.
      return env.ASSETS.fetch(request);
    }

    // Map /c/<path> → /<path> and fetch the underlying asset unconditionally
    // (strip conditional headers so WE own the 304 decision, not the asset server).
    const inner = url.pathname.slice(PREFIX.length - 1) || "/"; // keep one leading slash
    const innerHeaders = new Headers(request.headers);
    innerHeaders.delete("If-None-Match");
    innerHeaders.delete("If-Modified-Since");
    const assetReq = new Request(new URL(inner + url.search, url.origin), {
      method: request.method === "HEAD" ? "GET" : request.method,
      headers: innerHeaders,
    });

    const res = await env.ASSETS.fetch(assetReq);
    if (request.method !== "GET" && request.method !== "HEAD") return res;
    if (!res.ok) return res; // 404 etc. pass through untouched

    const body = await res.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", body);
    const etag = '"' +
      [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32) +
      '"';

    const headers = new Headers(res.headers);
    headers.set("ETag", etag);
    if (!headers.has("Cache-Control")) {
      headers.set("Cache-Control", "public, max-age=0, must-revalidate");
    }

    const inm = request.headers.get("If-None-Match");
    if (inm && inm.split(",").map((s) => s.trim()).includes(etag)) {
      return new Response(null, { status: 304, headers }); // §13.1.2: 304, no body
    }
    if (request.method === "HEAD") return new Response(null, { status: res.status, headers });
    return new Response(body, { status: res.status, headers });
  },
};
