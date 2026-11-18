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
   npx wrangler deploy worker.js --name relay --compatibility-date 2026-11-10
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

By default the Worker runs near the user. If the upstream only accepts certain countries, pin it to a region. The full list of ids is in the comment at the top of `worker.js`. Pass it in the upload metadata (or `wrangler.toml`):

```toml
name = "relay"
main = "worker.js"
compatibility_date = "2026-11-10"

[placement]
region = "aws:eu-central-1"   # Frankfurt
```

Then run `npx wrangler deploy`.

> 💡 Placement only moves where **the Worker** runs. Users still connect to their nearest Cloudflare edge first; it never changes who can reach your relay.

## ⚠️ Limits

- 🔎 The runtime always adds `CF-Worker`, `CF-Ray` and `CDN-Loop` to the outgoing request. A Worker can't remove them.
- 🧮 Free plan: 100k requests per day, and CPU time limits. Streaming responses are fine.
- 🔑 Anyone with the Worker URL can use your upstream through it. Add auth in front if it is public.

## ⚙️ Config

| 🔧 Name | 📝 Meaning |
| --- | --- |
| `UPSTREAM_BASE_URL` | Required secret. `https://` origin, optional path prefix. No query, fragment or credentials. |
