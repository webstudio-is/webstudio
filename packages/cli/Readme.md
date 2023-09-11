# Webstudio CLI Readme

## Webstudio CLI

The Webstudio CLI is designed to help you seamlessly `link`, `sync`, and `build` projects from your webstudio workspace. This README will guide you through the process of setting up webstudio project in your local machine and guide you to keep syncing with all the changes that are made to it.

You need nodejs to use the cli, if node is already installed in your system. Please skip this step. To install Node.js using NVM, first install NVM by running:

```bash
curl -o- <https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh> | bash
```

Once NVM is installed, you can install Node.js version 18 by running:

```bash
nvm install 18
```

After installation, you can check the version of Node.js by running:

```bash
node --version
```

## Installing Webstudio CLI

To download and install the cli, run this command

```bash
npm install -g webstudio-cli
```

You can check the installed version of the `cli` using the following command.

```bash
webstudio-cli --version
```

To update the `cli` after a release, you can use the same command that was used for installation.

Now, you can run

```bash
webstudio-cli
```

to initiate the flow to connect your webstudio project and build it in your local. The default flow, will guide you through the steps. In addition to it, you can perform all the operations individually using the independent commands. Here are the list of commands that are available

## Commands

- version
- help
- [link](https://www.notion.so/Webstudio-CLI-Readme-da3f1f9fb95449838edd2a8f66de4e25?pvs=21)
- sync
- build

### link

To link a project from your workspace, you can use the following command. Linking helps in syncing the local webstudio project with the project from the workspace. Any changes made in the project, once published, can be synced to the local project.

```bash
webstudio link
```

This will prompt you to paste the link. To create a link for your Webstudio project, use the _share_ option from your project. Make sure to provide _build_ access when creating the link.

### sync

Now, you can sync the project from the workspace. Make sure you publish the project in the workspace before running the sync in the local.

```bash
webstudio sync
```

### build

Let's build the project. In this step, the `cli` will create the necessary routes and pages, and scaffold the entire app using the default remix template. Additionally, all assets such as images and fonts will be downloaded into the `assets` folder within the `public` directory.

```bash
webstudio build
```

The project is scaffolded now. You can run `npm install` and then `npm run dev` to run the app in development mode. If you want to build a production version of the app, you can run `npm run build`.

## Deployment

To deploy to Vercel, you can use the [Vercel CLI](https://vercel.com/docs/cli) to deploy your site directly. Once the project is built locally, simply run the command.

```bash
vercel deploy
```

You can install `vercel` cli by following the steps [here](https://vercel.com/docs/cli)

**Things to remember**

If you use `vercel build` before using `vercel deploy`, make sure to clean your `app` folder in the project afterwards. Vercel injects a few [files](https://github.com/vercel/vercel/blob/a8ad176262ef822860ce338927e6f959961d2d32/packages/remix/src/build.ts#L63) to support and deploy Remix using their CI. These files are not necessary for your project when using it locally.
