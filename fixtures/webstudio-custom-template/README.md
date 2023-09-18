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
# add following link https://webstudio-builder-git-main-webstudio-is.vercel.app/builder/0d856812-61d8-4014-a20a-82e01c0eb8ee?authToken=d225fafb-4f20-4340-9359-c21df7c49a3f&mode=preview

pnpm webstudio-cli sync && pnpm prettier --write ./.webstudio/
# data.json generated

pnpm webstudio-cli build --preview --template ./custom-template && pnpm prettier --write ./app/ ./package.json
# exec `pnpm run dev` to see result
```
