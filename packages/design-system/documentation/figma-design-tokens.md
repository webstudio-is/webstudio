# Figma Design Tokens

We use [Tokens Studio for Figma](https://docs.tokens.studio) plugin to sync design tokens between Figma and our code.

- [`__generated__/figma-design-tokens.json`](../src/__generated__/figma-design-tokens.json) — this file is synced with Figma by the plugin.
- [`__generated__/figma-design-tokens.ts`](../src/__generated__/figma-design-tokens.ts) — this file is generated from `figma-design-tokens.json` by [`transform-figma-tokens.ts`](../bin/transform-figma-tokens.ts) and contains data in format ready to be used in code.

### Generating Access Token for sync

1. Create a GitHub account if you don't have one.
2. Ask Oleg to add you to the `@webstudio-is/core` team if you are not already in it.
3. Go to https://github.com/settings/personal-access-tokens/new
   - Under "Resource owner" choose "webstudio-is" <br /><img src="./assets/1.png" width="349" />
   - Under "Repository access" choose `webstudio-is/webstudio-designer` <br /><img src="./assets/2.png" width="514" />
   - Set "Repository permissions" / "Contents" to "Read and write", and leave other permissions as is <br /><img src="./assets/3.png" width="806" />
   - Press "Generate token and request access"
   - COPY THE TOKEN NOW AND SAVE IT SOMEWHERE SAFE (you won't be able to see it again)
4. Ask Oleg to approve your token using [this instruction](https://docs.github.com/en/organizations/managing-programmatic-access-to-your-organization/managing-requests-for-personal-access-tokens-in-your-organization).

### Syncing via plugin UI

1. Open a Figma file with design tokens, such as: https://www.figma.com/file/xCBegXEWxROLqA1Y31z2Xo/%F0%9F%93%96-Webstudio-Design-Docs
2. Click "Resources" in the topbar, then "Plugins" > "Tokens Studio for Figma" > Run <br/><img src="./assets/4.png" width="611" />
3. You might be asked for an access token. You can generate one by following the instructions above, or ask someone to share theirs (not recommended).
4. You should be able to sync with GitHub using ↧ and ↥ buttons at the bottom of the plugin window. <br/><img src="./assets/5.png" width="420" />

In case sync provider is not configured in the plugin, you can add one using these settings:

- Name: up to you
- Personal Access Token: token generated using the instructions above
- Repository: `webstudio-is/webstudio-designer`
- Branch: `figma-tokens`
- File Path: `packages/design-system/src/__generated__/figma-design-tokens.json`
- baseUrl: leave empty

### Links

- https://docs.tokens.studio/sync/github — documentation on sync with GitHub by plugin authors
- https://github.com/tokens-studio/figma-plugin/issues/1285 — why we use fine-grained tokens unlike what the documentation above suggests
