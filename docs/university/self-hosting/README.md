---
description: >-
  Webstudio can be self-hosted, putting you in control of your hosting, pricing,
  security, and compliance.
---

# 📤 Self-Hosting

The Builder and Projects are hosted separately. The Builder is used to create Projects, and when a Project is published or exported, the site/app is deployed independently.

## Builder

{% hint style="warning" %}
While both the Builder and the generated site are open-source, self-hosting the Builder in production is more difficult and currently not recommended. You can still [self-host the Builder for development](../../contributing/contributing-for-developers.md#running-the-webstudio-project-using-github-codespaces), and of course, you can self-host the sites for production.
{% endhint %}

## Projects

After building, export your Projects and host them on your own server or preferred platform.

### Export methods

There are two ways to export Projects:

1. [**Webstudio CLI** ](../cli.md)– Allows you to interact with and export your Projects. **Supports static and dynamic (see below).**
2. [**Download button in the Builder**](download.md) – Click a button in the Webstudio Builder, and the Project will be downloaded as a zip. **Supports static only (see below).**

{% hint style="warning" %}
If you are self-hosting the Builder, then please use the [Webstudio CLI](../cli.md) to export your project.
{% endhint %}

### Export types

There are two types of exports:

* **JavaScript application** – Builds a dynamic [Remix app](https://remix.run/). This is the default behavior of Webstudio Cloud and provides the most functionality, but it requires hosting that works with apps.
* **Static site** – Outputs a static site (HTML/CSS/JS) with limited functionality, but has more versatile hosting options.

{% hint style="warning" %}
If you want the export to contain human-readable class names, disable atomic CSS. See [Atomic CSS](../foundations/project-settings.md#atomic-css) for more information.
{% endhint %}

#### **JavaScript application**

This is the default behavior if you were to publish to Webstudio Cloud.

The JavaScript application supports dynamic functionality like [CMS integrations](../foundations/cms.md), Webhook forms, [image optimization](../core-components/image.md#optimize), redirects, and more.

JavaScript applications require a hosting environment that handles server-side code execution, fetching data from CMS integrations, and more.

#### Platforms for JavaScript applications

Here are the platforms we have documented.

**Serverless:**

Serverless platforms enable you to push code, and they handle the rest, from infrastructure to scaling.

{% hint style="info" %}
This self-hosting option is the easiest to use, though there is less flexibility in platform choice.
{% endhint %}

{% content-ref url="netlify.md" %}
[netlify.md](netlify.md)
{% endcontent-ref %}

{% content-ref url="vercel.md" %}
[vercel.md](vercel.md)
{% endcontent-ref %}

**Servers:**

Webstudio provides a Dockerfile, which enables your site to run on any server that supports containers.

{% hint style="info" %}
This self-hosting option is more technical compared to others, but it offers a higher degree of flexibility regarding its deployment location.
{% endhint %}

{% hint style="warning" %}
The Docker build requires a _minimum_ of 1 GB of memory and 1 core CPU, though more is recommended.
{% endhint %}

{% content-ref url="flightcontrol.md" %}
[flightcontrol.md](flightcontrol.md)
{% endcontent-ref %}

{% content-ref url="digital-ocean-coolify.md" %}
[digital-ocean-coolify.md](digital-ocean-coolify.md)
{% endcontent-ref %}

{% content-ref url="hetzner-coolify.md" %}
[hetzner-coolify.md](hetzner-coolify.md)
{% endcontent-ref %}

#### **Static site**

You can optionally export your Webstudio Project as a static site, i.e., a collection of HTML, CSS, JavaScript, and image files. This allows you to host your site on traditional hosting providers or, better yet, on dedicated static site hosting and deployment platforms.

#### Static site limitations

While static site exporting and hosting are less technical, this comes at the cost of functionality.

**The following are&#x20;**_**not**_**&#x20;supported:**

* Dynamic pages
* Redirects
* Statuses
* Client navigation
* Webhook form
* Image optimization
* No robots.txt
* No sitemap.xml

#### Local

To run a project locally, you must run a simple local server. Use the command `npx serve .` to spin one up. This is required because the static files use absolute URLs.

#### Platforms for static sites

Here are the platforms we have documented:

{% content-ref url="cloudflare-pages.md" %}
[cloudflare-pages.md](cloudflare-pages.md)
{% endcontent-ref %}

{% content-ref url="github-pages.md" %}
[github-pages.md](github-pages.md)
{% endcontent-ref %}

{% content-ref url="netlify.md" %}
[netlify.md](netlify.md)
{% endcontent-ref %}

{% content-ref url="vercel.md" %}
[vercel.md](vercel.md)
{% endcontent-ref %}
