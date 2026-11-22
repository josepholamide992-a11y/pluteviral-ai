# Oracle Cloud Always Free deployment evaluation (NO COST PROVISIONED)

As of 22 November 2026, OCI Always Free Ampere A1 capacity for free-only tenants is up to **2 OCPUs and 12 GB RAM in total** across the tenancy; Oracle has adjusted older 4/24 limits. An Arm VM may be much more suitable than 512 MB / 1 GB free service plans for MoneyPrinterTurbo. Availability is not guaranteed. Oracle requires account identity/payment-card verification. The Always Free offer applies only to eligible resources in your home region.

Official source: https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm

## Safety-first path

1. Create and verify your own Oracle Cloud Free Tier account through Oracle. Do **not** upgrade to Pay As You Go unless you intentionally accept metered charges.
2. In Compute, check for an explicitly **Always Free eligible** VM.Standard.A1.Flex configuration. Stay at or below 2 OCPUs / 12 GB aggregate RAM. If capacity is unavailable, **do not** switch to a paid instance automatically.
3. **Before installation**, test that a compatible arm64 MoneyPrinterTurbo container image exists. The upstream release image may be x86-64 only. If `docker manifest inspect ghcr.io/harry0703/moneyprinterturbo:latest` does not list `linux/arm64`, a compatible source build or dependency changes will be required; do not try to run an amd64 image on the small Arm VM as though it were native.
4. Keep MoneyPrinterTurbo's API port 8080 **bound to loopback**, not open to the Internet. Store keys and service configuration only on the VM and outside version control. The default unprotected API must never be exposed.
5. Configure HTTPS and an authenticated, rate-limited access gateway before connecting any mobile device. A single shared `x-api-key` is only suitable for private testing, not external customers.
6. Restrict the generation concurrency to one small task and monitor CPU, RAM and storage. The stock-footage and LLM provider quotas may have costs **even if hosting is free**.
7. Validate one short video and the final MP4 from a physical device before planning app-store distribution.

## Automation without TinyFish

- Repository changes: use the connected **GitHub** app directly. No browser automation needed.
- UI checks: run the repository's Playwright tests locally (see `mobile/PLAYWRIGHT.md`).
- Future scheduled content workflows: Make.com Free provides 1,000 monthly credits and 2 active scenarios. It orchestrates APIs and content calendars, but **does not provide enough compute to run the MoneyPrinterTurbo video renderer**.

## Other genuinely free or credit-based options

- Modal Starter: $30/month included compute, but usage beyond credits can be billed. Require a verified workspace spending limit before deployment: https://modal.com/pricing
- Render and Koyeb Free: around 512 MB RAM; unsuitable for full CPU video rendering.
- Hugging Face CPU Basic: although the listed CPU hardware rate is $0, creating a Docker or Gradio Space now requires a paid subscription: https://huggingface.co/docs/hub/spaces-overview
- Own desktop/laptop: no cloud hosting bill while switched on; requires available CPU/RAM, private networking and acceptable media/AI credentials.

No account credentials or spending authorisations are included in this repository.
