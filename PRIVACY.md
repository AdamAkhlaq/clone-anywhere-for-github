# Privacy Policy for Clone Anywhere for GitHub

Last updated: **October 31, 2026**

## Overview

Clone Anywhere for GitHub ("the Extension") is committed to protecting your privacy. This privacy policy explains how our extension handles information.

## Information We Collect

**We collect NO personal information.**

The Extension:

- ✅ Does NOT collect any personal data
- ✅ Does NOT track user behavior
- ✅ Does NOT transmit any data to external servers
- ✅ Does NOT use analytics or tracking services

The only thing the Extension stores is a single preference: **which editor you chose to clone into** (e.g. VS Code, Cursor). It is saved through the browser's own extension storage so your choice is remembered and can sync across your signed-in browsers. It contains no personal data and is never sent to us.

## Permissions Used

The Extension requests minimal permissions:

### Content script on `https://github.com/*`

- **Purpose**: Required to inject the clone button on GitHub pages
- **Scope**: Only runs on github.com repository pages; the Extension requests no host permissions
- **Data Access**: None - we only modify the visual interface

### `storage`

- **Purpose**: Remember which editor you chose to clone into
- **Scope**: A single preference value, stored by the browser
- **Data Access**: None - it holds only your editor choice, no personal data

## How It Works

1. When you visit a GitHub repository page, the Extension:

   - Detects you're on a GitHub repository page
   - Adds a "Clone in …" button (for your chosen editor) to the Code dropdown
   - Generates the editor's clone URL (e.g. `vscode://`, `cursor://`) when clicked

2. The Extension does NOT:
   - Read repository content
   - Access your GitHub account
   - Store any information about repositories you visit
   - Communicate with any external services

## Data Security

Since we don't collect any data, there's no data to secure or breach. The Extension operates entirely locally in your browser.

## Changes to This Policy

We may update this privacy policy from time to time. Any changes will be posted on this page with an updated revision date.

## Contact

If you have questions about this privacy policy, please:

- Open an issue on [GitHub](https://github.com/AdamAkhlaq/clone-anywhere-for-github/issues)
- Contact us through the Chrome Web Store

## Your Rights

Under various privacy laws (GDPR, CCPA, etc.), since we don't collect any personal data, there's no personal data to request, modify, or delete.

---

**In summary**: This extension is designed with privacy in mind - we don't collect or transmit any of your data. The only thing it stores is your chosen editor, kept by the browser's own extension storage.
