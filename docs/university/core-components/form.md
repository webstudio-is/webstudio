---
description: Collect form fields and submit them to HTTP or email resources.
---

# Form

Use **Form** to send visitor input to HTTP or email [resources](../foundations/cms.md#resources). Add it from **Components > Forms**. Each newly inserted Form includes named name, email, subject, and message fields, a submit button, editable success and error messages, and two selected email resources. One sends to project settings recipients (or the site owner); the other sends to the submitted email address. You can edit or remove either action.

## Configure actions

1. Use the two email resources included in a new Form, or create HTTP, email, or GraphQL resources in **Variables**, on the Form or an ancestor.
2. Select the Form. In **Properties & Attributes > Action**, use the plus menu to choose up to ten visible resources. Each resource can be selected once; use the row control to remove an action. Edit a resource in **Variables**.
3. Give each input a **Name**. Its name identifies the submitted value in `formData`.
4. Submit the Form in Builder Preview to test the current draft, or publish and test the deployed site.

With selected actions, the Form starts independent destinations in parallel. Every HTTP destination receives a POST request. With no actions selected, the Form uses **Navigation** mode: a GET submission updates the current page's query string using its named fields. A resource created inside the Form can bind `formData` and the safe `browserInfo` values (visitor IP, user agent, language, and referrer). A resource on an ancestor can be selected, but cannot bind that Form's data.

By default, a Form-scoped HTTP resource forwards all submitted fields. It sends JSON for text values and multipart data when files are included. Edit the resource body to choose or transform fields, or set its body format if the receiving service requires one. An HTTP resource outside the Form uses its own configured body.

For a selected email resource that sends to project or custom recipients, an unset body uses automatic text containing the submitted Form fields and browser information. This default works whether the resource is defined on the Form, an ancestor, or global root. Set the resource body to customize the message, including an explicitly empty body. To use `formData` or `browserInfo` in a resource expression, define the resource on the Form; resources on an ancestor or global root cannot bind that Form’s data.

### Send browser information to a destination

In a resource created inside the Form, add these headers in the resource editor when your destination needs them:

| Header | Value expression |
| --- | --- |
| `X-Forwarded-For` | `browserInfo.ip` |
| `User-Agent` | `browserInfo.userAgent` |
| `Accept-Language` | `browserInfo.language` |

These values are sent only when you configure the headers. `browserInfo` also provides `referrer`. It does not expose cookies, authorization, or raw request headers. On Cloudflare Workers, `browserInfo.ip` comes from Cloudflare's `CF-Connecting-IP` request header. The generated React Router Cloudflare Worker supplies the Cloudflare hosting context; the Remix Cloudflare adapter also supplies it. On Node-based hosts, including the generated Docker, Netlify, and Vercel adapters, no trusted visitor-IP source is configured, so `browserInfo.ip` is absent. The Form does not derive it from visitor-supplied `X-Forwarded-For` or `X-Real-IP` headers. If an IP header is required on another host, configure a trusted source at the hosting boundary before relying on it.

On a published Webstudio Cloud site, an email resource sends through Webstudio's private Cloudflare email service when the `EMAIL_SERVICE` binding is configured. Set project recipients and Reply to in [project settings](../foundations/project-settings.md#emails); set subject and body on the email resource. The resource Reply to override is empty by default. The server rejects a submission if an email resource cannot send because the binding is missing. Other hosts need their own server-side email integration; a static export cannot send managed Form email. [Existing Webhook Forms](webhook-form.md) keep their separate behavior.

Each email from a Form submission includes an `X-Message-ID` header. Email actions from the same submission share the header value, and a retry keeps it. The configured subject stays unchanged.

The **Visitor** email resource in a newly inserted Form uses its named `email` input. To configure another Form manually, add an email resource in **Variables**, select **Visitor** as its recipient, choose one named email input, and add that resource to the Form's Action. The server requires exactly one valid address in the chosen field. A fixed preamble says the request came from the website and includes its URL. The resource body starts empty; you can add plain text and bindings after the preamble. When a Form includes file inputs, submitted files are attached to the outgoing email resource message by default. Turn off ‘Attach submitted files’ to omit them. It runs alongside other actions; a delivery error appears in `errors` without making the overall Form submission fail. It requires Webstudio Cloud email service configuration.

A Form can send up to **five team-recipient deliveries** across all of its email resources. Duplicate addresses count as separate deliveries; one visitor-addressed email resource is allowed in addition. The server checks this total before running any destination. Webstudio Cloud also limits email to **50 recipient deliveries per project, per Cloudflare location, in a rolling 60-second window**. A rate-limited primary email resource fails before delivery and makes the Form show its error state; a visitor-addressed email resource failure remains nonfatal. Other parallel destinations may still finish.

## Inputs and responses

Add inputs from **Components > Forms**. Each value you want to send needs a **Name**. Inputs with the same name keep all their selected values in form order. An unchecked checkbox group remains an empty list.

For uploads, add **File Input** and set **Name**, **Required**, **Accept**, and **Multiple** in Settings. **Accept** guides the browser's file picker; it does not validate file types on the server. A required empty file input blocks submission. An optional empty file input submits without a file.

The entire managed Form request is limited to **25 MiB**, including all selected files, other fields, and multipart encoding. This is a combined limit, not an allowance for each file: selecting multiple files can exceed it even when each file is smaller than 25 MiB. If the request is too large, the server rejects it before sending to any resource and the Form reports `Form submission is too large`. Reduce the number or size of files and submit again. Outbound HTTP resource request bodies have a separate 25 MiB limit, and the receiving service may impose a lower limit. Cloud email resources have additional limits of 32 attachments, 5 MiB of encoded email content, and a 7 MiB service request. The server checks these limits before sending to any selected destination.

Cloud email can also fail because the provider rejects a recipient or Reply to address, suppresses a recipient, reaches an account sending limit, or is temporarily unavailable. The Form reports the resulting resource error and does not claim successful owner delivery. A timeout may leave delivery uncertain; its single retry can produce a duplicate email with the same `X-Message-ID` header.

The inserted Form has **Form content**, **Success message**, and **Error message** sections. When every primary destination succeeds, the success state appears; otherwise the error state appears. A failed visitor-addressed email resource is reported in `errors` but does not change the overall success state. The Form exposes `formState` (the current Form state: initial, success, or error), `results` (responses from selected actions, in order, including each resource's HTTP status code and response body), and `errors` (failed actions in order, including each resource's HTTP status code, response body, and message). A configured **Success redirect** runs only after overall success. Without a redirect, successful submissions refresh the current page's resources without a full-page reload or a second submission.

## Hosting and plain HTML forms

Managed Form submission requires a running server endpoint on the published site. Webstudio generates a same-origin POST endpoint for each Form page in a dynamic JavaScript application. The host must run that application and route POST requests to it; a [static export](../self-hosting/README.md#static-site-limitations) has no submission endpoint and cannot deliver Form resources. Resource credentials and outbound requests stay on the server.

For ordinary browser form behavior, add **Element**, set its tag to `form`, and configure native HTML attributes such as `action`, `method`, and `enctype`. That form follows the browser's validation and navigation behavior and can be used on a static site when its action points to a working destination.

## Related

- [Input](input.md) – Name fields and choose input types
- [Element](element.md) – Use native HTML form behavior
- [Webhook Form](webhook-form.md) – Configure an existing legacy form
- [Self-Hosting](../self-hosting/README.md) – Choose a dynamic or static export
