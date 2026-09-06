---
description: >-
  Webstudio's Command Line Interface (CLI) allows you to interact directly with
  your Projects from the command line.
---

# ⬛ CLI

Webstudio's CLI lets you work with Projects from the command line. You can export and build a Project, publish and manage domains, inspect Project permissions, capture screenshots, and expose the configured Project to automation tools through MCP.

For self-hosting, the CLI can export your entire Webstudio Project. Once exported, these projects are ready to be deployed on any hosting platform of your choice - giving you complete freedom over where and how your website goes live.

## Quick setup

The current Webstudio CLI package is `webstudio`. Run it with `npx`; do not install it globally or create a permanent `webstudio` command unless you intentionally need that. Do not use the old `@webstudio-is/cli` package or the old `wstd` command.

Use this page as the source of truth for the CLI package. Do not infer the package name or command from local repositories, old README files, or older examples.

First, check whether Node.js and npm are already installed:

```sh
node --version
npm --version
```

If `node` is version 22.12 or greater and `npm` prints a version, skip Node.js installation. If either command is missing, install Node.js 22.12 or greater before using the Webstudio CLI.

Run the latest Webstudio CLI without a global install:

```bash
npx --yes webstudio@latest --version
```

No separate Webstudio CLI installation is required when using `npx`. After verifying the latest CLI with `npx --yes webstudio@latest`, you can use the shorter `npx webstudio` command in the same environment.

For the latest version regardless of any existing global install, use `npx --yes webstudio@latest`.

## How to run Webstudio commands

Examples on this page use the no-install `npx webstudio` command:

```bash
npx webstudio <command> [options]
```

Use one of these command formats:

| Setup                       | Command format                                   |
| --------------------------- | ------------------------------------------------ |
| Latest one-off run, all OSs | `npx --yes webstudio@latest <command> [options]` |
| After verifying latest      | `npx webstudio <command> [options]`              |

Running with `npx` does not install a permanent `webstudio` command. Continue using `npx webstudio` for normal usage.

Use `npx webstudio --help` for the current command list.

## How to update the CLI

The recommended `npx` setup does not install a permanent copy of the Webstudio
CLI, so there is no separate update command. Run the latest published version
explicitly:

```bash
npx --yes webstudio@latest --version
```

Then use `@latest` with any command when you need to guarantee that run uses
the newest release:

```bash
npx --yes webstudio@latest <command> [options]
```

This updates the CLI used by `npx`; it does not modify your linked Project or
its `.webstudio` files until you run a command that does so. If you previously
installed `webstudio` globally, remove that installation to avoid invoking an
older permanent command:

```bash
npm uninstall --global webstudio
```

## First use

To use the CLI with a Project, you need an existing Webstudio Project and a Builder share link with Build access. Create the share link from the Share dialog in the Builder.

Run the guided flow:

```bash
npx webstudio
```

Or link a Project non-interactively:

```bash
npx webstudio link --link "<share-link-with-build-access>"
```

Publish the Project in Webstudio Cloud before syncing when you need recent Builder changes in the local export.

## Install Node.js only when needed

You need Node.js 22.12 or greater to use the Webstudio CLI. If `node --version` reports version 22.12 or greater, skip this section.

On macOS or Linux, you can install Node.js with NVM. First check whether NVM already exists:

```sh
command -v nvm
```

If `nvm` is not found, install it:

```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
```

After installing NVM, restart your terminal. If `nvm` is still not found, source your shell profile and try again.

Once NVM is installed, you can install Node.js version 22 or greater by running:

```sh
nvm install 22
```

Verify your Node.js installation by checking its version:

```sh
node --version
```

On Windows, install Node.js 22.12 or greater from [nodejs.org](https://nodejs.org/) or use a Windows-compatible Node version manager. After installing Node.js, open a new terminal and verify:

```powershell
node --version
npm --version
```

## How the CLI connects to a Project

Most CLI commands operate on the single Project configured in the current directory.

- `.webstudio/config.json` stores the Project ID.
- The global Webstudio config stores the origin and share-link token.
- `npx webstudio sync` downloads the Project bundle to `.webstudio/data.json`.
- Synced asset files are stored in `.webstudio/assets`.

You can configure a Project interactively:

```bash
npx webstudio link
```

Or pass a share link directly:

```bash
npx webstudio link --link "<share-link>"
```

For automation, use `init` with JSON output:

```bash
npx webstudio init --link "<share-link>" --json
```

The share link should include Build access when you need to sync, build, import, or automate Project changes.

## Export and build a Project

After linking, publish the Project in Webstudio Cloud, then sync it locally:

```bash
npx webstudio sync
```

Build a dynamic app with a deployment template:

```bash
npx webstudio build --template docker
```

{% hint style="info" %}
See [export types](self-hosting/#export-types) for more information about JavaScript applications vs. static sites.
{% endhint %}

The CLI scaffolds the application, creates its routes and pages, and downloads
assets. In the generated project, install dependencies and use the scripts in
its `package.json` to develop or create a production build.

Build a static site with:

```bash
npx webstudio build --template ssg
```

Please review [the limitations](self-hosting/#static-site-limitations) of using the static site export instead of dynamic templates.

## Other workflows

The CLI can also:

- Import a synced Project into another Project.
- Preview an export and capture screenshots.
- Publish, unpublish, and inspect publishing jobs.
- Manage and verify custom domains.
- Audit accessibility, security, SEO, and performance settings.
- Expose a Project to AI agents and other automation through MCP.

Use the built-in help for current commands and options:

```bash
npx webstudio --help
npx webstudio <command> --help
```

## Automation and MCP

Webstudio MCP lets agents inspect and edit the native visual-builder model so
their changes remain editable in the Builder. After linking a Project,
shell-capable agents can call MCP tools directly without configuring or
restarting an MCP client:

```bash
npx webstudio meta.index
npx webstudio insert-fragment '{"parentInstanceId":"<parent-id>","fragment":"<section />"}' --dry-run
```

The explicit equivalent is
`npx webstudio mcp single-op-call <tool> '<json>'`. To keep Webstudio tools
available inside a supported client, generate its persistent configuration:

```bash
npx webstudio connect claude
npx webstudio connect codex
npx webstudio connect cursor
npx webstudio connect vscode
```

See [Webstudio MCP](mcp.md) for the exhaustive, versioned setup, discovery,
editing, verification, safety, and troubleshooting reference generated from
the latest published CLI manual.

## Related

- [Webstudio MCP](mcp.md) – Connect agents to the native visual-builder model
- [Download](self-hosting/download.md) – Export a static site directly from the Builder
- [Netlify](self-hosting/netlify.md) – Deploy your project to Netlify
- [Vercel](self-hosting/vercel.md) – Deploy your project to Vercel
- [VPS with Docker](self-hosting/vps-with-docker.md) – Deploy to your own server using Docker
- [Publishing and custom domains](foundations/publishing-and-custom-domains.md) – Set up custom domains for your site
