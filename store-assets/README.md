# Store assets

Source templates and rendered images for the extension's icon and store listings. Everything here is generated from HTML by [`render.sh`](./render.sh): edit the `.html` source, re-render, and the `.png` outputs update.

## Layout

```
store-assets/
├── render.sh                 # regenerates every PNG below from its HTML source
├── icons/                    # cross-platform, used by any store or platform
│   ├── icon.html             #   source: the git-branch mark on a rounded tile
│   └── icon{16,32,48,96,128}.png
└── chrome/                   # Chrome Web Store listing only
    ├── promo-marquee.{html,png}   # marquee promo tile, 1400×560
    ├── promo-small.{html,png}     # small promo tile, 440×280
    ├── screenshot.html            # shared screenshot template (?v=<target>)
    └── screenshot-{vscode,cursor,windsurf,zip,popup}.png   # 1280×800
```

Platform-specific listing assets live in a folder named for their store (`chrome/`). Cross-platform assets that any store can reuse live at the top level (`icons/`). When we add a Firefox listing, its AMO-specific assets go in a new `firefox/` folder alongside `chrome/`.

## Icons

`icons/icon.html` is the single source of truth for the extension mark. `render.sh` renders it once and downsamples to all five sizes, then copies them into the repo's top-level [`../icons/`](../icons), the icons the extension actually ships (referenced by `manifest.json`). The two folders are kept byte-identical so the marketing icon and the shipped icon never drift.

## Regenerating

```sh
./store-assets/render.sh
```

Requires Google Chrome (headless rendering) and macOS `sips` (downscaling). Each asset is supersampled at 2-4× then scaled down so vector edges and text stay crisp at the exact pixel dimensions each store requires.
