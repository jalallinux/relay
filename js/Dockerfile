FROM node:22-alpine AS base
RUN apk add --no-cache binutils && cp /usr/local/bin/node /node && strip /node

FROM scratch
LABEL org.opencontainers.image.source=https://github.com/jalallinux/relay
COPY --from=base /lib/ld-musl-x86_64.so.1 /lib/ld-musl-x86_64.so.1
COPY --from=base /usr/lib/libstdc++.so.6 /usr/lib/libgcc_s.so.1 /usr/lib/
COPY --from=base /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY --from=base /node /usr/local/bin/node
WORKDIR /app
COPY server.mjs .
USER 1000
EXPOSE 3000
CMD ["/usr/local/bin/node", "server.mjs"]
