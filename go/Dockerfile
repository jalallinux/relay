FROM golang:1.24-alpine AS build
WORKDIR /src
COPY main.go .
RUN go mod init relay >/dev/null 2>&1; CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /relay .

FROM scratch
LABEL org.opencontainers.image.source=https://github.com/jalallinux/relay
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY --from=build /relay /relay
USER 1000
EXPOSE 3000
ENTRYPOINT ["/relay"]
