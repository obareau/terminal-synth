# Terminal-Synth — Build Guide

Build instructions for each platform. Terminal-Synth requires platform-native builds due to Electron architecture constraints.

## Prerequisites (All Platforms)

```bash
# Clone repo
git clone https://github.com/obareau/terminal-synth.git
cd terminal-synth

# Install dependencies
npm install
```

**Minimum versions**:
- Node.js: 18.x or higher
- npm: 8.x or higher

---

## Windows Build

**Minimum requirement**: Windows 10 or higher

### Build Steps

```bash
npm run package
```

**Output**:
- `release/terminal-synth 0.9.0.exe` (Portable executable, ~70 MB)

### Run & Test

```bash
npm run dev                    # Run dev server
./release/terminal-synth\ 0.9.0.exe  # Run built exe
```

### Notes

- Signing is automatic via `signtool.exe` (requires Windows SDK or cert)
- For portable `.exe`, no installation needed—just download & run
- Supports Windows 10+ (x64)

---

## macOS Build

**Minimum requirement**: macOS 12.0 (Monterey) or higher

### Setup

```bash
# Install Xcode Command Line Tools (if not already installed)
xcode-select --install

# Verify Node.js is installed
node --version  # Should be 18+
npm --version   # Should be 8+
```

### Build Steps

```bash
npm run package:mac
```

**Output**:
- `release/terminal-synth-0.9.0.dmg` (Drag & drop installer, ~75 MB)
- `release/terminal-synth-0.9.0.zip` (Portable app bundle)

### Run & Test

```bash
npm run dev                    # Run dev server
open release/terminal-synth-0.9.0.dmg  # Open DMG installer
# OR
open release/terminal-synth-0.9.0.app  # Run extracted app
```

### Notes

- Build **must run on macOS** (code signing requires Xcode)
- Supports both Intel (x64) and Apple Silicon (arm64)
- DMG includes drag-to-Applications installer
- For automated signing, set `CSC_IDENTITY_AUTO_DISCOVERY=false` in env if needed

---

## Linux / Ubuntu Build

**Tested on**: Ubuntu 26.04 LTS

### Setup

```bash
# Update package manager
sudo apt update

# Install build dependencies
sudo apt install -y build-essential libxss1 libgconf-2-4

# Verify Node.js (18+)
node --version
npm --version
```

### Build Steps

```bash
npm run package:linux
```

**Output**:
- `release/terminal-synth-0.9.0.AppImage` (Portable, ~70 MB)
- `release/terminal-synth-0.9.0.deb` (Debian package installer)

### Run & Test

```bash
npm run dev                           # Run dev server

# Run AppImage
chmod +x release/terminal-synth-0.9.0.AppImage
./release/terminal-synth-0.9.0.AppImage

# Or install .deb
sudo dpkg -i release/terminal-synth-0.9.0.deb
terminal-synth  # Run from menu or CLI
```

### Notes

- AppImage is standalone—works on any Linux (no dependencies needed)
- `.deb` requires installation on Ubuntu/Debian systems
- Supports x64 architecture
- For snap build, modify `electron-builder` config in `package.json`

---

## Upload Releases to GitHub

After building on all three platforms:

```bash
# Ensure gh CLI is installed
gh version

# Upload all artifacts to v0.9.0 release
gh release upload v0.9.0 \
  release/terminal-synth\ 0.9.0.exe \
  release/terminal-synth-0.9.0.dmg \
  release/terminal-synth-0.9.0.AppImage \
  release/terminal-synth-0.9.0.deb
```

Or upload individually:

```bash
# Windows
gh release upload v0.9.0 "release/terminal-synth 0.9.0.exe"

# macOS
gh release upload v0.9.0 release/terminal-synth-0.9.0.dmg

# Linux
gh release upload v0.9.0 release/terminal-synth-0.9.0.AppImage
gh release upload v0.9.0 release/terminal-synth-0.9.0.deb
```

---

## Troubleshooting

### Windows
- **signtool.exe not found**: Install Windows SDK or use unsigned build (remove signing in `build.ts`)
- **Release folder already exists**: Delete `release/` and rebuild

### macOS
- **Xcode not installed**: Run `xcode-select --install`
- **Code signing failed**: Check Xcode signing preferences (`xcode-select -p`)
- **DMG not created**: Ensure `release/` is writable: `chmod 755 release/`

### Linux
- **AppImage not executable**: Run `chmod +x release/terminal-synth-*.AppImage`
- **Missing dependencies**: Install: `sudo apt install libfuse2`
- **Snap creation fails**: Remove snap config or ensure `snapcraft` is installed

---

## Configuration

### Modify Build Output

Edit `package.json` `"build"` section:

```json
"build": {
  "appId": "com.robotariis.terminal-synth",
  "productName": "terminal-synth",
  "directories": { "output": "release" },
  "files": ["dist/**", "package.json"]
}
```

### Cross-Platform Notes

- **Cross-compilation not supported**: Must build on target OS (macOS builds only on macOS, Linux on Linux)
- **Code signing**: Required for macOS DMG distribution
- **Auto-updates**: Can be added via `electron-updater` (not currently implemented)

---

## Version Numbering

Build outputs use version from `package.json`:
- Current: `0.9.0`
- Format: `terminal-synth-{version}.{ext}`

To change version:
```json
// package.json
"version": "0.9.0"
```

---

## Development vs Production Builds

```bash
# Development (with debug symbols, not minified)
npm run build

# Production (optimized, minified)
npm run package      # Windows
npm run package:mac  # macOS
npm run package:linux # Linux
```

---

**Last updated**: 2026-06-06
**Tested on**: Windows 11 Pro, macOS 12.5, Ubuntu 26.04 LTS
