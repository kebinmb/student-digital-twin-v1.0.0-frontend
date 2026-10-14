# Development HTTPS Environment Setup Guide: mkcert + Nginx + Docker

**Carlos Hilado Memorial State University (CHMSU) — Student Digital Twin System**  
*Document Version:* 1.0.0  
*Target Environments:* Windows 11, macOS, Linux (Ubuntu/Debian), Android Mobile

---

## 1. Overview & Architectural Motivation

### The Root Cause of Camera Scanner Failure Under HTTP
The CHMSU Student Digital Twin QR Attendance feature uses the browser's Media Capture API:
```javascript
navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
```

Under modern browser specifications (W3C WebRTC & Secure Contexts), **camera access, microphone streaming, and high-accuracy GPS geolocation are strictly restricted to Secure Contexts** (`window.isSecureContext === true`).

When accessing the system over unencrypted HTTP (e.g., `http://localhost`, `http://192.168.x.x`, or `http://hostname`), browsers treat the origin as insecure and evaluate `navigator.mediaDevices` as `undefined` or reject permission outright.

### The Solution: mkcert Local Trusted CA + Nginx SSL Termination
By deploying a local certificate authority via `mkcert` and mounting trusted TLS certificates into the Nginx container, we establish a production-identical HTTPS development environment where:
- `window.isSecureContext` is **TRUE**
- Camera scanning works natively across desktop webcams and mobile device cameras
- Native `BarcodeDetector` and `jsQR` run with full hardware acceleration
- High-accuracy GPS geofencing (&le;50m classroom boundary verification) is permitted
- WebSockets operate securely over `wss://`
- Secure cookies (`COOKIE_SECURE=true`, `SameSite=Lax`) function properly
- OAuth2/OIDC token flows work seamlessly

---

## 2. Infrastructure Architecture

```
                             [ Local Desktop / Android Phone ]
                                            │
                                            │ (HTTPS: 443 / wss:)
                                            ▼
                           ┌─────────────────────────────────┐
                           │   Nginx Container (Port 80/443) │
                           │  - Port 80: HTTP 301 -> HTTPS   │
                           │  - Port 443: TLS 1.2/1.3        │
                           │    (mkcert localhost.pem)       │
                           │  - SPA Fallback (try_files)     │
                           └───────┬─────────────────┬───────┘
                                   │                 │
               (Static Assets)     │                 │ (Reverse Proxy)
                                   ▼                 ▼
             ┌───────────────────────────┐     ┌───────────────────────────┐
             │ Angular 22 Frontend (SPA) │     │ Spring Boot 4.1.1 Backend │
             │ - Route: /analytics/qr... │     │ - REST API: /api/**       │
             │ - Route: /camera-test     │     │ - Auth: /auth/**          │
             │                           │     │ - STOMP WS: /ws, /ws-sockjs│
             │                           │     │ - Actuator: /actuator/**  │
             └───────────────────────────┘     └───────────────────────────┘
```

---

## 3. mkcert Installation

`mkcert` is a zero-configuration tool that generates locally trusted certificates signed by a custom local CA installed directly into your operating system trust store.

### Windows 11 (Recommended)
Open PowerShell as Administrator:
```powershell
# Option A: Windows Package Manager (winget)
winget install FiloSottile.mkcert -e

# Option B: Chocolatey
choco install mkcert

# Option C: Scoop
scoop bucket add extras
scoop install mkcert
```
*Restart your PowerShell session after installation to refresh your system `PATH`.*

### macOS
Using Homebrew:
```bash
brew install mkcert
brew install nss # Required for Firefox support
```

### Linux / WSL (Ubuntu / Debian)
```bash
sudo apt update
sudo apt install libnss3-tools curl
# Download official binary
curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
chmod +x mkcert-v*-linux-amd64
sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert
```

---

## 4. Certificate Generation & Trust Store Setup

### Automated Generation (Windows 11)
Run the automated generation script from the project root:
```powershell
.\docker\certs\generate-certs.ps1
```

