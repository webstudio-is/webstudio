---
description: Learn how to deploy your project to Netlify.
---

# ▶️ Netlify

[Netlify](https://www.netlify.com/), a popular choice for deploying modern websites and apps, offers features like continuous deployment from Git across a global application delivery network, serverless form handling, and more. It provides an ideal environment for deploying your Webstudio Projects.

**Netlify supports deploying both dynamic apps and static sites.**

{% hint style="info" %}
See [export types](./#export-types) for more information about JavaScript applications vs. static sites.
{% endhint %}

## JavaScript application

Learn how to deploy your dynamic JavaScript application to Netlify.

{% embed url="https://www.youtube.com/watch?v=Gr1jPtsg6_Q" %}

### Prerequisites

- Install the [Webstudio CLI](../cli.md)

Use the [Netlify CLI](https://docs.netlify.com/cli/get-started/) to deploy your app directly to [Netlify](https://netlify.com/):

```bash
netlify deploy
```

You can configure the project to support Netlify serverless/edge-functions respectively, as deployment target at the time of initially setting up your project. Please check the [initiating-a-webstudio-project](https://github.com/webstudio-is/webstudio/tree/main/packages/cli#initiating-a-webstudio-project) section.

You can manually change it using the `build` command. For serverless functions:

```bash
webstudio build --template netlify
```

### Complete CLI Workflow

Here's the full step-by-step process for deploying to Netlify:

```bash
# 1. Create a Webstudio project folder
npx webstudio

# Follow prompts: enter folder name, paste your Share Link

# 2. Navigate to your project
cd your-project-folder

# 3. Install dependencies
npm install

# 4. Login to Netlify
npx netlify-cli login

# 5. Create a new Netlify site
npx netlify-cli sites:create

# 6. Build your project
npm run build

# 7. Deploy to preview URL (for testing)
npx netlify-cli deploy

# 8. Deploy to production (when ready)
npx netlify-cli deploy --prod
```

### Redeploying Changes

When you make changes in Webstudio:

1. Publish changes in Webstudio
2. In your project folder, run:
   ```bash
   npx webstudio sync
   npm run build
   npx netlify-cli deploy --prod
   ```

## Static site

Learn how to upload your static site to Netlify.

<figure><img src="../../.gitbook/assets/netlify-new-project.png" alt="netlify new site dashboard"><figcaption></figcaption></figure>

### Prerequisites

- Export your project using one of the [export methods](./#exporting).

**How to upload your project to Netlify:**

- Go to Sites
- Add a new site
  - **Manually** – upload the export zip from Webstudio

  ![Drag and drop upload static site to netlify](../../.gitbook/assets/netlify-drag-drop.png)
  - **Git** – Unzip the export and add it to a repository such as GitHub

- Click “Open production deploy”

## Related

- [CLI](../cli.md) – Export and build your project using the command line
- [Vercel](./vercel.md) – Another popular platform for deploying JavaScript apps
- [Cloudflare Pages](./cloudflare-pages.md) – Deploy static sites to Cloudflare's network
- [Publishing and custom domains](../foundations/publishing-and-custom-domains.md) – Set up custom domains for your site
