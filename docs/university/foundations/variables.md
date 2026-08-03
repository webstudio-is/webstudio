---
description: Data variables enable the definition and use of a value throughout the page.
---

# 🔡 Data variables

{% hint style="info" %}
**Hint:** [CSS variables](css-variables.md) are different than Data variables. They enable the reuse of values in the Style Panel.
{% endhint %}

Data variables are defined on any instance in the navigator such as Global Root, Body, or Heading. Variables can be found on the right panel in the settings tab.

<figure><img src="../../.gitbook/assets/variables-settings-panel.png" alt="Variables in the builder"><figcaption></figcaption></figure>

## Variable scope

Variables are available within the instance they are defined on and any of its children. They are _not_ available in the parent.

If you define a variable on the Global Root, it will be available on all pages and can be used within [Slots](../core-components/slot.md).

{% hint style="info" %}
To access variables in the Page Settings, the variable must be defined on the Body of the page.
{% endhint %}

## Global data variables

Variables defined on the **Global Root** are accessible across all pages in your project. This is powerful for:

- **Reusable contact information** – Define your email, phone, or address once and use it everywhere
- **Site-wide settings** – Store company name, social links, or other global data
- **CMS configuration** – Set up API endpoints that all pages can access
- **Slot compatibility** – Global variables work within Slots, enabling dynamic content in reusable components

### Setting Up Global Variables

1. In the Navigator, select **Global Root** (above Body)
2. In the Settings panel, add a new variable
3. Choose the variable type (String, JSON, Resource, etc.)
4. The variable is now accessible on any page

### Use Cases

{% embed url="https://www.youtube.com/watch?v=jRzMROoKwsQ" %}

- **Contact email**: Define once, bind to all contact forms and footers
- **Simple CMS**: Use JSON variables on Global Root for site-wide data that displays in Slots
- **API keys**: Store Resource configurations globally for consistent data fetching

## Variables

### System

System variable is a unique variable in that it exists by default, while all other variables are added by the user.

System variable contains the following:

- **Params** – Key/value pairs that are defined in Dynamic Page URLs.
- **Search** – Key/value pairs of query parameters that may exist in the URL.
- **Origin** – The URL of the current site. It will display whatever the actual URL is, so in the builder, it will be the internal wstd.io domain, but on the published site, it will be the current origin, likely a custom domain.
- **Pathname** – The current page's path (e.g., `/blog/my-post`). Useful for conditional logic based on the current URL.

### String

A String variable holds text data, which can be used for content like titles, descriptions, and labels.

### Number

A Number variable stores numeric values, including integers and decimals. It's useful for calculations, counters, and any numeric data that components might need to display or use in logic.

### Boolean

A Boolean variable represents a true or false value. It is ideal for toggling states, such as visibility.

### JSON

A JSON variable allows for structured data in JSON format. It is ideal for creating simple data structures used with [Collections](../core-components/collection.md) to iterate over each item, such as creating a dynamic gallery.

### Resource

A Resource variable gets its value from a fetch request, allowing data from a remote system to be used within Webstudio. For example, Resource can be used to interact with a REST API. While it can also be used to interact with a GraphQL API, it’s recommended to use the [GraphQL Resource](variables.md#graphql) instead.

There are several fields available to configure the fetch request.

{% hint style="info" %}
**Shortcut:** The URL field supports pasting in a cURL command. Doing so will automatically populate the various fields within the Resource. Many API docs will provide you with a cURL command, so look out for it to save time.
{% endhint %}

{% hint style="info" %}
**Copy & Paste:** Resources can be copied and pasted between projects. Select an instance with a Resource variable defined, copy it, and paste into another project – the Resource configuration will be included.
{% endhint %}

- URL – Where the resource is located.
- Method – A [request method](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods). Refer to the third-party API docs to find the suitable method.
- Search Params - Key/value pairs used for providing additional parameters as part of the URL. Values can be bound to other variables.
- Cache Max Age allows you to define your own cache lifetime.
- Headers – Key/value pairs such `Content-Type application/json`. Refer to [Request Headers](https://developer.mozilla.org/en-US/docs/Glossary/Request_header) for more info.

{% include "../../.gitbook/includes/the-requests-including-any....md" %}

#### Response

Once the Resource fetches data, you'll use the [Expression editor](expression-editor.md) to bind data from the response to your website. See [Binding](expression-editor.md#binding) for more information.

#### Caching

You may be wondering whether every visit to your blog results in an API call to your CMS or if the content is cached in Webstudio.

When you configure a Resource, the data is fetched using Cloudflare Workers, which has a built-in [caching system](https://developers.cloudflare.com/workers/reference/how-the-cache-works/).

By default, several factors determine what gets cached and for how long, but one of the primary factors is what the origin system instructs the requesting entity to cache. In other words, the headless CMS tells Cloudflare Workers what can be cached, if anything, and for how long.\
\
If you set a custom **Cache Max Age** value, it will define your cache lifetime instead of relying on API response headers.

Webstudio sees approximately 45% of sub-requests (i.e., fetches from Cloudflare Workers) served from the cache. This means that, on average, roughly half of the time someone visits a page that uses Resources, such as a blog post, the request will go through to the origin/CMS.

### GraphQL

A GraphQL Resource variable gets its value from a GraphQL API, allowing data from a remote system to be used within Webstudio. While similar to [Resource](variables.md#resource), it’s unique in that the available fields are specifically designed for interacting with GraphQL APIs.

There are several fields available to configure the fetch request.

- **URL** – Where the resource is located.
- **Query** – A GraphQL query.
- **Variables** – A JavaScript object containing variables that will be passed into the request. This is commonly used to pass in parameters in a URL within a Dynamic Page. For example `{ slug: system.params.slug }` See [System Variable](variables.md#system) for more info.

{% include "../../.gitbook/includes/the-requests-including-any....md" %}

### System Resource

A System Resource variable gets its value from internal data.

Available system resources:

- **Sitemap** – Contains data about the static pages on the website, commonly used to build a custom sitemap that combines dynamic data with static data. Refer to the [XML Node component](../core-components/xml-node.md#including-the-static-sitemap) for more info.
- **Current Date** – Returns the current date/time, useful for displaying "today's date" or calculating relative times. Can be formatted using the [Time component](../core-components/time.md).

## Related

- [Expression editor](expression-editor.md) – Bind variables to components and create expressions
- [CMS](cms.md) – Use Resources to fetch content from external systems
- [Collection](../core-components/collection.md) – Iterate over JSON or Resource data
- [CSS variables](css-variables.md) – Define reusable style values (different from Data variables)
- [Slot](../core-components/slot.md) – Access global variables in reusable components
