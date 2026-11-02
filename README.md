# Clone Anywhere for GitHub 🚀

> Adds a "Clone in …" button to GitHub repository pages that opens any repo in VS Code, Cursor, Windsurf, VSCodium, or VS Code Insiders, or downloads it as a `.zip`. One click, no terminal.

<div align="center">

![Clone Anywhere for GitHub](store-assets/chrome/promo-marquee.png)

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/effhdkonnknoebahhnnciakckbbfmcpi?style=flat-square&logo=googlechrome&logoColor=white&label=Chrome%20Web%20Store)](https://chromewebstore.google.com/detail/clone-anywhere-for-github/effhdkonnknoebahhnnciakckbbfmcpi)
[![Users](https://img.shields.io/chrome-web-store/users/effhdkonnknoebahhnnciakckbbfmcpi?style=flat-square&color=blue&label=Users)](https://chromewebstore.google.com/detail/clone-anywhere-for-github/effhdkonnknoebahhnnciakckbbfmcpi)
[![Rating](https://img.shields.io/chrome-web-store/rating/effhdkonnknoebahhnnciakckbbfmcpi?style=flat-square&color=orange&label=Rating)](https://chromewebstore.google.com/detail/clone-anywhere-for-github/effhdkonnknoebahhnnciakckbbfmcpi)
[![GitHub stars](https://img.shields.io/github/stars/AdamAkhlaq/clone-anywhere-for-github?style=flat-square&logo=github)](https://github.com/AdamAkhlaq/clone-anywhere-for-github/stargazers)
[![MIT License](https://img.shields.io/github/license/AdamAkhlaq/clone-anywhere-for-github?style=flat-square)](LICENSE)

</div>

## 📦 Install

<div align="center">

[![Add to Chrome](https://img.shields.io/badge/Add%20to%20Chrome-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/clone-anywhere-for-github/effhdkonnknoebahhnnciakckbbfmcpi)

</div>

Available for Chrome, Edge, Brave, Opera, and other Chromium-based browsers. Once installed, open any GitHub repository; there's nothing to configure. Prefer to build it yourself? See [Development](#development).

## ✨ Features

- **One-click clone**: open any repo in your editor straight from its GitHub page.
- **Choose your editor**: VS Code, VS Code Insiders, VSCodium, Cursor, or Windsurf, set from the toolbar popup and remembered.
- **Or download a `.zip`**: grab a source archive of the branch you're viewing, no editor needed.
- **Native integration**: the button matches GitHub's UI and survives its single-page navigation.
- **Private by design**: runs only on github.com, with no tracking or data collection.

## 🚀 How it works

1. Open any GitHub repository and click the green **Code** button.

   ![Code dropdown showing "Clone in VS Code" as the first option](.github/images/dropdown.png)

2. Click **"Clone in …"**, the first option, named for your chosen editor. It opens with the clone dialog ready.

Behind the scenes the extension builds a deep link your editor handles automatically, e.g. `vscode://vscode.git/clone?url=https://github.com/owner/repo.git` (or `cursor://…` / `windsurf://…`).

**Choosing your destination.** Click the toolbar icon to pick where repos open. The VS Code-family editors share the same `…/vscode.git/clone` link and differ only by URL scheme. Choose **`.zip`** instead and the button becomes **"Download .zip"**, fetching the same archive as GitHub's own **Download ZIP** for whatever branch, tag, or commit you're viewing.

## 🛠️ Troubleshooting

- **Editor doesn't open?** Make sure it's installed and registered as the handler for its URL scheme (e.g. `vscode://`).
- **Button missing?** Refresh the page, or toggle the extension off and on.

## 🔧 Development

```bash
git clone https://github.com/AdamAkhlaq/clone-anywhere-for-github.git
cd clone-anywhere-for-github
npm install
npm run build      # production build into dist/
npm run dev        # watch mode
npm run package    # build + zip for the Chrome Web Store
```

Requires Node.js 20+ (CI builds on 22). Load the unpacked build from `dist/` via `chrome://extensions` → enable Developer mode → **Load unpacked**.

```text
src/            # TypeScript: content script, popup, and lib/
icons/          # Extension icons
store-assets/   # Store listing assets (see store-assets/README.md)
manifest.json   # Manifest V3; version is stamped from package.json at build
```

Built with TypeScript and Chrome Manifest V3. Firefox support is planned for a future release.

## 🔒 Privacy & permissions

- Runs only on `https://github.com/*` (a content script), with no access to any other site.
- Uses a single permission, `storage`, to remember your chosen editor (synced across your signed-in browsers).
- No accounts, no tracking, no analytics, no data collection. See [PRIVACY.md](PRIVACY.md).

## 🤝 Contributing

Issues and pull requests are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md). Found a bug or have an idea? [Open an issue](https://github.com/AdamAkhlaq/clone-anywhere-for-github/issues) or start a [discussion](https://github.com/AdamAkhlaq/clone-anywhere-for-github/discussions).

## 📄 License

MIT - see [LICENSE](LICENSE).

## ❤️ Support

If this saves you time, consider starring the repo, [leaving a review](https://chromewebstore.google.com/detail/clone-anywhere-for-github/effhdkonnknoebahhnnciakckbbfmcpi), or sponsoring development:

[![GitHub Sponsors](https://img.shields.io/badge/GitHub-Sponsor-ea4aaa?style=flat-square&logo=github&logoColor=white)](https://github.com/sponsors/AdamAkhlaq)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-Donate-ff5e5b?style=flat-square&logo=kofi&logoColor=white)](https://ko-fi.com/adamakhlaq)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy_Me_A_Coffee-Donate-FFDD00?style=flat-square&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/adamakhlaq)
