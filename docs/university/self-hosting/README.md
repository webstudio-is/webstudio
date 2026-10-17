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

#### tRPC email service endpoint

The Builder calls the email service with a tRPC mutation:

```text
POST <EMAIL_SERVICE_URL>/trpc/email.send
```

This endpoint does not configure Email Resources in exported projects. Current CLI exports do not support an arbitrary self-hosted email service URL for managed form delivery.

The request uses HTTPS, `Content-Type: application/json`, and `Authorization: Bearer <token>`. The JSON request body is the email object itself; do not wrap it in a `json` property.

The email service also requires `X-Webstudio-Project-Id`, a UUID used for routing and rate limiting. It is caller-supplied metadata, not authentication. The service must authorize the request using the bearer token.

##### Builder configuration

Set `TRPC_SERVER_API_TOKEN` on the Builder server and configure the email service with the same secret. Never expose this token to browser code.

`EMAIL_SERVICE_URL` is the service's HTTPS origin, without a path or query string. The current Builder accepts only approved Webstudio email Worker origins, including its version URLs. It rejects arbitrary self-hosted origins. Therefore, implementing this endpoint alone does not currently let a self-hosted service replace Webstudio's service; Builder URL validation must also support that origin.

##### Request body

| Field | Required | Type and meaning |
| --- | --- | --- |
| `to` | Yes | Array of 1–50 mailbox objects. Each has a valid `address` email string and optional `name`. |
| `subject` | Yes | Nonempty email subject string, up to 998 characters. |
| `text` | Yes | Plain-text email body string. |
| `replyTo` | No | Mailbox object with a valid `address` email string and optional `name`. |
| `fromName` | No | Display name for the service's configured sender address, 1–256 characters. |
| `headers` | No | Object with the nonempty `X-Message-ID` string used for message correlation. |
| `attachments` | No | Array of up to 32 objects. Each has a nonempty `filename` (up to 255 characters), a `contentType` string, and standard Base64 `contentBase64`. Do not include a data URL prefix. |

The complete JSON request must be no larger than 7 MiB. The service chooses and verifies its sender address; the request does not set a From address.

Example request:

```json
{
  "to": [{ "address": "team@example.com", "name": "Team" }],
  "subject": "New message",
  "text": "Hello from Ada.",
  "replyTo": { "address": "ada@example.com", "name": "Ada" },
  "fromName": "Example Website",
  "headers": { "X-Message-ID": "0123456789abcdef" },
  "attachments": [
    {
      "filename": "note.txt",
      "contentType": "text/plain",
      "contentBase64": "aGVsbG8="
    }
  ]
}
```

##### tRPC response

Return the standard tRPC result envelope. Its `result.data` contains the delivery result.

Success — HTTP `200 OK`:

```json
{
  "result": {
    "data": {
      "ok": true,
      "status": 200,
      "statusText": "OK",
      "data": { "id": "provider-message-id" }
    }
  }
}
```

A delivery failure is still a successful tRPC procedure call: return HTTP `200 OK` with `ok: false` and the delivery status in the nested result.

```json
{
  "result": {
    "data": {
      "ok": false,
      "status": 429,
      "statusText": "Email sending limit reached",
      "data": {
        "error": {
          "code": "email_rate_limited",
          "message": "Email sending limit reached"
        }
      }
    }
  }
}
```

Authentication, request, and transport failures use a non-2xx HTTP status and an error response with a human-readable `error.message`. The Builder treats these as call failures; it does not confuse them with a completed email delivery result.

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
