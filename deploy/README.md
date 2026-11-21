# PluteViral AI — private renderer deployment

This deployment recipe runs the inherited MoneyPrinterTurbo API **on the host loopback only**. It does **not** expose it directly to phones over the public internet.

## Start locally on a server

1. Provision a Linux VM with Docker, enough disk space for media, and adequate RAM/CPU for rendering.
2. Copy `config.example.toml` to `config.toml`. The existing root `.gitignore` excludes config.toml and storage from git.
3. In the private config file, configure a **nonempty** `[app] api_key`, an LLM provider, a footage source (such as Pexels), and the supported voice and subtitle requirements. Never commit provider keys.
4. Run `mkdir -p storage && docker compose -f deploy/pluteviral.compose.yml up -d`.
5. Confirm locally that `http://127.0.0.1:8080/docs` responds and a request to `/api/v1/tasks` without the configured API key receives 401.
6. For private mobile testing, provision an **authenticated HTTPS reverse proxy** (for example Caddy/Nginx with valid certificates, IP restrictions or additional access controls). Route the public HTTPS origin to the host loopback 8080 only after controlling who can submit jobs.
7. Enter your **HTTPS server origin** and API key on the phone's PluteViral AI Settings screen. Verify script creation and a complete MP4 render on the device.

## Before launch

- This MVP sends a service API key directly from the testing device, so the server must stay **private**. Do not distribute the app to arbitrary consumers with a shared master key. Production needs a Plutevia-controlled authenticated gateway, per-user quotas, job ownership checks, scoped artifact-download authorisation, abuse limits and cost protections.
- Rendering requires external media, generation and TTS services and can consume metered API credits. Choose conservative concurrency, request budgets, and a private test environment.
- Generated video output must be checked for content rights, accuracy and platform policies.
- Native iOS/Android builds, device tests, store credentials, privacy disclosures and approvals are separate.
- This compose uses the upstream published container. Pin a tested immutable image digest before production rather than tracking `:latest`.
- Mobile downloads currently require same-origin HTTPS URLs; configure MoneyPrinterTurbo's `[app] endpoint` to match the HTTPS gateway as needed.

No server or live processing has been provisioned by this file alone.
