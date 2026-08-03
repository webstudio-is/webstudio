---
description: Learn how to deploy your project to Vercel.
---

# ▶️ Vercel

[Vercel](https://vercel.com/), a popular cloud platform for static sites and Serverless Functions, is known for its ease of use and performance optimization capabilities. It provides an ideal environment for deploying your Webstudio Projects.

{% hint style="info" %}
See [export types](./#export-types) for more information about JavaScript applications vs. static sites.
{% endhint %}

## JavaScript application

Learn how to deploy your static JavaScript application to Vercel.

{% embed url="https://www.youtube.com/watch?v=eoyB9DfWdT8" %}
How to Export and Self-Host Your Site on Vercel
{% endembed %}

### **Prerequisites**

* Install the [Webstudio CLI](../cli.md)
* [Build](../cli.md#sync-and-build) your project locally

Once you've built the project locally, you can use the [Vercel CLI](https://vercel.com/docs/cli) to deploy your app directly to Vercel:

```
vercel deploy
```

Follow the [Vercel CLI installation instructions](https://vercel.com/docs/cli). We plan to add more deployment targets in future.

#### Important Notes

If you use `vercel build` before `vercel deploy`, make sure to clean your `app` folder in the project afterward.

Vercel injects a few [files](https://github.com/vercel/vercel/blob/a8ad176262ef822860ce338927e6f959961d2d32/packages/remix/src/build.ts#L63) to support and deploy Remix using their CLI, but these files are not necessary for your project when you use it locally.

## Static site

Learn how to upload your static site to Vercel.

<figure><img src="../../.gitbook/assets/vercel-new-project.png" alt="Vercel add new project dashboard"><figcaption></figcaption></figure>

### Prerequisites

* Export your project using one of the [export methods](./#exporting)
* Upload/commit your project to a Git provider (GitHub, Bitbucket, GitLab)

**How to upload your project to Netlify:**

* Go to dashboard
* Click “Import project” or “Add New” > “Project”
* Continue with one of the Git providers and authorize it
* Select the repository your project is in
* Click “Deploy”

See Vercel’s “[Import an existing project](https://vercel.com/docs/getting-started-with-vercel/import)” doc for a comprehensive tutorial.
## Related

- [CLI](../cli.md) – Export and build your project using the command line
- [Netlify](./netlify.md) – Another popular platform for deploying JavaScript apps
- [Cloudflare Pages](./cloudflare-pages.md) – Deploy static sites to Cloudflare's network
- [Publishing and custom domains](../foundations/publishing-and-custom-domains.md) – Set up custom domains for your site
