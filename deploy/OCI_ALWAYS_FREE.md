# Oracle Always Free ARM64 deployment — evaluation only

Oracle Cloud's Always Free Arm entitlement may offer enough RAM for a private experimental video renderer, subject to availability, account eligibility and quota. See:
https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm

1. Register or use a verified Oracle Cloud Free Tier account. Do not upgrade to Pay As You Go without explicitly deciding to accept charges.
2. Select only an **Always Free eligible** VM.Standard.A1.Flex VM, within current published tenancy allowances (2 OCPUs and 12 GB RAM total, as checked November 2026). If no capacity is available, stop rather than create a paid instance.
3. Install Docker on the VM; inspect available image architecture first using `docker manifest inspect ghcr.io/harry0703/moneyprinterturbo:latest`. Verify that the selected image provides `linux/arm64` before pulling. The compose uses `:latest` for testing; after successful verification, pin a real immutable image digest for production.
4. In a private checkout, copy `config.example.toml` to `config.toml`. Configure `listen_host = "0.0.0.0"`, `listen_port = 8080`, a long random `[app] api_key`, a compatible AI text model and footage provider. Never commit keys.
5. Create `storage/`, then run `docker compose -f deploy/oci-arm64.compose.yml pull` and `docker compose -f deploy/oci-arm64.compose.yml up -d`.
6. The service binds on **127.0.0.1:8080 only**. Do not open that port to the internet. Add a separately authenticated HTTPS gateway before connecting your personal mobile device.
7. Keep render concurrency low, monitor RAM, CPU, disk usage and AI/media provider billing. Host-free does not mean AI-free.
8. Verify one finished MP4 on iOS or Android before releasing the app.

We can edit the GitHub repository through its connected integration and run Playwright locally instead of using a paid browser agent. No infrastructure has been provisioned by this document.
