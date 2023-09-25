# Fixture to test/play with webstudio-cli

## How to develop

```bash
# Terminal 1
cd packages/webstudio-cli
pnpm dev
```

```bash
# Terminal 2
pnpm webstudio-cli link
# add following link https://webstudio-builder-git-main-webstudio-is.vercel.app/builder/d845c167-ea07-4875-b08d-83e97c09dcce?authToken=e9d1343f-9298-4fd3-a66e-f89a5af2dd93

pnpm webstudio-cli sync && pnpm prettier --write ./.webstudio/
# data.json generated

pnpm webstudio-cli build --preview && pnpm prettier --write ./app/ ./package.json
# exec `pnpm run dev` to see result
```
