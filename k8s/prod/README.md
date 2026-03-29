# MTM Production Kubernetes IaC

These manifests deploy the MTM frontend to the `epikpay-prod` namespace.

## Managed resources

- `namespace.yaml`
- `deployment.yaml`
- `service.yaml`
- `kustomization.yaml`

## Deployment model

- Namespace: `epikpay-prod`
- Workload: `Deployment/mtm-web`
- Service: `ClusterIP`
- Ingress: `portal.epikx.co.tz`
- Container port: `80`
- Health endpoint: `/index.html`
- Registry: `ghcr.io/<owner>/mtm`

## Required GitHub Secrets

Infrastructure:

- `KUBE_CONFIG_PROD`
- `GHCR_USER`
- `GHCR_TOKEN`

MTM build configuration:

- `PROD_VITE_API_URL`
- `PROD_VITE_GATEWAY_API_URL`
- `PROD_VITE_TENANT`

For the recommended internal-only topology, leave `PROD_VITE_API_URL` and `PROD_VITE_GATEWAY_API_URL` empty so the browser uses same-origin `/api` and `/gw`, and Nginx proxies those paths to in-cluster services.

## Rollout

Push to the `prod` branch or run the `MTM Prod Deploy` workflow manually. The workflow:

1. Builds and pushes the image to GHCR.
2. Applies the namespace and manifests.
3. Creates or updates the GHCR pull secret.
4. Sets the deployment image to the current commit tag.
5. Waits for rollout and smoke-tests `/index.html` through port-forward.

## DNS and ingress

Before the ingress becomes active, install `ingress-nginx` and `cert-manager`, apply the shared `ClusterIssuer`, then point `portal.epikx.co.tz` to the ingress external IP.
