# mTM Production Deployment

This repository is configured to auto-deploy on every push to `main` using:

- Workflow: `.github/workflows/deploy-main.yml`
- Server: `45.33.54.133`
- Web root: `/var/www/bo.epikx.co.tz`
- Public domain: `bo.epikx.co.tz`
- Backend (gateway) URL at build time: `https://digital.epikx.co.tz`

## 1) Required GitHub Secrets

Set these repository secrets before running the workflow:

- `DEPLOY_SSH_USER`: SSH user on `45.33.54.133`
- `DEPLOY_SSH_KEY`: Private key for that user
- `VITE_API_URL` (optional): Overrides default `https://fineract.epikx.co.tz/fineract-provider`
- `VITE_GATEWAY_API_URL` (optional): Overrides default `https://digital.epikx.co.tz`
- `VITE_TENANT` (optional): Overrides default `default`

## 2) One-Time Server Setup

1. Copy the nginx vhost template:
   - `deploy/nginx/bo.epikx.co.tz.conf` -> `/etc/nginx/sites-available/bo.epikx.co.tz.conf`
2. Enable site:
   - `sudo ln -s /etc/nginx/sites-available/bo.epikx.co.tz.conf /etc/nginx/sites-enabled/bo.epikx.co.tz.conf`
3. Test and reload nginx:
   - `sudo nginx -t && sudo systemctl reload nginx`
4. Ensure DNS `A` record points `bo.epikx.co.tz` to `45.33.54.133`.
5. Issue TLS certificate (recommended):
   - `sudo certbot --nginx -d bo.epikx.co.tz`

## 3) Deployment Flow

On `main` push:

1. Build frontend with production env vars.
2. Package `dist` as `mtm-dist.tar.gz`.
3. Upload archive to server `/tmp`.
4. Extract to `/var/www/bo.epikx.co.tz`.
5. Reload nginx.
