package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

var allowed = []string{"Content-Type", "X-Api-Key", "Authorization", "Anthropic-Version", "Accept"}
var drop = map[string]bool{"Content-Encoding": true, "Content-Length": true, "Transfer-Encoding": true, "Connection": true}

// redirects are returned to the client untouched, never followed
// the default keeps only 2 idle conns per host, which forces a new TLS handshake per request under load
var client = &http.Client{
	Transport: &http.Transport{
		Proxy:               nil,
		DialContext:         (&net.Dialer{Timeout: 10 * time.Second, KeepAlive: 30 * time.Second}).DialContext,
		ForceAttemptHTTP2:   true,
		MaxIdleConns:        0,
		MaxIdleConnsPerHost: 1024,
		IdleConnTimeout:     30 * time.Second,
		TLSHandshakeTimeout: 10 * time.Second,
	},
	CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse },
}

// Log line: HH:MM:SS(UTC) LEVEL METHOD /path status ms [· note]. Same in js/server.mjs.
func paint(code, v string) string {
	if os.Getenv("NO_COLOR") != "" {
		return v
	}
	return "\x1b[" + code + "m" + v + "\x1b[0m"
}

func say(level, msg string) {
	c := map[string]string{"INF": "32", "WRN": "33", "ERR": "31"}[level]
	fmt.Printf("%s %s %s\n", paint("2", time.Now().UTC().Format("15:04:05")), paint("1;"+c, level), msg)
}

type rec struct {
	http.ResponseWriter
	code int
	note string
}

func (r *rec) WriteHeader(c int) { r.code = c; r.ResponseWriter.WriteHeader(c) }
func (r *rec) Flush() {
	if f, ok := r.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

// path only: the query string may carry credentials
func logged(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		rw, t := &rec{ResponseWriter: w, code: 200}, time.Now()
		defer func() {
			level, sc := "INF", "32"
			switch {
			case rw.code >= 500:
				level, sc = "ERR", "31"
			case rw.code >= 400:
				level, sc = "WRN", "33"
			case rw.code >= 300:
				sc = "36"
			}
			msg := fmt.Sprintf("%s %s %s %s", paint("1", fmt.Sprintf("%-6s", r.Method)), r.URL.Path, paint(sc, fmt.Sprint(rw.code)), paint("2", fmt.Sprintf("%dms", time.Since(t).Milliseconds())))
			if rw.note != "" {
				msg += " " + paint("2", "· "+rw.note)
			}
			say(level, msg)
		}()
		next(rw, r)
	}
}

func fail(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"code": "WORKERERR", "message": msg})
}

func handle(w http.ResponseWriter, r *http.Request) {
	t, err := url.Parse(os.Getenv("UPSTREAM_BASE_URL"))
	if err != nil || t.Host == "" {
		fail(w, 500, "UPSTREAM_BASE_URL must be an https URL")
		return
	}
	if badScheme(t.Scheme) || t.User != nil || t.RawQuery != "" || t.Fragment != "" {
		fail(w, 500, "UPSTREAM_BASE_URL must be only an https origin (http needs ALLOW_HTTP=1) and optional path")
		return
	}
	host := r.Host
	if i := strings.LastIndex(host, ":"); i > 0 && !strings.Contains(host[i:], "]") {
		host = host[:i]
	}
	if strings.EqualFold(host, t.Hostname()) {
		fail(w, 500, "UPSTREAM_BASE_URL points at this relay")
		return
	}

	t.Path = strings.TrimRight(t.Path, "/") + r.URL.Path
	t.RawQuery = r.URL.RawQuery

	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, r.Method, t.String(), r.Body)
	if err != nil {
		fail(w, 502, "upstream unreachable")
		return
	}
	req.ContentLength = r.ContentLength
	for _, n := range allowed {
		if v := r.Header.Get(n); v != "" {
			req.Header.Set(n, v)
		}
	}
	// Go adds its own User-Agent and gzip negotiation; blank UA keeps the hop anonymous
	req.Header.Set("User-Agent", "")

	up, err := client.Do(req)
	if err != nil {
		if ue, ok := err.(*url.Error); ok {
			err = ue.Err // url.Error embeds the full URL, query included
		}
		if rw, ok := w.(*rec); ok {
			rw.note = err.Error()
		}
		fail(w, 502, "upstream unreachable")
		return
	}
	defer up.Body.Close()
	for k, vs := range up.Header {
		if drop[k] {
			continue
		}
		for _, v := range vs {
			w.Header().Add(k, v)
		}
	}
	w.WriteHeader(up.StatusCode)
	fl, _ := w.(http.Flusher)
	buf := make([]byte, 32<<10)
	for {
		n, err := up.Body.Read(buf)
		if n > 0 {
			w.Write(buf[:n])
			if fl != nil {
				fl.Flush() // SSE streams must not be buffered
			}
		}
		if err != nil {
			if err != io.EOF {
				panic(http.ErrAbortHandler)
			}
			return
		}
	}
}

// plain http would send API keys in clear text, so it is opt-in (private networks only)
func badScheme(s string) bool {
	return s != "https" && !(s == "http" && os.Getenv("ALLOW_HTTP") == "1")
}

func upstreamHost() string {
	if t, err := url.Parse(os.Getenv("UPSTREAM_BASE_URL")); err == nil && t.Host != "" {
		return t.Host
	}
	return "NOT SET"
}

func main() {
	// scratch image has no shell or curl, so HEALTHCHECK re-runs this binary
	if len(os.Args) > 1 && os.Args[1] == "-healthcheck" {
		c, err := net.DialTimeout("tcp", "127.0.0.1:3000", 2*time.Second)
		if err != nil {
			os.Exit(1)
		}
		c.Close()
		return
	}
	say("INF", "relay listening "+paint("1", ":3000")+" upstream="+upstreamHost())
	if err := http.ListenAndServe("0.0.0.0:3000", logged(handle)); err != nil {
		say("ERR", err.Error())
		os.Exit(1)
	}
}
