# Contributing to iPad as Display

Thanks for your interest in contributing! This guide gets you from zero to a working dev environment.

## Prerequisites

- Windows 10 or 11 (the server uses DXGI/DirectX APIs — Linux/macOS are not supported)
- Python 3.10 or newer
- Node.js 18 or newer
- An iPad and a USB-C cable (optional, but useful for testing)

## Clone and Set Up

```bat
git clone https://github.com/LRF2/ipad-as-display.git
cd ipad-as-display
```

### Backend

```bat
python -m venv .venv
.venv\Scripts\activate
pip install -r server/requirements.txt
```

### Frontend

```bat
cd client
npm install
npm run build
cd ..
```

## Running in Development

Start the server:

```bat
python server/main.py
```

For frontend hot-reload during UI work, run the Vite dev server in a second terminal:

```bat
cd client
npm run dev
```

The Vite dev server proxies API requests to the FastAPI backend, so both can run side by side.

## Running Tests

```bat
python -m pytest server/tests/ -q
```

Tests cover auth, config, and settings. No display hardware is required to run them.

## Code Style

No linter or formatter is enforced. Follow the style of the file you are editing: existing naming conventions, import order, and comment density.

## Submitting a Pull Request

1. Fork the repository and create a branch from `main`.
2. Make your change and add or update tests where appropriate.
3. If you changed the UI, include a screenshot or short screen recording.
4. Open a PR with a clear description of what you changed and why.

For larger changes (new features, protocol changes, architecture shifts) it is worth opening an issue first to discuss the approach before writing code.
