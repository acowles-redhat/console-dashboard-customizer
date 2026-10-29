# Console Dashboard Customizer

An OpenShift ConsolePlugin that makes the overview dashboard tiles resizable and sets sensible default heights so they align evenly across columns.

## Features

- **Resizable tiles** — each dashboard card has a drag handle (bottom-left corner) for vertical resizing
- **Persistent sizing** — resized heights are saved to browser localStorage and restored on return
- **Tuned defaults** — tiles load at heights that align their bottoms and avoid overlapping the Lightspeed icon
- **Customizable CSS** — styles are served from a ConfigMap, editable without rebuilding the image

## Quick start (using the pre-built image)

### Prerequisites

- `oc` CLI logged into your OpenShift 5.0+ cluster as a cluster-admin
- The image `quay.io/rh-ee-acowles/console-dashboard-customizer:latest` must be accessible from your cluster (it's public on quay.io)

### 1. Create the namespace

```bash
oc create namespace dashboard-customizer
```

### 2. Apply the manifests

```bash
oc apply -f deploy/01-namespace.yaml
oc apply -f deploy/02-configmap.yaml
oc apply -f deploy/03-deployment.yaml
oc apply -f deploy/04-service.yaml
oc apply -f deploy/05-consoleplugin.yaml
```

Or all at once:

```bash
oc apply -f deploy/
```

### 3. Enable the plugin

```bash
oc patch console.operator.openshift.io cluster \
  --type=json \
  -p='[{"op":"add","path":"/spec/plugins/-","value":"dashboard-customizer"}]'
```

### 4. Verify

```bash
oc get pods -n dashboard-customizer
```

Wait for the pod to show `1/1 Running`, then hard-refresh the OpenShift console (Ctrl+Shift+R). The Home > Overview tiles should now have resize handles and load at the tuned default heights.

## Building from source

If you want to build your own image (e.g., to customize defaults or push to a different registry):

### Prerequisites

- Node.js 18+
- npm
- podman or docker
- A container registry you can push to

### Build steps

```bash
# Install dependencies
npm install

# Build the webpack bundle
npm run build

# Build the container image (replace the image URL with your own)
podman build -t quay.io/YOUR_USER/console-dashboard-customizer:latest -f Containerfile .

# Push to your registry
podman login quay.io
podman push quay.io/YOUR_USER/console-dashboard-customizer:latest
```

Then update `deploy/03-deployment.yaml` to reference your image URL and follow the Quick Start steps above.

## Customizing tile heights

Edit the ConfigMap to change default tile heights:

```bash
oc edit configmap dashboard-customizer-styles -n dashboard-customizer
```

After editing, restart the pod and hard-refresh the browser:

```bash
oc rollout restart deployment/dashboard-customizer -n dashboard-customizer
```

The current defaults are:

| Tile | Default height |
|------|---------------|
| Details | 621px |
| Cluster inventory | 297px |
| Status | 321px |
| Cluster utilization | 596px |
| Activity | 937px |

## Resetting saved sizes

If you've manually resized tiles and want to return to the CSS defaults, run this in the browser console (F12):

```javascript
localStorage.removeItem('dashboard-customizer-heights')
```

Then hard-refresh the page (Ctrl+Shift+R).

## Uninstalling

```bash
# Remove the plugin from the console
oc patch console.operator.openshift.io cluster \
  --type=json \
  -p='[{"op":"test","path":"/spec/plugins","value":"dashboard-customizer"},{"op":"remove","path":"/spec/plugins","value":"dashboard-customizer"}]'

# If the above doesn't work, edit manually:
# oc edit console.operator.openshift.io cluster
# Remove "dashboard-customizer" from spec.plugins list

# Delete all resources
oc delete -f deploy/

# Or delete the namespace (removes everything in it)
oc delete namespace dashboard-customizer
```

## How it works

1. The plugin registers a `console.flag/hookProvider` extension that loads on every console page
2. The hook injects a `<link>` tag that loads `custom-styles.css` from the plugin's nginx backend
3. The CSS file is served from a ConfigMap mounted into the nginx container
4. JavaScript in the hook also handles saving/restoring tile heights via `localStorage`
5. TLS is provided automatically by the OpenShift service-ca operator

## File structure

```
├── src/
│   └── cssLoader.ts          # Plugin entry: CSS injection + resize persistence
├── deploy/
│   ├── 01-namespace.yaml     # Namespace
│   ├── 02-configmap.yaml     # CSS styles (editable)
│   ├── 03-deployment.yaml    # Nginx pod serving plugin assets
│   ├── 04-service.yaml       # Service with service-ca TLS annotation
│   └── 05-consoleplugin.yaml # ConsolePlugin registration
├── console-extensions.json   # Plugin extension declarations
├── webpack.config.js         # Webpack + Module Federation config
├── nginx.conf                # Nginx config (HTTPS on port 9443)
├── Containerfile             # Multi-stage build (Node + nginx)
├── package.json              # Dependencies + plugin metadata
└── tsconfig.json             # TypeScript config
```