The script performs the following actions:
1. Executes `mkcert -install` to install the root CA into the Windows Certificate Store.
2. Dynamically queries all active network adapters to detect local LAN IP addresses (e.g., `10.100.168.114`).
3. Generates `localhost.pem` (public cert) and `localhost-key.pem` (private key) valid for:
   - `localhost`
   - `127.0.0.1`
   - `::1`
   - `student-digital-twin.local`
   - `host.docker.internal`
   - `*.local`
   - Detected LAN IP addresses
4. Automatically exports `android-rootCA.crt` to `docker/certs/` for simple mobile distribution.

### Automated Generation (Linux / macOS / WSL)
```bash
chmod +x ./docker/certs/generate-certs.sh
./docker/certs/generate-certs.sh
```

### Manual Generation
If you prefer running commands manually:
```bash
# 1. Install CA into local trust store
mkcert -install

# 2. Change into the certs directory
cd docker/certs

# 3. Generate certificate and private key (include your LAN IP)
mkcert -cert-file localhost.pem -key-file localhost-key.pem \
  localhost 127.0.0.1 ::1 student-digital-twin.local host.docker.internal "*.local" 10.100.168.114
```

---

## 5. Docker & Nginx Configuration

### Port Exposure & Volume Mount in `docker-compose.prod.yml`
The frontend service mounts the local `docker/certs` directory as read-only:
```yaml
  frontend:
    build:
      context: ./student-digital-twin-v1.0.0-frontend
      dockerfile: Dockerfile
    container_name: sdt-prod-frontend
    restart: always
    depends_on:
      backend:
        condition: service_healthy
    ports:
      - "80:80"     # HTTP listener (automatically 301 redirects to HTTPS)
      - "443:443"   # HTTPS listener (SSL termination with mkcert)
    volumes:
      - ./docker/certs:/etc/nginx/certs:ro
    networks:
      - sdt-internal-network
```

### Nginx Gateway Configuration (`nginx.conf`)
- **Port 80**: Permanent 301 redirect to `https://$host$request_uri`.
- **Port 443**:
  - `ssl_certificate /etc/nginx/certs/localhost.pem;`
  - `ssl_certificate_key /etc/nginx/certs/localhost-key.pem;`
  - `ssl_protocols TLSv1.2 TLSv1.3;`
  - Passes headers: `X-Forwarded-Proto https`, `X-Forwarded-Port 443`.
  - Full reverse proxying for `/api/`, `/auth/`, `/actuator/`, `/ws`, and `/ws-sockjs`.
  - Hardware policy headers: `Permissions-Policy "camera=(self), geolocation=(self), microphone=()"`.

---

## 6. Docker Startup Instructions

### Starting the Environment
From the repository root `student-digital-twin-v1.0.0`:
```bash
# 1. Build and launch all containers in detached mode
docker compose -f docker-compose.prod.yml up -d --build

# 2. Inspect container status
docker compose -f docker-compose.prod.yml ps

# 3. Follow Nginx frontend logs
docker compose -f docker-compose.prod.yml logs -f frontend
```

### Stopping the Environment
```bash
docker compose -f docker-compose.prod.yml down
```

---

## 7. Android Device Mobile Testing Guide

Modern mobile browsers (Chrome / Edge / Firefox on Android) will only allow camera and GPS geofence access when the origin is a trusted HTTPS site. Follow these steps to test on a physical Android phone:

### Step 1: Connect to the Same Wi-Fi Network
Ensure your Android device and development PC are connected to the same local Wi-Fi router.

### Step 2: Transfer the Root CA Certificate to Android
The generation script exported `docker/certs/android-rootCA.crt` (or find `rootCA.pem` via `mkcert -CAROOT`).
Transfer this file to your phone using any convenient method:
- USB file transfer
- Google Drive / OneDrive
- Local HTTP download (e.g. `python -m http.server 8000` in `docker/certs`)

### Step 3: Install CA Certificate into Android Trust Store
> **Important**: You must install the certificate as a **CA Certificate**, not as a standard User credential.

1. Open Android **Settings**.
2. Navigate to **Security & Privacy** &rarr; **More Security Settings** &rarr; **Encryption & credentials**  
   *(On some devices: Settings &rarr; Biometrics and security &rarr; Other security settings &rarr; Install from device storage)*.
