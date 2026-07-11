# Packaging Arch/Garuda (PKGBUILD)

Paquet pacman natif, pas encore publié sur l'AUR — usage local.

## Build & install

```bash
cd packaging/archlinux
makepkg -si
```

`makepkg` télécharge le tarball source de la release GitHub taggée (`v2.1.0`),
build l'app (`npm ci` + `tsc` + `esbuild` + `electron-builder --linux dir`),
puis installe :

- `/usr/lib/terminal-synth/` — app Electron packagée (unpacked, Electron embarqué)
- `/usr/bin/terminal-synth` — symlink de lancement
- `/usr/share/applications/terminal-synth.desktop` — entrée menu
- `/usr/share/icons/hicolor/256x256/apps/terminal-synth.png` — icône (placeholder,
  généré depuis les couleurs terminal de l'app — à remplacer par un vrai logo
  si besoin)

## Mettre à jour pour une nouvelle version

1. Bump `pkgver` (et `pkgrel=1` si nouvelle version, incrémenté sinon)
2. Le tag `v$pkgver` doit exister sur GitHub (`git tag` + `git push origin vX.Y.Z`)
3. `updpkgsums` (package `pacman-contrib`) pour recalculer le sha256 du tarball
4. `makepkg --printsrcinfo > .SRCINFO`

## Notes

- `depends` couvre les libs runtime standards des apps Electron sur Arch
  (gtk3, nss, libxss, libxtst, alsa-lib, at-spi2-core, libdrm, mesa). À ajuster
  si `makepkg -si` signale une lib manquante sur ta install.
- `options=('!strip')` : évite que pacman ne strip les binaires Electron
  précompilés (casse sinon).
- Pas de dépendance sur le paquet `electron` officiel d'Arch — l'app embarque
  sa propre version d'Electron via `electron-builder`, donc pas de risque de
  décalage de version.
