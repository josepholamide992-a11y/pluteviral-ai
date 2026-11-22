# Railway setup for PluteViral AI

This builds a small wrapper on the prebuilt MoneyPrinterTurbo image. It does NOT configure hosting by itself.

## Requirements

- Connect Railway and GitHub to your own Railway account.
- A Railway plan with sufficient CPU, RAM, storage and billing controls.
- A configured, valid MoneyPrinterTurbo `config.toml` kept privately.
- A real AI provider and footage source, for example a Pexels key, with budget restrictions.

## Secure secrets

1. Copy `config.example.toml` from the repository root to a PRIVATE `config.toml`. Fill in the documented fields.
2. Set `listen_host = "0.0.0.0"` and `listen_port = 8080`.
3. Under `[app]`, set a newly generated `api_key` of at least 24 random characters. Never use an empty key.
4. Base64 encode the full `config.toml` locally. Add it in Railway service Variables as the **secret** `PLUTEVIRAL_MPT_CONFIG_B64`. Do not paste secrets in ChatGPT, commits, logs or a public repository. The deployment entrypoint decodes the config in the container at startup.
5. Create a GitHub-backed Railway service from `josepholamide992-a11y/pluteviral-ai`, branch `main`, root directory `/`. The repository's `railway.json` selects the lightweight `deploy/railway.Dockerfile` instead of the large upstream Dockerfile.
6. Set port 8080; add a persistent volume at `/MoneyPrinterTurbo/storage` if you want outputs to survive redeploys. Consider limiting request concurrency because rendering can use significant compute.
7. **Do not make it public yet.** The bundled API uses a single shared x-api-key, which is unsuitable for a multi-user public SaaS without a server-side gateway, quotas and per-user permissions.
8. For controlled device testing only, configure HTTPS ingress with access controls and use the mobile app's Settings → Test server connection. A successful connection does not prove video rendering; first render one short, approved sample.

## Billing and security

- Railway is usage-based. Inspect your actual plan, current credits and hard usage limits before deploying.
- This starter refuses to run if the config is missing, invalid or has an empty/short API key, or binds to a different port.
- Image tag `:latest` is convenient only for an initial test; pin a verified digest for production.
- The output volume and AI/media API charges are separate concerns.
- No Railway account has been connected or service deployed merely by adding these files.

Refer to `deploy/README.md` for the generic private Docker test path.
