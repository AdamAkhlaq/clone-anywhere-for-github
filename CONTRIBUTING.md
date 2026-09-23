# Contributing to Clone Anywhere for GitHub

Thank you for your interest in contributing! We welcome contributions from the community.

## 🚀 Quick Start

1. **Star the repository** ⭐ to show your support
2. **Fork the repository** to your GitHub account
3. **Clone your fork** locally
4. **Create a feature branch** from `main`
5. **Make your changes** with clear commit messages
6. **Test thoroughly** in Chrome/Chromium browsers
7. **Submit a pull request**

## 🛠️ Development Setup

### Prerequisites

- Node.js 16+ and npm
- Chrome browser for testing
- VS Code (recommended)
- Basic TypeScript knowledge

### Local Development

```bash
# Clone your fork
git clone https://github.com/your-username/clone-anywhere-for-github.git
cd clone-anywhere-for-github

# Install dependencies
npm install

# Start development mode
npm run dev

# Build for testing
npm run build

# Package for distribution
npm run package
```

### Testing Your Changes

1. **Build the extension**: `npm run build`
2. **Open Chrome**: Navigate to `chrome://extensions/`
3. **Enable Developer mode**: Toggle in the top right
4. **Load unpacked**: Select the `dist/` folder
5. **Test on GitHub**: Visit any repository and test functionality
6. **Check console**: Look for errors in DevTools

### Automated Tests

- `npm test` runs the unit tests. The injection logic is exercised against a captured copy of GitHub's Code dropdown in `src/lib/fixtures/`, so it runs offline.
- `npm run e2e` loads the built extension into Chromium and opens a real github.com repository page (run `npm run build` and `npx playwright install chromium` first). GitHub redesigns the Code dropdown without notice, so CI also runs this suite daily and fails when the clone tab stops rendering.
- If GitHub changes the dropdown markup, re-capture the fixture so the unit tests reflect what the extension actually meets in production.

## 📝 Contribution Guidelines

### Code Standards

- **TypeScript**: Use TypeScript for all new code
- **Formatting**: Follow existing code style
- **Comments**: Add clear comments for complex logic
- **Minimal permissions**: Don't add unnecessary permissions
- **Performance**: Keep the extension lightweight

### Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

- `feat: add support for private repositories`
- `fix: resolve button positioning on mobile GitHub`
- `docs: update installation instructions`
- `style: improve button hover effects`
- `refactor: simplify DOM injection logic`

### Pull Request Process

1. **Update documentation** if needed (README, comments)
2. **Test thoroughly** across different browsers
3. **Keep PRs focused** - one feature/fix per PR
4. **Write clear descriptions** explaining the change
5. **Link related issues** using `Fixes #123` or `Closes #123`
6. **Be responsive** to feedback during review

## 🐛 Bug Reports

When reporting bugs, please include:

- **Extension version**
- **Browser and version**
- **Operating system**
- **Steps to reproduce**
- **Expected vs actual behavior**
- **Screenshots or console errors**
- **Repository URL where issue occurs** (if specific)

Use our [bug report template](.github/ISSUE_TEMPLATE/bug_report.yml).

## 💡 Feature Requests

We welcome feature ideas! Please:

- **Check existing issues** to avoid duplicates
- **Describe the use case** clearly
- **Explain the expected behavior**
- **Consider implementation complexity**
- **Discuss alternatives you've considered**

Use our [feature request template](.github/ISSUE_TEMPLATE/feature_request.yml).

## 🎯 Areas for Contribution

We're especially looking for help with:

- **Firefox extension support**
- **Enhanced error handling**
- **Accessibility improvements**
- **Performance optimizations**
- **Documentation improvements**
- **Testing and bug fixes**
- **UI/UX enhancements**

## ❓ Questions?

- **General questions**: [GitHub Discussions](https://github.com/AdamAkhlaq/clone-anywhere-for-github/discussions)
- **Bug reports**: [GitHub Issues](https://github.com/AdamAkhlaq/clone-anywhere-for-github/issues)
- **Direct contact**: Open an issue or discussion

Thank you for contributing to Clone Anywhere for GitHub! 🚀
