## WebStudio CLI

WebStudio CLI is designed to help you seamlessly link, sync, and build projects from your web development workspace. This README will guide you through the process of setting up, linking, syncing, building, and running your projects using the WebStudio CLI commands.

## Linking a Project

To link your project to the WebStudio CLI, follow these steps:

- Create a folder using

```sh
mkdir <project-name>
```

- Now, `cd` into your folder. That we just created.

```sh
cd <project-name>
```

- Run the following command to link the project from your workspace.

```sh
webstudio link
```

This will prompt a to paste the link, you can create a link from your webstudio project using _share_ option. Make sure, you need to provide _build_ access when you create the link.

- Now, you can sync your project with the following command. Make sure, you publish the project in the workspace before the sync.

```sh
webstudio sync
```

- Now, let's build the project. In this step, the `cli` creates the routes, the pages and scaffolds the entire app using the default remix template. And all the assets like images and the fonts will also be downloaded into the `assets` folder under `public` directory.

```sh
webstudio build
```

- The project is scaffolded now, you can run `npm install` and then `npm run dev` to run your app in development mode. If you want to build a production version of the app, you can run `npm run build`.

## Commands

- `help` shows you all the commands available.
- `version` displays the current version of the cli.

## Development setup

- If you want to use a local version of the `cli`. You can need to clone the repository.

```sh
git clone https://github.com/webstudio-is/webstudio-builder
```

- Then run `pnpm install` to install all the dependencies.
- Once the dependecies are installed, you can use `pnpm build` to build all the necessary packages and the cli itself.
- Now, change to `app/cli` folder. And run `yarn link` to create a global link for the package.
- On a successful creation of the `synmlink`. You can use the `webstudio` command to use the `cli` now.
