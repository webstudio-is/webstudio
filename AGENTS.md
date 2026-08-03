# Webstudio agent instructions

Follow established repository conventions and the instructions nearest to the
files you change. Keep changes focused, preserve unrelated work, and never edit
generated files directly.

## Product documentation

The Builder repository's `docs/` directory is the authoritative source for
Webstudio product documentation. The archived `webstudio-community` repository
is historical and read-only; do not use it as an editing or review target.

### Authoring and publication

- Author documentation on normal Builder branches against `main`.
- Treat `docs` as GitBook's publication branch, not an authoring branch.
- Release automation advances `docs` after a successful CLI release. Do not
  merge or push that branch manually unless the user explicitly requests a
  publication or release-recovery update.
- Follow the existing structure in `docs/SUMMARY.md`. Add every discoverable
  page to the navigation and use relative links for internal documentation.
- After moving or deleting a page, find and repair its inbound links.

### Generated MCP reference

`docs/university/mcp.md` is generated and must not be edited directly. Depending
on the change, update its sources instead:

- `packages/cli/src/docs/manual-mcp.md` for the bundled MCP manual
- `scripts/docs/mcp-page.md` for the GitBook page wrapper
- `scripts/docs/generate-mcp-docs.ts` for composition and generation behavior

Run `pnpm docs:mcp:sync` to regenerate the page and
`pnpm check:generated-docs` to verify generated documentation.

### Updating documentation from product changes

1. Inspect the latest relevant history for this repository's `docs/` directory,
   including imported history when older context is relevant.
2. Inspect the actual Builder changes since that documentation revision, not
   commit subjects alone.
3. Document new user-facing features and changed behavior. Include bug fixes
   only when they change what users need to understand.
4. Update the most appropriate existing page or create and navigate a new one.
5. Verify links, heading hierarchy, sentence case, formatting, and generated
   output before reporting completion.
