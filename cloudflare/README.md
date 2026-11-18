# ☁️ relay (Cloudflare Worker)

No server, no Docker. The same relay as a single Worker file, `worker.js`. The free plan is enough.

## 🚀 Deploy with Wrangler

1. 📦 Install Node.js 22+, then log in:
   ```bash
   npx wrangler login
   ```
2. 📂 Go into this folder:
   ```bash
   cd cloudflare
   ```
3. 🛫 Deploy:
   ```bash
   npx wrangler deploy
   ```
4. 🔐 Set the upstream as a **secret** (not a plain var, so it stays out of your repo and logs):
   ```bash
   npx wrangler secret put UPSTREAM_BASE_URL
   # paste: https://api.example.com
   ```
5. ✅ Test it:
   ```bash
   curl -i https://relay.<your-subdomain>.workers.dev/
   ```

## 🖱️ Or deploy from the dashboard

1. *Workers & Pages → Create → Worker*, name it `relay`.
2. *Edit code*, paste the contents of `worker.js`, *Deploy*.
3. *Settings → Variables and Secrets → Add*, type **Secret**, name `UPSTREAM_BASE_URL`.

## 🌐 Use your own domain

1. Your domain must be on Cloudflare DNS.
2. *Worker → Settings → Domains & Routes → Add → Custom domain* (e.g. `relay.example.com`).
3. Cloudflare creates the DNS record and certificate for you.

## 📍 Choose where the Worker runs (optional)

By default the Worker runs near the user. If the upstream is slow or restricted from some places, pin the Worker to a region. All ids are listed in the comment at the top of `worker.js`. The region lives in [`wrangler.toml`](wrangler.toml):

```toml
[placement]
region = "aws:eu-west-3"   # Paris
```

Change it, then run `npx wrangler deploy` again.

📊 Measured from Iran against a Cloudflare-proxied upstream (22 regions, 12 rounds each, small and 200 KB bodies):

| 🏅 Rank | 🌍 Region | 🏙️ City | ⏱️ Median |
| ---: | --- | --- | ---: |
| 1 | `aws:eu-west-3` | Paris | ~385 ms |
| 2 | `aws:eu-central-2` | Zurich | ~390 ms |
| 3 | `aws:eu-west-2` | London | ~400 ms |
| 4 | `aws:eu-central-1` | Frankfurt | ~430 ms |
| 5 | `aws:eu-north-1` | Stockholm | ~440 ms |

Gulf and India regions were slower (700 ms and up). Results depend on your users' network, so measure from where they are.

> 💡 Placement only moves where **the Worker** runs. Users still connect to their nearest Cloudflare edge first; it never changes who can reach your relay.

## ⚠️ Limits

- 🔎 The runtime always adds `CF-Worker`, `CF-Ray` and `CDN-Loop` to the outgoing request. A Worker can't remove them.
- 🧮 Free plan: 100k requests per day, and CPU time limits. Streaming responses are fine.
- 🔑 Anyone with the Worker URL can use your upstream through it. Add auth in front if it is public.

> ℹ️ The Worker version has no `ALLOW_HTTP` switch: it accepts only `https://`.

## ⚙️ Config

| 🔧 Name | 📝 Meaning |
| --- | --- |
| `UPSTREAM_BASE_URL` | Required secret. `https://` origin, optional path prefix. No query, fragment or credentials. |
