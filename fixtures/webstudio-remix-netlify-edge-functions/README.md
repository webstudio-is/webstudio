# Fixture to test/play with webstudio

## How to develop

```bash
# Terminal 1
cd packages/webstudio
pnpm dev
```

```bash
# Terminal 2
pnpm webstudio link
# add following link https://webstudio-builder-git-main-webstudio-is.vercel.app/builder/d845c167-ea07-4875-b08d-83e97c09dcce?authToken=e9d1343f-9298-4fd3-a66e-f89a5af2dd93

pnpm webstudio sync && pnpm prettier --write ./.webstudio/
# data.json generated

pnpm webstudio build --preview && pnpm prettier --write ./app/ ./package.json
# exec `pnpm run dev` to see result
```
