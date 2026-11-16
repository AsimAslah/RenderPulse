# Contributing

Use an issue, a focused feature branch, conventional commits, automated tests, and a pull request. Do not commit directly to `main`, bypass required checks, fabricate fixtures as live evidence, or include secrets and private URLs.

Before opening a pull request:

```bash
npm ci
npm run lint
npm test
npm run coverage
npm audit --audit-level=high
```

Document security-boundary changes and update the Slack manifest when scopes change. Genuine co-authors may be credited with their consent and correct identity only.

