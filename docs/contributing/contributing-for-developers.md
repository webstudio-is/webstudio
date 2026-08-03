# 🧑‍💻 Contributing for Developers

## Process

If you want to contribute and don't know where to start, here is a step-by-step for a complete lifecycle, from idea to deployment.

1. If you have an idea that is not already in [discussion](https://github.com/webstudio-is/webstudio-community/discussions) or [issues](https://github.com/webstudio-is/webstudio-builder/issues), please start a discussion or reach out on [discord](https://wstd.us/community)
2. If you are a DEVELOPER, and you want to contribute to the Builder UI, your first step is to become familiar with our design system in figma. Start with the first page of our [Design Docs](https://www.figma.com/file/xCBegXEWxROLqA1Y31z2Xo/%F0%9F%93%96-Webstudio-Design-Docs?type=design&node-id=234%3A36754&t=w3VxT162RQF0gTrI-1). And for our design system & components see the [Webstudio Library](https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?type=design&node-id=2647%3A10046&t=f4xr8mcumXfXkHVh-1). Please read the docs carefully and thoroughly so you can use our design system properly to create a UI that looks like it's a natural part of Webstudio. If any part of the design is confusing or intimidating you can reach out to us on Discord with questions or feedback.
3. After submitting an enhancement or a bug, we need to agree on a solution. You can jump into implementation right away, but be aware that we have to agree on the solution in the end. Communicating the problem you are solving and why you think the approach you are taking is the best is key for a quick process.

   In fact, we are happy to help you communicate your ideas, so if you are not sure - talk to us on discord.

4. When the implementation is in a mergeable state, a core team member will deploy it to production.

## Running the Webstudio Project Using VS Code

### Prerequisites

- VS Code installed: [Download VS Code](https://code.visualstudio.com/Download)
- Docker installed: [Install Docker](https://docs.docker.com/get-docker/)

### Steps

1. Install the "Dev Containers" extension in VS Code:
   - Open VS Code.
   - Go to the Extensions view by clicking the Extensions icon in the Activity Bar on the side of the window.
   - Search for "Dev Containers" and click Install. Alternatively, you can install it from the recommended extensions listed in the Webstudio project.
2. Fork and clone the Webstudio repository:
   - Fork the repository on GitHub.
   - Clone your forked repository to your local machine.
3. Open the repository in VS Code:
   - Open VS Code.
   - Select "File" > "Open Folder" and choose your project folder.
4. Reopen in Container:
   - Once your folder is open, you might see a notification asking if you want to reopen in a container. Click "Reopen in Container".
   - If you don't see a notification, press `F1`, type `Dev Containers: Reopen in Container`, and select it.

VS Code will now build the Docker container and open the Webstudio project inside it. This process will take some time as the environment is set up and dependencies are installed.

5. Run the development server:
   - After the setup completes, open the terminal in VS Code.
   - Run the following command:

     ```sh
     pnpm dev
     ```

6. Open the application in your browser:
   - After running `pnpm dev`, you will see a URL in the console that looks like this:

     ```
     ➜  Local:   https://wstd.dev:5173/
     ```

   - Cmd + click on the URL in the console to open it in your browser.

{% hint style="danger" %}
If VS Code shows you an "Open Browser" button, it will lead you to the wrong URL as they are only watching ports. Be sure to use `wstd.dev` and **NOT** `localhost`. The proper URL will show in the console.\
\
<img src="../.gitbook/assets/vscode-dialog.png" alt="VS Code Open Browser Dialog" data-size="original">
{% endhint %}

## Login locally

When downloading the app you will have two options for login and they both work in different ways.

### Dev login

Dev login will create you a dev account so you don't need to be online or create a github app. To enable you create a file `.env.development` in `apps/builder` and include two lines:

```
DEV_LOGIN=true
AUTH_SECRET=a random value
```

To login in the app click on the "Login with Secret" button and paste your `AUTH_SECRET` in the input.\
To log in as another user in dev mode, use your AUTH_SECRET, followed by : and any email address. For example: \`abcd:example@email.com\`\\

### GitHub Login

To login and use GitHub login you will need to create an OAuth app with the following values:

```
Name: Webstudio
Homepage URL: http://localhost:3000
Authorization callback URL: http://localhost:3000/auth/github/callback
```

> When creating the app with `http://localhost:3000` you will need to always open your app at `http://localhost:3000` for the GitHub login to work.

After the app is created you will need to create a client secret and then copy that value and your client id to the `.env` file:

```
GH_CLIENT_SECRET=
GH_CLIENT_ID=
```

You are done! 🎉

## Related

- [Contributing for Designers](contributing-for-designers.md) – Ways designers can contribute to Webstudio
- [Contributing to the Marketplace](marketplace.md) – Submit templates and sections
- [FAQs](../basics/FAQ.md) – Common questions including licensing information
- [Roadmap & Links](../basics/roadmap-and-links.md) – See what the team is working on
