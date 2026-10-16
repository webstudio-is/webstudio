---
description: >-
  Webstudio can be self-hosted, putting you in control of your hosting, pricing,
  security, and compliance.
---

# 📤 Self-Hosting

The Builder and Projects are hosted separately. The Builder is used to create Projects, and when a Project is published or exported, the site/app is deployed independently.

## Builder

{% hint style="warning" %}
While both the Builder and the generated site are open-source, self-hosting the Builder in production is more difficult and currently not recommended. You can still [self-host the Builder for development](../../contributing/contributions.md#running-the-webstudio-project-using-vs-code), and of course, you can self-host the sites for production.
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

* **JavaScript application** – Builds a dynamic app with server routes. This is the default behavior of Webstudio Cloud and provides the most functionality, but it requires hosting that runs the app.
* **Static site** – Outputs a static site (HTML/CSS/JS) with limited functionality, but has more versatile hosting options.

On Webstudio Cloud, a published Cloudflare-hosted site can send Email Resources through Webstudio's private Email Service when its `EMAIL_SERVICE` binding is configured. That binding and service are not included in an export. A self-hosted JavaScript application needs a custom server-side email integration before Email Resources, including visitor-addressed ones, can send; without one, delivery fails explicitly. A static export has no managed Form submission endpoint and cannot send them.

#### HTTP endpoint for self-hosted email

The browser submits a managed Form to the exported app's `POST /__ws-form` route (or `POST /__ws-form/<page-path>`). The app evaluates each selected Email Resource before delivery. Webstudio Cloud then calls its private email service: published sites use a Cloudflare service binding, while Builder Preview posts to `/trpc/email.send` with a private token and receives a tRPC response envelope. The URL helper accepts only Webstudio's approved Worker hosts, so it cannot be pointed at an arbitrary self-hosted endpoint. The generated Node adapter leaves email delivery unconfigured. In the exported server, replace `createManagedFormEmailSender` in `app/__generated__/$resources.managed-form-fetch.server.ts` with an adapter that calls your endpoint. Regeneration can replace that file; reapply or automate the customization when exporting again.

The generated route calls `createManagedFormEmailSender({ context, formData, projectId })`. Return a `sendEmail(resourceRequest, options)` function from it. That function receives the evaluated Email Resource request; combine its `resourceRequest.email` fields with files from the submitted `formData` to build the HTTP JSON body below. Use `projectId` for your endpoint's project identity, and map the endpoint's response to the `sendEmail` outcome. `options` includes a cancellation signal and timeout budget.

You choose the private endpoint URL and authentication. For example, have the adapter send `POST /email/send` with `Content-Type: application/json`, `Authorization: Bearer <server-secret>`, and `X-Webstudio-Project-Id: <project-id>`. Its JSON body uses the evaluated message fields sent to the Cloud service:

```json
{
  "to": [{ "address": "team@example.com", "name": "Team" }],
  "subject": "New form submission",
  "text": "Form data:\nName: Ada",
  "headers": { "X-Message-ID": "0123456789abcdef" },
  "replyTo": { "address": "owner@example.com", "name": "Site Owner" },
  "fromName": "Site Owner",
  "attachments": [{ "filename": "note.txt", "contentType": "text/plain", "contentBase64": "aGVsbG8=" }]
}
```

`to`, `subject`, and `text` are the resolved recipients and message. `replyTo`, `fromName`, `headers`, and `attachments` are optional. `replyTo` is the Email Resource's **Reply to** value; it is not the provider's authenticated From address, which your host controls. `fromName` is a display name. Attachments are submitted files encoded as Base64 when **Attach submitted files** is enabled. The Form adds one `X-Message-ID` email header shared by its email actions; forward it for correlation. Recipient mode and the selected visitor field are resolved before this message is sent, so they are not endpoint fields.

Have the endpoint report a delivery result that the adapter maps to the current `sendEmail` outcome. For a direct JSON contract, these are suitable responses:

```json
{ "ok": true, "status": 200, "statusText": "OK", "data": { "id": "provider-message-id" } }
```

```json
{ "ok": false, "status": 422, "statusText": "Recipient rejected", "data": { "error": { "code": "recipient_rejected", "message": "Recipient rejected" } } }
```

Return an HTTP error status for a failed send and preserve its message in the adapter's outcome. A failed team-recipient action makes the Form submission fail; a failed visitor-addressed action appears in `errors` without changing overall success. The Form does not retry a failed Email Resource action, since delivery may already have happened. A timeout or lost response can therefore leave delivery uncertain. `X-Message-ID` is for correlation, not general idempotency: separate actions in one submission share it, and a new submission gets a new value. If your endpoint needs duplicate detection, define its own idempotency semantics. Keep the endpoint and provider credentials server-side. This is an integration pattern for the current generated app, not a stable Webstudio HTTP API; check the generated adapter and SDK types after upgrades.

{% hint style="warning" %}
If you want the export to contain human-readable class names, disable atomic CSS. See [Atomic CSS](../foundations/project-settings.md#atomic-css) for more information.
{% endhint %}

#### **JavaScript application**

This is the default behavior if you were to publish to Webstudio Cloud.

The JavaScript application supports dynamic functionality like [CMS integrations](../foundations/cms.md), [Forms](../core-components/form.md) with HTTP Resource actions, Webhook Forms, [image optimization](../core-components/image.md#optimize), and redirects.

JavaScript applications require a hosting environment that handles server-side code execution, fetching data from CMS integrations, and more.

#### Form submission endpoint

The new **Form** submits to a generated same-origin HTTP endpoint. For the home page, the endpoint is `POST /__ws-form`; for a page such as `/contact`, it is `POST /__ws-form/contact`. The app handles the submitted fields and files, validates the request, and sends HTTP Resource requests from the server. Keep the generated routes available when configuring your host or reverse proxy. A successful submission can then refresh page Resources without a full-page reload.

A static export has no Form endpoint. If you need native browser submission on a static site, use an **Element** with tag `form` and an `action` that your chosen service handles. This does not use Webstudio's managed Resource actions.

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
* Form submission to Resource actions
* Image optimization
* No robots.txt
* No sitemap.xml

#### Static site URL behavior

Webstudio static exports cannot redirect requests by themselves. The hosting
platform decides whether `/about`, `/about/`, or both URLs serve a generated
page such as `about/index.html`.

| Platform | Default behavior for a Webstudio static export |
| --- | --- |
| Cloudflare Pages | Redirects `/about` to `/about/` for a generated `about/index.html` file. See [Cloudflare Pages serving behavior](https://developers.cloudflare.com/pages/configuration/serving-pages/). |
| Netlify | Pretty URLs are enabled by default and normalize the generated page to `/about/`. Netlify applies this normalization before redirect rules, so a static redirect rule cannot change it to `/about`. See [Netlify redirect options](https://docs.netlify.com/manage/routing/redirects/redirect-options/). |
| Vercel | Serves both `/about` and `/about/` unless the project sets `trailingSlash`. Set `"trailingSlash": false` in `vercel.json` to redirect `/about/` to `/about`. See [Vercel project configuration](https://vercel.com/docs/project-configuration/vercel-json#trailingslash). |
| Other static hosts | Behavior depends on how the host resolves directory index files and normalizes URLs. Configure redirects or canonical URLs with the host. |

If every URL must redirect to the slashless Webstudio page path, use an
exported JavaScript application. On static hosting, enforcing that convention
on Netlify or Cloudflare Pages requires request-handling code at the edge rather
than static redirect files.

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
