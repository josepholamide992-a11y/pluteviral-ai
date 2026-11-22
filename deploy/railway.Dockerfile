# Reuse the upstream prebuilt container; do not rebuild the video engine on every push.
FROM ghcr.io/harry0703/moneyprinterturbo:latest

COPY deploy/railway-entrypoint.sh /usr/local/bin/pluteviral-entrypoint.sh
RUN chmod 0755 /usr/local/bin/pluteviral-entrypoint.sh

EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/pluteviral-entrypoint.sh"]
