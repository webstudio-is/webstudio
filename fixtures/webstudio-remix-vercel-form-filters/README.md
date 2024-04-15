# Fixture to test/play with webstudio-cli

## How to develop

```bash
# Terminal 1
cd packages/webstudio-cli
pnpm dev
```

```bash
# Terminal 2
pnpm fixtures:link

pnpm fixtures:sync
# data.json generated

pnpm fixtures:build
# exec `pnpm run dev` to see result
```
