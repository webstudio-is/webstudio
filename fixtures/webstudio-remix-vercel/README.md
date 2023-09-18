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
# add following link https://webstudio-builder-git-main-webstudio-is.vercel.app/builder/cddc1d44-af37-4cb6-a430-d300cf6f932d?authToken=1cdc6026-dd5b-4624-b89b-9bd45e9bcc3d&mode=preview

pnpm webstudio-cli sync && pnpm prettier --write ./.webstudio/
# data.json generated

pnpm webstudio-cli build --preview && pnpm prettier --write ./app/ ./package.json
# exec `pnpm run dev` to see result
```
