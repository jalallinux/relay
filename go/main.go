package main

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
)

var allowed = []string{"Content-Type", "X-Api-Key", "Authorization", "Anthropic-Version", "Accept"}
var drop = map[string]bool{"Content-Encoding": true, "Content-Length": true, "Transfer-Encoding": true, "Connection": true}

// redirects are returned to the client untouched, never followed
var client = &http.Client{CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}

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
	if t.Scheme != "https" || t.User != nil || t.RawQuery != "" || t.Fragment != "" {
		fail(w, 500, "UPSTREAM_BASE_URL must be only an https origin and optional path")
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

func main() {
	http.ListenAndServe("0.0.0.0:3000", http.HandlerFunc(handle))
}