3. Select **Install a certificate** &rarr; **CA certificate**.
4. A warning will appear: *"Your private data can be monitored by this CA"*. Tap **Install anyway**.
5. Browse and select `android-rootCA.crt`.
6. Confirm with your phone PIN or fingerprint.

### Step 4: Access the Application
1. In Chrome on your Android phone, navigate to:
   ```
   https://<YOUR-DEV-PC-IP>/camera-test
   # Example: https://10.100.168.114/camera-test
   ```
2. Verify that:
   - The padlock icon in the address bar is **Green / Closed** (no certificate warnings).
   - `window.isSecureContext` displays **TRUE (Secure)**.
   - Click **Rear Camera (Environment)** &rarr; Camera permission prompt appears.
   - Live video stream appears and points at the attendance QR code.
   - QR code is detected instantly via `BarcodeDetector` or `jsQR`.

---

## 8. Diagnostic Test Page (`/camera-test`)

A dedicated development diagnostic route is available at:
```
https://localhost/camera-test
# or
https://<YOUR-LAN-IP>/camera-test
```

### Telemetry & Validation Features
- **Secure Context Check**: Displays `window.isSecureContext` in real-time.
- **Protocol & Hostname**: Displays current `window.location.protocol`, `hostname`, and `port`.
- **MediaDevices Capabilities**: Checks `navigator.mediaDevices` and `navigator.mediaDevices.getUserMedia`.
- **Permissions API State**: Live monitor of site camera permissions (`granted`, `prompt`, `denied`).
- **Interactive Camera Test**: Toggle between Rear Camera (`environment`) and Front Camera (`user`).
- **Live QR Decoding Stream**: Real-time decode count, timestamp, and payload inspector using `BarcodeDetector` (hardware) and `jsQR` (fallback).
- **Zero Secrets**: Contains no tokens, environment variables, or private API credentials.

---

## 9. Cookie & OIDC Configuration

In `.env.prod`:
```bash
# Set to 'true' for local HTTPS testing; 'false' if running under plain HTTP
COOKIE_SECURE=true

# 'Lax' is the industry standard for first-party same-site session/refresh cookies
COOKIE_SAME_SITE=Lax
```

- When `COOKIE_SECURE=true`, the Spring Boot backend emits `Set-Cookie: REFRESH_TOKEN=...; Secure; SameSite=Lax`. Browsers accept this cookie only under HTTPS connections.
- Spring Boot's `server.forward-headers-strategy: framework` accurately detects `X-Forwarded-Proto: https` from Nginx, ensuring all redirect URIs and OIDC callback validations preserve the HTTPS protocol.

---

## 10. Troubleshooting Guide

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **`NET::ERR_CERT_AUTHORITY_INVALID` in Desktop Chrome** | Root CA is not installed in the Windows certificate store. | Run `mkcert -install` in PowerShell, then restart Chrome (`chrome://restart`). |
| **`SEC_ERROR_UNKNOWN_ISSUER` in Firefox** | Firefox maintains its own certificate store separate from Windows. | Install `nss` or run `mkcert -install` with Firefox closed so mkcert can patch the Firefox profile store. |
| **Android shows "Not Secure" warning** | The certificate was installed as a "VPN/App" credential instead of a "CA Certificate", or the LAN IP was omitted from the SAN list. | Re-run `generate-certs.ps1` with your phone's Wi-Fi LAN IP included. Follow Step 3 in the Android guide to install strictly as a **CA Certificate**. |
| **Port 443 is already in use** | Local IIS, VMware, or Skype is binding to port 443 on the host. | Identify the process using `Get-Process -Id (Get-NetTCPConnection -LocalPort 443).OwningProcess` and stop it, or re-map Nginx port to `8443:443` in `docker-compose.prod.yml`. |
| **WebSocket disconnects (`wss://`)** | Reverse proxy missing Upgrade headers. | Verify `proxy_set_header Upgrade $http_upgrade;` and `proxy_set_header Connection "Upgrade";` in `nginx.conf`. |
| **Camera shows black screen on mobile** | Another app or tab is holding a lock on the camera hardware. | Force close background camera apps and refresh the browser tab. |
