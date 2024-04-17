# Fixture to test/play with webstudio

## How to develop

```bash
# Terminal 1
cd packages/webstudio
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

## Can be used for profiling

```bash
pnpm build
pnpm start
```

execute chrome profiler see web vital events inside
