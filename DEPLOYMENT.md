# mTM Production Deployment

This repository now publishes a Docker image for production Compose deployments.

- Workflow: `.github/workflows/prod-image.yml`
- Trigger: push or merge to `prod`
- Published image: `ghcr.io/<repo-owner>/mtm:prod`

The runtime Nginx config for Compose is `nginx.compose.conf`. It proxies:

- `/gw/*` -> `getaway:8084`
- `/api/*` -> `fineract:8080/fineract-provider/*`

## Required GitHub Secrets

- `GHCR_USER`
- `GHCR_TOKEN`

## Recommended GitHub Variables

- `PROD_VITE_TENANT`

## Flow

On `prod` push:

1. Build the MTM Docker image.
2. Push `ghcr.io/<repo-owner>/mtm:prod`.
3. Push `ghcr.io/<repo-owner>/mtm:prod-<sha>`.

The backend Compose deployment should reference that image through `PROD_MTM_IMAGE` or rely on the default `ghcr.io/<repo-owner>/mtm:prod`.
