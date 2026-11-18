# 🟢 relay (Node.js)

The same relay in ~50 lines of dependency-free JavaScript (Node 22 built-in `fetch`). Easy to read and change. **~162 MB** on disk, **~45 MB** to pull.

## ▶️ Run the ready-made image

1. 📥 Pull and start it:
   ```bash
   docker run -d --name relay -p 3000:3000 \
     -e UPSTREAM_BASE_URL=https://api.example.com \
     ghcr.io/jalallinux/relay:js
   ```
2. ✅ Check it works:
   ```bash
   curl -i http://localhost:3000/
   ```
   Without the env var you get `500` + `WORKERERR`.

## 🛠️ Build it yourself

1. 📂 Go into this folder:
   ```bash
   cd js
   ```
2. 🔨 Build:
   ```bash
   docker build -t ghcr.io/<your-user>/relay:js .
   ```
3. 🧪 Test locally with the `docker run` above.
4. 🔐 Log in to GitHub Container Registry (token needs `write:packages`):
   ```bash
   echo $GITHUB_TOKEN | docker login ghcr.io -u <your-user> --password-stdin
   ```
5. 📤 Push:
   ```bash
   docker push ghcr.io/<your-user>/relay:js
   ```
6. 🌍 Make the package public: *Profile → Packages → relay → Package settings → Change visibility*.

## 💻 Run without Docker

1. Install Node.js 22+.
2. ```bash
   UPSTREAM_BASE_URL=https://api.example.com node server.mjs
   ```

## 🧩 How the image got smaller (232 MB → 162 MB)

- ✂️ The `node` binary is copied out of `node:22-alpine` and `strip`ped (-15 MB).
- 📦 Final stage is `scratch`: only `node`, musl, `libstdc++` and CA certificates. npm, yarn and the shell are gone.
- ⚠️ No shell inside, so `docker exec ... sh` won't work. Runs as non-root.
- 📌 Hit a Docker Hub `403` on some base images (e.g. from restricted regions)? This Dockerfile only needs `node:22-alpine`; use a VPN or a mirror for the first pull.

Want it smaller? Use the [Go version](../go).

## ⚙️ Config

| 🔧 Variable | 📝 Meaning |
| --- | --- |
| `UPSTREAM_BASE_URL` | Required. `https://` origin, optional path prefix. No query, fragment or credentials. |

Listens on `0.0.0.0:3000`.
