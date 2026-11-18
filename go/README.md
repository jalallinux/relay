# 🐹 relay (Go)

The smallest version: one static binary in a `scratch` image. **~9 MB** on disk, **~3 MB** to pull.

## ▶️ Run the ready-made image

1. 📥 Pull and start it:
   ```bash
   docker run -d --name relay -p 3000:3000 \
     -e UPSTREAM_BASE_URL=https://api.example.com \
     ghcr.io/jalallinux/relay:go
   ```
2. ✅ Check it works:
   ```bash
   curl -i http://localhost:3000/
   ```
   You should get the upstream's answer. Without the env var you get `500` + `WORKERERR`.

## 🛠️ Build it yourself

1. 📂 Go into this folder:
   ```bash
   cd go
   ```
2. 🔨 Build:
   ```bash
   docker build -t ghcr.io/<your-user>/relay:go .
   ```
3. 🧪 Test locally (same `docker run` as above, with your tag).
4. 🔐 Log in to GitHub Container Registry (token needs the `write:packages` scope):
   ```bash
   echo $GITHUB_TOKEN | docker login ghcr.io -u <your-user> --password-stdin
   ```
5. 📤 Push:
   ```bash
   docker push ghcr.io/<your-user>/relay:go
   ```
6. 🌍 On GitHub: *Profile → Packages → relay → Package settings → Change visibility → Public*, so others can pull without logging in.

## 💻 Run without Docker

1. Install Go 1.24+.
2. ```bash
   go mod init relay && go build -o relay . && UPSTREAM_BASE_URL=https://api.example.com ./relay
   ```

## 🧩 How the image is so small

- 🧱 `CGO_ENABLED=0` makes a static binary, so no libc or runtime is needed.
- ✂️ `-ldflags="-s -w"` strips debug info.
- 📦 The final stage is `scratch`: only the binary and the CA certificates (needed for HTTPS to upstream).
- 👤 Runs as non-root (`USER 1000`). There is no shell inside, so `docker exec ... sh` won't work.

## ⚙️ Config

| 🔧 Variable | 📝 Meaning |
| --- | --- |
| `UPSTREAM_BASE_URL` | Required. `https://` origin, optional path prefix. No query, fragment or credentials. |

Listens on `0.0.0.0:3000`.
