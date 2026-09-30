---
description: Configure HTTP response headers and route-specific policies for a published site.
---

# HTTP response headers

HTTP response headers are metadata sent with a page response. Browsers and other clients use them to decide how to handle the response—for example, whether a page can appear inside an iframe, how to handle referrers, or how long to cache content. Headers are sent by the server; they are different from the visible content on your page and from HTML added to the page's `<head>`.

Use **Project settings > Headers** to add response header rules to your published site.

## Add a header rule

1. Open **Project settings** and select **Headers**.
2. Enter a path pattern, a header name, and its value.
3. Select **Add**.
4. Publish your site for the rule to take effect.

To change a rule, remove it with the trash button and add it again with the updated values.

Header names are case-insensitive. Suggestions in the header-name field are common choices, not a complete allowlist; you can enter other valid header names too. Webstudio reserves platform-managed and connection-specific headers, as well as headers that describe response-body framing, such as `Content-Length` and `Transfer-Encoding`.

## Choose which paths receive a header

The path pattern determines which page responses receive the rule. Patterns use the same syntax as [authentication routes](project-settings.md#authentication).

| Pattern | Applies to |
| --- | --- |
| `/` | The home page only |
| `/about` | The exact `/about` path |
| `/blog/*` | `/blog` and all paths under `/blog/` |
| `/*` | Every path on the site |

Add separate rules to use the same header on different paths. If several matching rules set the same header, the last matching rule in the list wins. A route-specific value replaces the value that would otherwise apply to that response; write the full value you want the browser to receive.

## Webstudio Cloud defaults

On Webstudio Cloud, responses receive these defaults when you have not configured the corresponding header:

| Header | Default value | Purpose |
| --- | --- | --- |
| `Content-Security-Policy` | `frame-ancestors 'self'` | Allows pages to be framed by the same site. |
| `X-Frame-Options` | `SAMEORIGIN` | Legacy framing protection for same-origin embedding. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer details sent to another origin. |

`X-Powered-By`, `X-Content-Type-Options`, and `Strict-Transport-Security` are managed by Webstudio Cloud and cannot be configured in this section.

On Webstudio Cloud, the defaults and custom headers on staging domains are free. Custom header rules on a custom domain require Pro.

## Example: allow a trusted site to frame one page

By default, your pages can be framed by your own site. This helps protect visitors from **clickjacking**: an attacker could place your site inside a hidden or misleading frame and trick a visitor into clicking a control on your site without realizing it.

Sometimes a trusted analytics tool offers an iframe-based heatmap viewer. The viewer needs to display your page in a frame so it can place click data over the page. You can allow that viewer while leaving the rest of your site protected:

1. Add a rule for the page you want the viewer to show, for example `/campaigns/spring`.
2. Set the header name to `Content-Security-Policy`.
3. Set its value to `frame-ancestors 'self' https://analytics.example.com`, replacing the example origin with the exact origin of the trusted viewer.
4. Select **Add** and publish.

`frame-ancestors` lists the origins allowed to frame the page. Keep `'self'` if your own site should still be allowed. If the page is nested inside more than one frame, every ancestor must be allowed by the policy. Use a route pattern such as `/*` only when the same embedding rule should apply across the entire site.

Webstudio also sends `X-Frame-Options: SAMEORIGIN` by default. Modern browsers ignore `X-Frame-Options` when an enforced CSP includes `frame-ancestors`, so the explicit CSP rule allows the trusted origin. Older browsers that do not support `frame-ancestors` may still follow `X-Frame-Options` and block external framing. See the [CSP specification](https://www.w3.org/TR/CSP/#frame-ancestors-and-frame-options) and [MDN's `frame-ancestors` reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors).

## Publish and verify

Publish after adding or changing a rule. Then request the published page and inspect the response headers. For example:

```sh
curl -sS -D - -o /dev/null https://example.com/campaigns/spring
```

Check that the response includes the header and value you configured. Use a `GET` request as above; a `HEAD` request may not follow the same response path as a page load.

## Hosting behavior and limits

Webstudio Cloud applies configured headers to site responses, including redirects and site errors. Static assets served by the CDN keep their existing headers.

For a CLI project, Webstudio generates the configuration in `app/__generated__/$resources.headers.server.ts`. Your server or hosting adapter must apply those rules to responses, and any proxy or CDN in front of it must preserve them. Other hosting templates and static exports do not apply the settings automatically.

You can add up to 100 rules. Header values must be non-empty, cannot contain line breaks or characters outside Latin-1, and can be up to 8 KB; all rules combined are limited to 16 KB. Cookies, connection-specific headers, and response-body framing headers cannot be configured.

## Related

- [Project settings](project-settings.md)
- [Authentication routes](project-settings.md#authentication)
- [Publishing & custom domains](publishing-and-custom-domains.md)
