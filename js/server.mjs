import http from "node:http";
import { Readable } from "node:stream";

const ALLOWED = ["content-type", "x-api-key", "authorization", "anthropic-version", "accept"];
const DROP = new Set(["content-encoding", "content-length", "transfer-encoding", "connection"]);

const fail = (res, status, message) => {
  res.writeHead(status, { "cache-control": "no-store", "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({ code: "WORKERERR", message }));
};

http.createServer(async (req, res) => {
  let target;
  try { target = new URL(process.env.UPSTREAM_BASE_URL); } catch { return fail(res, 500, "UPSTREAM_BASE_URL must be an https URL"); }
  if (target.protocol !== "https:" || target.username || target.password || target.search || target.hash)
    return fail(res, 500, "UPSTREAM_BASE_URL must be only an https origin and optional path");
  const host = (req.headers.host || "").split(":")[0].toLowerCase();
  if (host === target.hostname.toLowerCase()) return fail(res, 500, "UPSTREAM_BASE_URL points at this relay");

  const incoming = new URL(req.url, "http://relay");
  const prefix = target.pathname === "/" ? "" : target.pathname.replace(/\/+$/, "");
  target.pathname = prefix + incoming.pathname;
  target.search = incoming.search;

  const headers = new Headers();
  for (const name of ALLOWED) {
    const v = req.headers[name];
    if (v) headers.set(name, v);
  }

  const ac = new AbortController();
  res.on("close", () => ac.abort());
  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  try {
    const up = await fetch(target, {
      method: req.method, headers, redirect: "manual", signal: ac.signal,
      ...(hasBody && { body: Readable.toWeb(req), duplex: "half" }),
    });
    const out = {};
    up.headers.forEach((v, k) => { if (!DROP.has(k)) out[k] = v; });
    const sc = up.headers.getSetCookie();
    if (sc.length) out["set-cookie"] = sc;
    res.writeHead(up.status, out);
    if (!up.body) return res.end();
    Readable.fromWeb(up.body).on("error", () => res.destroy()).pipe(res);
  } catch (e) {
    if (res.headersSent) res.destroy(); else fail(res, 502, "upstream unreachable");
  }
}).listen(3000, "0.0.0.0");