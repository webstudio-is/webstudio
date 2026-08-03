---
description: Learn how to connect a custom domain to your Project.
---

# 🌐 Publishing & custom domains

{% hint style="warning" %}
Many DNS providers do not allow adding a CNAME at the root/apex. If yours doesn’t, jump to [this section](publishing-and-custom-domains.md#dns-provider-doesnt-allow-cname-flattening) for alternate options.
{% endhint %}

## Pre-publish checks

Webstudio checks publishable pages before starting a cloud publish or static
export. These checks detect broken Resource references and invalid HTML nesting
that could make the generated site fail or behave unexpectedly.

- **Errors** stop publishing until you resolve them.
- **Warnings** appear immediately but do not prevent publishing.

When a finding identifies a component, choose **Show element** to close the
publish dialog, open the affected page, select the instance, and scroll it into
view. Fix the problem, then publish again. Draft pages are excluded because
they are not part of the generated site.

## Adding a custom domain

These steps will show you how to add a custom domain to your Project.

### 1. Add a new domain to your Project

Click "Publish" in the top bar, then “Add a new domain”.

Enter the domain or subdomain you want the site to be available at, for example, `www.example.com` or `example.com`.

After entering your domain, you will be provided with DNS records, which can be manually added to your DNS or automatically through Entri.

<figure><img src="../../.gitbook/assets/add-new-domain.png" alt="CNAME and TXT records from new domain" width="362"><figcaption></figcaption></figure>

### 2. Add the DNS records

Next, you need to add the DNS records to your DNS provider either manually or automatically.

#### Option 1: Manually add DNS records

You can configure your custom domain manually by adding the provided `CNAME` and `TXT` records to your DNS.

1. **Open your DNS provider**
2. **Create a `CNAME` record**
   1. Add a new record.
   2. Set the type to `CNAME`.
   3. Copy the Name and Value from Webstudio.
   4. Paste them into the corresponding fields in your DNS provider. Note that the DNS provider might label the Value as "Target" or "Content."
3. **Create a `TXT` record**
   1. Add a new record.
   2. Set the type to `TXT`.
   3. Copy the Name and Value from Webstudio.
   4. Paste them into the corresponding fields in your DNS provider. Note that the DNS provider might label the Value as "Content".

#### Option 2: Automatically add DNS records with Entri

The Entri option makes configuring your domain extremely simple — no puzzling registrar UIs. You can do it without leaving Webstudio Builder in just a couple of clicks.

1. Click “Configure automatically”.
2. Click “Continue” on the Entri configurator. This process will analyze your root domain and detect your DNS settings.
3. Click on the Authorize button to redirect you to your DNS provider site. Log in, if required, and approve the configuration.
4. Return to Webstudio and complete the setup.

### 3. Verify and publish

Click "Check status" and once it's verified, republish your site.

{% hint style="info" %}
Verification may take up to 24 hours but usually takes only a few minutes.
{% endhint %}

{% hint style="warning" %}
You must publish your site _after_ the domain is verified, or else "[Worker not found](publishing-and-custom-domains.md#domain-issues)" will show on the site.
{% endhint %}

{% hint style="info" %}
Publishing currently takes around 45 seconds. During publishing, your Project is built into a JavaScript app and deployed to 300+ servers around the world.
{% endhint %}

Once your site is live, you can visit it by clicking the open icon next to the green checkmark.

---

## Publish to Staging

<figure><img src="../../.gitbook/assets/staging-domain.png" alt="Publish to staging with production unchecked"><figcaption></figcaption></figure>

You can publish your Project to a separate domain for testing before going live by only checking your staging domain, which can be the default Project subdomain or a custom domain.

{% hint style="info" %}
Every Project comes with a subdomain ending in "wstd.io". You can use this subdomain as your site’s staging environment. The domain is automatically no-indexed if you add a custom domain.
{% endhint %}

When publishing the site, optionally select the domain(s) you want to publish to. The workflow for testing/approval would be:

1. Make changes in the Builder
2. Open the publish dialog
3. Ensure only your subdomain is checked
4. Publish and share with your team/client
5. Upon approval, reopen the publish dialog and check your live/production domain.
6. Publish

### Staging Password Protection

All staging sites are protected by password by default. This protection cannot be removed — it's a platform security measure to prevent bad actors from using Webstudio staging domains for phishing attacks impersonating other brands, which is illegal and can result in Webstudio domains being blocked.

To share your staging site:

1. Open the publish dialog
2. Copy the staging link — it already contains the login credentials embedded in the URL
3. Share this link with your team or client — they'll be automatically authenticated without needing to enter credentials

{% hint style="info" %}
Click on the staging domain section in the publish dialog to view the username and password separately if needed.
{% endhint %}

For public access without password protection, publish to a custom domain instead.

---

## Standardizing on root or `www` using Cloudflare

{% hint style="info" %}
Why would you want to do this? Standardizing your domain through Cloudflare is free, flexible, and easy to manage, while also delivering excellent performance.
{% endhint %}

These instructions show you how to standardize your site’s primary domain in Cloudflare by choosing either `www` or the root domain.

{% hint style="info" %}
Note root domain is synonymous with apex, bare, and naked. An example is `example.com`.
{% endhint %}

1. Choose whether you want to use `www` or your root domain
2. Add your choice to Webstudio (e.g., `www.example.com` or `example.com`)
3. Add the provided records to your DNS
4. Redirect the domain you did _not_ add to the domain you added by following the next sections.

### 1: Add a DNS record for the other domain

Cloudflare rules can’t apply to traffic that isn’t proxied through Cloudflare. Therefore, adding a DNS record for the domain you are _not_ using is essential. Cloudflare offers an IP address for this exact use case.

**Create an A record and point it to `192.0.2.1`.**

> This address does not route traffic to an origin server but allows Cloudflare to apply rules, redirects, and Workers to incoming traffic. The equivalent IP address for an AAAA record is 100::. \
> \
> \- [Cloudflare](https://developers.cloudflare.com/fundamentals/setup/manage-domains/redirect-domain/)

Next, choose one of the following options based on your preferred setup.

### 2a: Redirect root to `www`

If you choose `www` as your primary domain, be sure to redirect the root domain to it. For example, `example.com` should redirect to `www.example.com`.

Follow [Cloudflare's guide](https://developers.cloudflare.com/rules/url-forwarding/examples/redirect-root-to-www/) to redirect your root domain to `www`.

### 2b: Redirect `www` to root

Although `www` is just a subdomain like `xyz.example.com`, many users still reference it out of habit. To ensure they reach your site, it’s best practice to redirect `www` to your root domain. To do this, make sure you’ve create the A record with `192.0.2.1` as described above, then follow [Cloudflare’s guide](https://developers.cloudflare.com/rules/url-forwarding/examples/redirect-www-to-root/) to set up a _Rule_ in the Cloudflare dashboard.

---

## Exporting Projects

Webstudio can be self-hosted, putting you in control of your hosting, pricing, security, and compliance.

For more information about exporting and self-hosting, view [Self-Hosting](../self-hosting/).

---

## Removing a domain

To remove a domain from Webstudio:

1. Click “Publish” in the top bar.
2. Click your domain.
3. Click “Remove domain”.

---

## Domain issues

Below are common issues when adding custom domains and how to resolve them.

### DNS provider doesn't allow CNAME flattening

While modern DNS providers like [Cloudflare](https://www.cloudflare.com/) support using CNAME at the apex, such as `example.com` (aka CNAME flattening), others only allow using CNAME with a subdomain, such as `www.example.com`.

#### Providers that don't support CNAME flattening

{% hint style="warning" %}
This list is _not_ comprehensive.
{% endhint %}

- GoDaddy
- Hostinger
- Squarespace
- DigitalOcean
- Namecheap
- IONOS
- Hover

#### Option 1: Switch your DNS provider (without changing your domain registrar)

The easiest way to work around the CNAME limitation is to switch your DNS control over to a provider like [Cloudflare](https://developers.cloudflare.com/fundamentals/get-started/setup/add-site/). This process takes about 10 minutes and is free. Once you have migrated, you can use the original process detailed above to configure it.

{% hint style="info" %}
You can move the DNS (where the DNS records are managed) _without_ needing to move the registration (i.e. where the domain was purchased), though it may make sense to move both.
{% endhint %}

##### Why use Cloudflare

Especially useful for agencies managing multiple client domains:

- Free plan is sufficient for most needs
- Additional CDN features and enhanced security
- Script injection capabilities (Facebook Pixel, Google Analytics)
- Faster DNS and better performance
- Easier management of multiple domains in one dashboard

##### Steps to migrate to Cloudflare

1. Sign up for [Cloudflare](https://www.cloudflare.com/) (free tier is sufficient)
2. Add your site/domain
3. Select the free plan
4. Cloudflare will scan and import existing DNS records automatically (email MX records, etc.)
5. Change nameservers at your registrar to the ones Cloudflare provides
6. Wait 15-20 minutes for propagation
7. Once verified, add Webstudio CNAME and TXT records in Cloudflare

{% hint style="info" %}
DNS propagation typically takes 10-15 minutes, but can take up to 72 hours in rare cases depending on registrar and location.
{% endhint %}

#### Option 2: Publish your website on a `www` subdomain

Go back to [Step 1](publishing-and-custom-domains.md#id-1.-add-a-new-domain-to-your-project), but this time, prefix your domain with `www`.

#### Video Tutorial

The above options are shown in the following video.

{% embed url="https://www.youtube.com/watch?t=5s&v=4PaXK0e49ks" %}

---

## Publishing to a Subdomain

Subdomains are useful for marketing teams who want autonomy over landing pages (e.g., `go.example.com`) while keeping the main site separate.

To publish to a subdomain:

1. Follow the same process as adding a custom domain
2. Use the subdomain (e.g., `go`) as the CNAME name instead of `@` or `www`
3. Add the corresponding TXT record

---

### Worker not found

You may see "Worker not Found" message when opening the site, like this:

<figure><img src="../../.gitbook/assets/worker-not-found.png" alt="Worker not found"><figcaption></figcaption></figure>

Worker not found is due to one of the following reasons:

1. You haven't published your Project after adding a custom domain.
2. You clicked on publish, but it is still in the process of deployment. It usually takes 1 minute to distribute your Project across the globe. Webstudio is utilizing [Cloudflare's](https://workers.cloudflare.com/) advanced Edge network.
3. Your domain was not properly connected or you need to republish.

### **Adding a domain with a country code like `.co.uk`**

Using a second-level domain (SLD) within a country code top-level domain (ccTLD) such as `.co.uk` is fully supported. However, the DNS records provided when adding a domain in the Builder are incorrect.

Here are the provided records and correct records when adding `example.co.uk`:

| Record Type | Provided Value          | Correct Value   |
| ----------- | ----------------------- | --------------- |
| `CNAME`     | `example`               | `@`             |
| `TXT`       | `_webstudio_is.example` | `_webstudio_is` |

## Related

- [Cloudflare Website Builder](https://webstudio.is/cloudflare-website-builder) – Learn about Webstudio's Cloudflare integration
- [Project settings](project-settings.md) – Configure redirects and site settings
- [Share links](share-links.md) – Share projects and manage permissions
- [SEO settings](seo-settings.md) – Optimize your site for search engines
- [Self-Hosting](../self-hosting/) – Export and host your project independently
