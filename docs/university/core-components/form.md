---
description: Collect form fields and submit them to HTTP or Email Resources.
---

# Form

Use **Form** to send visitor input to HTTP or Email [Resources](../foundations/cms.md#resources). Add it from **Components > Forms**. The inserted Form includes named inputs, a submit button, and editable success and error messages.

## Configure submission

1. Select the Form and open **Settings > Submission**.
2. Choose an existing Resource or select **Create Resource in Form**. Add up to five destinations.
3. Give each input a **Name**. Its name identifies the submitted value in `formData`.
4. Publish the site and submit the form there to test it.

The Form starts independent destinations in parallel. An empty destination list is reported in Settings and shows an error if a visitor tries to submit; it does not dispatch or navigate. Every HTTP destination receives a POST request. A Resource created inside the Form can bind `formData` and the safe `browserInfo` values (visitor IP, user agent, language, and referrer). A Resource created elsewhere can still be selected, but cannot bind that Form's data.

By default, a Form-scoped HTTP Resource forwards all submitted fields. It sends JSON for text values and multipart data when files are included. Edit the Resource body to choose or transform fields, or set its body format if the receiving service requires one. An external Resource uses its own configured body.

### Send browser information to a destination

In a Resource created inside the Form, add these headers in the Resource editor when your destination needs them:

| Header | Value expression |
| --- | --- |
| `X-Forwarded-For` | `browserInfo.ip` |
| `User-Agent` | `browserInfo.userAgent` |
| `Accept-Language` | `browserInfo.language` |

These values are sent only when you configure the headers. `browserInfo` also provides `referrer`. It does not expose cookies, authorization, or raw request headers. On Cloudflare Workers, `browserInfo.ip` comes from Cloudflare's `CF-Connecting-IP` request header. The generated React Router Cloudflare Worker supplies the Cloudflare hosting context; the Remix Cloudflare adapter also supplies it. On Node-based hosts, including the generated Docker, Netlify, and Vercel adapters, no trusted visitor-IP source is configured, so `browserInfo.ip` is absent. The Form does not derive it from visitor-supplied `X-Forwarded-For` or `X-Real-IP` headers. If an IP header is required on another host, configure a trusted source at the hosting boundary before relying on it.

On a published Webstudio Cloud site, an Email Resource sends through Webstudio's private Cloudflare Email Service when the `EMAIL_SERVICE` binding is configured. Set recipients, Sender, subject, and body in [Project Settings](../foundations/project-settings.md#emails) or override them on the Resource. The server rejects a submission if an Email Resource cannot send because the binding is missing. Other hosts need their own server-side email integration; a static export cannot send managed Form email. [Existing Webhook Forms](webhook-form.md) keep their separate behavior.

Each owner notification keeps its configured subject text and adds a short, unique reference in brackets. Two submissions with the same values, even close together, receive different references. A retry within one submission keeps the same reference. Visitor confirmations keep their fixed subject without this suffix.

The Form's **Visitor confirmation email field** setting is off by default. Select a named email input inside that Form to address one acknowledgement to the submitted email value. The server requires exactly one valid address in that field. It sends confirmation only after every selected Resource succeeds. Project Settings supplies its fixed subject and plain-text body; the default body includes the published site URL. An explicitly saved body is sent literally, even when its text matches the default. Submitted fields, browser information, and files are never included. A confirmation delivery error appears in `errors` without changing a successful primary submission into a failure. Confirmation requires Webstudio Cloud email service configuration.

## Inputs and responses

Add inputs from **Components > Forms**. Each value you want to send needs a **Name**. Inputs with the same name keep all their selected values in form order. An unchecked checkbox group remains an empty list.

For uploads, add **File Input** and set **Name**, **Required**, **Accept**, and **Multiple** in Settings. **Accept** guides the browser's file picker; it does not validate file types on the server. A required empty file input blocks submission. An optional empty file input submits without a file.

The entire managed Form request is limited to **25 MiB**, including all selected files, other fields, and multipart encoding. This is a combined limit, not an allowance for each file: selecting multiple files can exceed it even when each file is smaller than 25 MiB. If the request is too large, the server rejects it before sending to any Resource and the Form reports `Form submission is too large`. Reduce the number or size of files and submit again. Outbound HTTP Resource request bodies have a separate 25 MiB limit, and the receiving service may impose a lower limit. Cloud Email Resources have additional limits of 32 attachments, 5 MiB of encoded email content, and a 7 MiB service request. The server checks these limits before sending to any selected destination.

Cloud email can also fail because the provider rejects a recipient or Sender, suppresses a recipient, reaches an account sending limit, or is temporarily unavailable. The Form reports the resulting Resource error and does not claim successful owner delivery. A timeout may leave delivery uncertain; its single retry can produce a duplicate email with the same submission reference.

The inserted Form has **Form Content**, **Success Message**, and **Error Message** sections. When every destination succeeds, the success state appears; otherwise the error state appears. The Form exposes an aggregate `status`, ordered `results` with each Resource's status code and response body, and `errors` for failed destinations. A configured **Success Redirect** runs only after overall success. Without a redirect, successful submissions refresh the current page's Resources without a full-page reload or a second submission.

## Hosting and plain HTML forms

Managed Form submission requires a running server endpoint on the published site. Webstudio generates a same-origin POST endpoint for each Form page in a dynamic JavaScript application. The host must run that application and route POST requests to it; a [static export](../self-hosting/README.md#static-site-limitations) has no submission endpoint and cannot deliver Form Resources. Resource credentials and outbound requests stay on the server.

For ordinary browser form behavior, add **Element**, set its tag to `form`, and configure native HTML attributes such as `action`, `method`, and `enctype`. That form follows the browser's validation and navigation behavior and can be used on a static site when its action points to a working destination.

## Related

- [Input](input.md) – Name fields and choose input types
- [Element](element.md) – Use native HTML form behavior
- [Webhook Form](webhook-form.md) – Configure an existing legacy form
- [Self-Hosting](../self-hosting/README.md) – Choose a dynamic or static export
