# 🔀 relay

A tiny, anonymous HTTPS relay. It takes any request, forwards it to one upstream URL you choose, and streams the answer back. Nothing else.

Useful when the client can't (or shouldn't) talk to an API directly, for example an AI API that is blocked or geo-restricted from where your users are.

One idea, three ways to run it:

| 📁 Folder | 🧰 Runtime | 🎯 Best for |
| --- | --- | --- |
| [`go/`](go) | Go, static binary | Your own server. Smallest image, lowest memory. |
| [`js/`](js) | Node.js 22 | Your own server, if you'd rather read/edit JavaScript. |
| [`cloudflare/`](cloudflare) | Cloudflare Worker | No server at all. Free tier is enough. |

## ✨ What it does

- 🔒 Upstream must be `https://` (set `ALLOW_HTTP=1` to allow `http://` on a private network). Main env var: `UPSTREAM_BASE_URL`.
- 🕵️ Forwards **only** 5 headers: `content-type`, `x-api-key`, `authorization`, `anthropic-version`, `accept`. Client IP, cookies, `User-Agent`, `X-Forwarded-*` are never sent.
- 🌊 Streams request and response bodies, so SSE / chat streaming works.
- ↪️ Redirects are returned to the client, never followed.
- 🚨 Its own failures are JSON `{"code":"WORKERERR","message":"..."}`, so you can tell them apart from upstream errors. Upstream status and body pass through unchanged.
- 🔁 Refuses to point at itself (no loops).

```
client ──► relay ──► UPSTREAM_BASE_URL
          (5 headers only)
```

## 📦 Docker images

Registry: `ghcr.io/jalallinux/relay`

| 🏷️ Tag | 🧰 Runtime | 💾 On disk | 📥 Pull (compressed) |
| --- | --- | ---: | ---: |
| `ghcr.io/jalallinux/relay:go` | Go (static, `scratch`) | **9 MB** | **~3 MB** |
| `ghcr.io/jalallinux/relay:js` | Node 22 (stripped, `scratch`) | 162 MB | ~45 MB |
| plain `node:22-alpine` + script (baseline) | Node 22 | 232 MB | n/a |

Go is ~18x smaller than the JavaScript image, because the Node binary alone is 129 MB.

## 🏋️ Load test

Keep-alive clients, 1 KB JSON reply, local upstream with 20 ms latency, 8-core machine, 10 s per run. This measures the relay's own overhead; a real upstream is usually the bottleneck.

| 🔌 Concurrent | 🧰 Runtime | ⚡ Req/s | ⏱️ p50 | 🐢 p99 | 💾 Memory | ❌ Errors |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 🐹 Go | **~5,800** | **157 ms** | **383 ms** | **187 MB** | 0 |
| 1,000 | 🟢 Node.js | ~1,900 | 254 ms | 10,273 ms | 514 MB | 0 |
| 3,000 | 🐹 Go | **~5,500** | **495 ms** | **1,408 ms** | **187 MB** | 0 |
| 3,000 | 🟢 Node.js | ~670 | 5,004 ms | 11,617 ms | 514 MB | 0 |

📌 Both handle 1000+ simultaneous requests without dropping any. Go keeps throughput flat as load grows; Node is single-threaded, so requests queue and latency climbs. For heavy traffic use Go, or run several Node containers behind a load balancer.

## 🚀 Quick start

```bash
docker run -d -p 3000:3000 \
  -e UPSTREAM_BASE_URL=https://api.example.com \
  ghcr.io/jalallinux/relay:go

curl http://localhost:3000/v1/anything   # goes to https://api.example.com/v1/anything
```

Put it behind a TLS reverse proxy (Caddy, Traefik, Coolify, Cloudflare) in production. The relay itself speaks plain HTTP on port `3000`.

## ⚠️ Good to know

- 🙈 This hides your client from the upstream, but the relay's own IP is visible to it. On Cloudflare Workers, the runtime also adds `CF-Worker`, `CF-Ray` and `CDN-Loop` headers that can't be removed.
- 🔑 It forwards your `Authorization` / `x-api-key` as-is. Anyone who can reach the relay can use your upstream through it: restrict access (firewall, private network, or an auth layer in front).
- 🔓 `ALLOW_HTTP=1` sends your keys unencrypted to the upstream. Use it only inside a private network (e.g. a Docker network), never over the internet.
- 🧱 Env is read at **run** time, never at build time. Don't bake `UPSTREAM_BASE_URL` into an image.

## 📄 License

Add a `LICENSE` file before publishing (MIT is a common choice).
