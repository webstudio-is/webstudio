## Webstudio CLI

The Webstudio CLI is designed to help you seamlessly link, sync, and build projects from your web development workspace. This README will guide you through the process of setting up linking, syncing, building, and running your projects using the Webstudio CLI commands.

## Linking a Project

Create a folder using

```sh
mkdir <project-name>
```

Now, `cd` into the folder that we just created.

```sh
cd <project-name>
```

Run the following command to link the project from your workspace.

```sh
webstudio link
```

This will prompt you to paste the link. You can create a link for your Webstudio project using the _share_ option. Make sure you provide _build_ access when you create the link.

Now, you can sync your project with the following command. Make sure you publish the project in the workspace before the sync.

```sh
webstudio sync
```

Let's build the project. In this step, the `cli` creates the routes, pages, and scaffolds the entire app using the default remix template. All the assets like images and fonts will also be downloaded into the `assets` folder under the `public` directory.

```sh
webstudio build
```

The project is scaffolded now. You can run `npm install` and then `npm run dev` to run your app in development mode. If you want to build a production version of the app, you can run `npm run build`.

## Commands

- `help` shows you all the available commands.
- `version` displays the current version of the CLI.

## Development setup

- To use a local version of the `cli`, you need to clone the repository.

```sh
git clone https://github.com/webstudio-is/webstudio
```

- Then run `pnpm install` to install all the dependencies.
- Once the dependencies are installed, you can use `pnpm build` to build all the necessary packages and the CLI itself.
- Now, change to the `app/cli` folder and run `yarn link` to create a global link for the package.
- Upon the successful creation of the `symlink`, you can use the `webstudio` command to use the CLI.
