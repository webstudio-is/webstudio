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

#### HTTP endpoint for self-hosted email

Set up an HTTP endpoint to send email from your self-hosted project. The following is a suggested JSON contract for that endpoint; choose its URL and authorization token.

##### Builder configuration

Configure these environment variables on the Builder server:

| Variable | Value |
| --- | --- |
| `EMAIL_SERVICE_URL` | The email endpoint's HTTPS base URL, using an origin supported by your Builder deployment. |
| `TRPC_SERVER_API_TOKEN` | The token sent as `Authorization: Bearer <token>`. It must match the token expected by the endpoint. |

Both variables are server-side configuration only. Keep them out of browser-visible configuration and client code.

##### HTTP request

Use `POST /email/send` over HTTPS with these headers:

| Header | Required | Value |
| --- | --- | --- |
| `Content-Type` | Yes | `application/json` |
| `Authorization` | Yes | `Bearer <token>` |
| `X-Webstudio-Project-Id` | No | The project ID for routing or lookup when the endpoint serves multiple projects. This header does not authenticate the request. |

The endpoint must verify the authorization token before sending email. The caller must keep the token server-side and never expose it to the browser.

The request body is a JSON object with these fields. Optional fields may be omitted.

| Field | Required | Type and meaning |
| --- | --- | --- |
| `to` | Yes | Nonempty array of mailbox objects. Each has a required `address` string containing an email address and an optional `name` string. |
| `subject` | Yes | String containing the email subject. |
| `text` | Yes | String containing the plain-text email body. |
| `replyTo` | No | One mailbox object with a required `address` string and an optional `name` string. Sets the Reply-To address. |
| `fromName` | No | String containing the sender display name. The endpoint supplies the authenticated From address. |
| `headers` | No | Object mapping email header names to string values, such as `X-Message-ID` for message correlation. These are email headers, separate from the HTTP request headers. |
| `attachments` | No | Array of attachment objects. Each has three required string fields: `filename`, `contentType` (MIME type), and `contentBase64` (standard Base64-encoded file bytes, without a data URL prefix). Use `application/octet-stream` when the MIME type is unknown. |

Example request body:

```json
{
  "to": [{ "address": "team@example.com", "name": "Team" }],
  "subject": "New message",
  "text": "Hello from Ada.",
  "replyTo": { "address": "ada@example.com", "name": "Ada" },
  "fromName": "Example Website",
  "headers": { "X-Message-ID": "0123456789abcdef" },
  "attachments": [{ "filename": "note.txt", "contentType": "text/plain", "contentBase64": "aGVsbG8=" }]
}
```

The attachment in this example contains the UTF-8 text `hello`.

##### HTTP response

Return `Content-Type: application/json`. For success, use an HTTP `2xx` status and the success body below. For failure, use an HTTP `4xx` or `5xx` status and the error body below. The body's `status` must match the HTTP status.

| Field | Required | Type and meaning |
| --- | --- | --- |
| `ok` | Yes | Boolean: `true` for success, `false` for failure. |
| `status` | Yes | Integer HTTP status code: `200`–`299` for success or `400`–`599` for failure. Choose a status that permits a JSON response body. |
| `statusText` | Yes | String describing the result. |
| `data` | Yes | Object containing `id` on success or `error` on failure. |
| `data.id` | On success | Nonempty string containing the sent message's ID. |
| `data.error` | On failure | Object with required string fields `code` (a machine-readable error code) and `message` (a human-readable explanation). |

Success example — HTTP `200 OK`:

```json
{ "ok": true, "status": 200, "statusText": "OK", "data": { "id": "provider-message-id" } }
```

Failure example — HTTP `422 Unprocessable Content`:

```json
{ "ok": false, "status": 422, "statusText": "Recipient rejected", "data": { "error": { "code": "recipient_rejected", "message": "Recipient rejected" } } }
```

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
