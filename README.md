# iPad as Display — Open-Source Windows Sidecar

[![Tests](https://github.com/LRF2/ipad-as-display/actions/workflows/test.yml/badge.svg)](https://github.com/LRF2/ipad-as-display/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Use your iPad as a wireless second monitor on Windows — an open-source alternative to Apple Sidecar. Extends your desktop to the iPad over Wi-Fi or USB, optimized for classroom use.

## Current State

The streaming and touch input pipeline is fully working: the iPad receives a live feed of a Windows monitor and sends touch events back as mouse input, behaving like a Sidecar display.

**What works today:**
- The iPad displays any Windows monitor in real time (Wi-Fi or USB)
- Touch input on the iPad controls the mouse on that monitor
- PIN pairing, persistent settings, reconnect handling, PWA install

**What is still missing:**
- **Guided Virtual Display Driver setup** — to use the iPad as a true *extend* monitor (not just mirroring an existing one), Windows needs a virtual display driver that creates a new monitor slot. The driver itself exists ([Virtual Display Driver by itsmikethetech](https://github.com/itsmikethetech/Virtual-Display-Driver)), but the app does not yet walk you through installing and configuring it. You currently have to do this manually following the steps in the setup section below.

Until that wizard is built, the app works perfectly if you already have a virtual display set up, or if you simply want to mirror/stream an existing monitor to the iPad.

## Architecture

```text
Windows PC                              iPad (Safari / PWA)
Virtual Monitor #2                      Opens http://PC-IP:8080
dxcam/mss -> JPEG capture               MJPEG stream -> <img>
FastAPI /stream ----------------------> Fullscreen display
FastAPI /ws <-------------------------- Touch events
FastAPI /settings <-------------------> Live settings
FastAPI /pair <------------------------ PIN pairing
```

## Project Structure

```text
server/main.py              FastAPI app entrypoint and startup banner
server/config.py            defaults, env overrides, config.local.json persistence
server/state.py             shared frame, stream, websocket, and runtime config state
server/auth.py              token checks, pairing PIN, pairing rate limit
server/monitors.py          monitor discovery and resolution advisory
server/qr.py                dependency-free QR SVG generation
server/capture/             dxcam/mss capture loops and JPEG publishing
server/routes/              pairing, settings/info, stream, and websocket routes
client/src/App.jsx          React orchestration
client/src/api.js           API and URL helpers
client/src/hooks/           pairing, settings, viewport, stream, and websocket state
client/src/components/      pairing screen, display surface, HUD, settings, overlays
client/src/utils/           display math and UI helpers
```

## Current Build - MJPEG

- Local LAN display streaming
- DXGI capture with `dxcam` when available, `mss` fallback otherwise
- PIN pairing with saved iPad token
- Touch input to mouse mapping
- Persistent local settings
- Fit, Fill, Stretch, and Native display modes
- Stream/WebSocket reconnect handling
- PWA installable to iPad home screen

WebRTC/H.264 is intentionally deferred until the MJPEG version is dependable.

## Requirements

- Windows 10/11
- Python 3.10+
- Node.js 18+
- iPad and PC on the same Wi-Fi network, or connected through USB networking

## Step 1 - Install Virtual Display

For true extend mode, not mirror mode, install a virtual display driver.

Recommended: Virtual Display Driver by itsmikethetech  
https://github.com/itsmikethetech/Virtual-Display-Driver

After installing:

1. Open Windows Display Settings.
2. Set the new monitor to Extend mode.
3. Arrange it beside your main display.
4. Pick an iPad-shaped resolution when possible, such as `1600x1200`, `1920x1440`, or `2048x1536`.

## Step 2 - First Time Setup

Double-click `setup_and_run.bat`.

This installs Python packages, installs Node dependencies, builds the React PWA, and starts the server.

## Step 3 - Connect the iPad

### Option A — Wi-Fi (easiest)

iPad and PC must be on the same Wi-Fi network.

1. The server prints a Network URL and a QR page URL.
2. Open the QR page on your PC (`http://localhost:8080/pair-qr`) and scan it with the iPad camera.
3. The iPad opens the app with the PIN prefilled and pairs automatically.

You can also type the Network URL directly into Safari on the iPad.

### Option B — USB-C (lower latency, no Wi-Fi needed)

USB routes traffic through the cable rather than the router.

**One-time setup (do this once):**

1. Install **Apple Devices** from the Microsoft Store (search "Apple Devices"). This installs Apple's USB network driver on Windows. If you already have iTunes installed, the driver is already there.
2. Plug the iPad into the PC with a USB-C cable.
3. Unlock the iPad — a **"Trust This Computer?"** prompt will appear. Tap **Trust** and enter your passcode.

**Each time you connect:**

1. Plug in the cable and unlock the iPad.
2. Restart the server (`run.bat`). A **USB:** line will appear in the banner, e.g.:
   ```
   USB:        http://169.254.x.x:8080  ← iPad over cable
   ```
3. Open that URL on the iPad.

> **No "Personal Hotspot" needed.** Personal Hotspot is only available on iPads with cellular (a SIM card slot). The Apple Devices driver works on all iPads including Wi-Fi only models.

**How to confirm USB is active:** the server log will show:
```
[ws] iPad connected via USB (169.254.x.x). Active: 1
```
For Wi-Fi it shows `via Wi-Fi/LAN` with your local IP instead.

The iPad stores a session token in Safari local storage after pairing. Existing `?token=...` URLs still work.

## In-App Settings

Tap `Settings` in the top HUD to change:

- Screen / monitor
- View size
- Frame rate
- Image quality
- Resolution scale
- Touch input lock
- Touch cursor overlay

View modes:

- `Fit`: default, shows the whole monitor using as much iPad space as possible.
- `Fill`: removes black bars by cropping edges.
- `Stretch`: fills the iPad exactly, with possible distortion.
- `Native`: shows unscaled pixels and may leave black margins.

The Resolution Advisor compares the selected monitor shape with the iPad viewport and recommends iPad-friendly virtual display resolutions.

## Persistent Settings

Settings changed in the UI are saved to:

```text
server/config.local.json
```

That file is ignored by git. Startup precedence is:

1. built-in defaults
2. `server/config.local.json`
3. environment variables

Environment variables are still useful for forcing startup defaults:

```bat
set IPAD_DISPLAY_MONITOR=2
set IPAD_DISPLAY_FPS=30
set IPAD_DISPLAY_JPEG_QUALITY=75
set IPAD_DISPLAY_SCALE=1.0
set IPAD_DISPLAY_VIEW_MODE=fit
set IPAD_DISPLAY_INPUT_ENABLED=true
set IPAD_DISPLAY_PORT=8080
```

## Classroom Defaults

Recommended starting point:

- FPS: `30`
- Quality: `75`
- Scale: `1.0`
- View mode: `Fit`
- Touch input: enabled
- Touch cursor: enabled

Use `60fps` only on strong Wi-Fi. Lower quality to `60-70` if classroom Wi-Fi is choppy.

## Understanding the Startup Banner

When the server starts it prints all available addresses:

```
  Local:       http://localhost:8080          ← open on this PC only
  Network:     http://192.168.1.87:8080       ← Wi-Fi, use this on the iPad
               http://172.20.10.1:8080        ← USB tethering (only appears when plugged in)
  VPN/VM:      100.119.40.48, 192.168.96.1   ← Tailscale / virtual adapters, ignore these
```

- **Local** — only works in a browser on this PC, not on the iPad.
- **Network** — use one of these on the iPad. If there is only one, it is your Wi-Fi address. If there are two, the second one (`172.20.10.x`) is USB.
- **VPN/VM** — Tailscale, VMware, VirtualBox, and similar. The iPad cannot reach these unless it is also on the same VPN.

## Troubleshooting

**The iPad shows black margins**  
Use `Fit` to see the whole screen, or `Fill` to remove black bars. For the best result, change the virtual monitor to an iPad-shaped resolution such as `1920x1440`.

**Touch input is off**  
Confirm the selected monitor in Settings matches the streamed display. If you use `Fill`, remember that edges may be cropped.

**Pairing fails**  
Use the current PIN printed by the running server. After several failed attempts, wait one minute.

**Connection drops in class**  
Use the `Reconnect` HUD button. The app also retries the MJPEG stream and WebSocket automatically.

**No USB address appears in the banner after plugging in**  
1. Make sure **Apple Devices** (or iTunes) is installed — this provides the USB network driver.  
2. Unlock the iPad after plugging in. If a **"Trust This Computer?"** prompt appears, tap **Trust**.  
3. Restart the server after plugging in; the USB address is only detected at startup.  
4. Open **Device Manager → Network Adapters** and check for **Apple Mobile Device Ethernet**. If it is missing or shows a warning icon, reinstall Apple Devices.

**Connected via USB but the log still says Wi-Fi/LAN**  
The iPad reached the server over Wi-Fi instead of the cable. Open the **USB:** address shown in the banner (typically `169.254.x.x`) rather than the Network address.

**Can't connect**  
Windows Firewall may be blocking port 8080. Run this from an elevated prompt:

```bat
netsh advfirewall firewall add rule name="iPad Display" dir=in action=allow protocol=TCP localport=8080
```
