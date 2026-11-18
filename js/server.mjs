import http from "node:http";
import { Readable } from "node:stream";

const ALLOWED = ["content-type", "x-api-key", "authorization", "anthropic-version", "accept"];
const DROP = new Set(["content-encoding", "content-length", "transfer-encoding", "connection"]);

// Log line: HH:MM:SS(UTC) LEVEL METHOD /path status ms [· note]. Same in go/main.go.
const paint = (c, v) => (process.env.NO_COLOR ? v : `\x1b[${c}m${v}\x1b[0m`);
const say = (level, msg) =>
  console.log(`${paint("2", new Date().toISOString().slice(11, 19))} ${paint("1;" + { INF: 32, WRN: 33, ERR: 31 }[level], level)} ${msg}`);

const fail = (res, status, message) => {
  res.writeHead(status, { "cache-control": "no-store", "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({ code: "WORKERERR", message }));
};

http.createServer(async (req, res) => {
  const t0 = Date.now();
  let note = "";
  // path only: the query string may carry credentials
  res.on("close", () => {
    const c = res.statusCode;
    const level = c >= 500 ? "ERR" : c >= 400 ? "WRN" : "INF";
    const sc = c >= 500 ? 31 : c >= 400 ? 33 : c >= 300 ? 36 : 32;
    say(level, `${paint("1", req.method.padEnd(6))} ${req.url.split("?")[0]} ${paint(sc, c)} ${paint("2", `${Date.now() - t0}ms`)}${note ? " " + paint("2", "· " + note) : ""}`);
  });
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
    note = e.cause?.code || e.name;
    if (res.headersSent) res.destroy(); else fail(res, 502, "upstream unreachable");
  }
}).listen(3000, "0.0.0.0", () => {
  let h = "NOT SET";
  try { h = new URL(process.env.UPSTREAM_BASE_URL).host; } catch {}
  say("INF", `relay listening ${paint("1", ":3000")} upstream=${h}`);
});