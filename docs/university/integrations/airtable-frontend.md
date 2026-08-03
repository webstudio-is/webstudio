---
description: >-
  Learn how to use Webstudio's advanced visual builder to create an Airtable
  frontend without writing code, including an overview page with filters, a
  details page, and a sitemap.
cover: ../../.gitbook/assets/airtable-frontend-cover.png
coverY: 0
---

# How to build a frontend for Airtable using Webstudio

{% hint style="success" %}
A lightweight Airtable template is in the Marketplace. To start a new project, [clone the template](https://wstd.us/airtable-template). To integrate with an existing project, visit the Marketplace and insert the various pages.
{% endhint %}

By the end of this tutorial, you will have the following using your [Airtable](https://airtable.com/) database and [Webstudio](https://webstudio.is/):

- **An overview page** – One page that contains all the records in Airtable, each with a link to view that record on a details page (a dynamic page).
- **A details page** – A template displaying the record/row matching the record viewed. If the user is on /products/mouse, the Dynamic Page will fetch the Airtable record matching "mouse" and display its contents.
- **A filter on the overview page** – A search field that lets users search the backend (Airtable) for records.
- **A sitemap** – A dynamic sitemap containing the various records in Airtable.

{% embed url="https://vimeo.com/949913677" fullWidth="true" %}
Video tutorial
{% endembed %}

## Webstudio is a visual builder that connects to Airtable

Webstudio is solely focused on creating a visual builder for the frontend. It's backend agnostic, meaning we don't lock you into using any one backend/CMS/database.

In the case of Airtable, this enables you to leverage your current data and the ease of use that comes with it. Webstudio enables you to build a custom frontend for your Airtable data without writing code. Webstudio is mainly a no-code platform, however, it's also optionally a low-code platform to enable custom logic.

Webstudio is open source, has all CSS properties, and is dynamic at the speed of static.

## Why Airtable

Airtable is a highly maintainable way of managing tabular data such as team members, products, portfolio projects, business data, and _many_ other types of data.

Many data types can benefit from displaying them on a frontend/website.

## Steps to building an Airtable frontend using Webstudio

### 1 Create a dynamic page

In this step, you will create a [Dynamic Page](../foundations/cms.md#dynamic-pages) in Webstudio. Think of it as your record template – one page that dynamically changes based on the URL. The URL will contain a dynamic path, and its value will be used to get the record from Airtable.

Go to your Webstudio project > Pages > Create a new page.

Add a path with a minimum of two segments in the Dynamic Path field. This example uses the path `/products/:slug`.

<figure><img src="https://images.surferseo.art/50c2d540-a187-4a67-8f0a-7b82c94fe6f2.png" alt="Dynamic path of /products/:slug"><figcaption></figcaption></figure>

1. The first segment should be something to describe your records (e.g., `products`)
2. The second is a dynamic component. You can name it whatever. This example uses `:slug`. The value will be used in the following steps.

### 2 Fetch Airtable data

In this step, you will configure a [Resource](../foundations/cms.md#resources) in Webstudio to get data from Airtable.

**Create a Resource variable**

Go to the Navigator on the left > select Body > Settings on the right > and create a new variable with any name (this example uses "Airtable Product"), and in type, use Resource.

While the URL and remaining fields can be manually entered, there is also a shortcut – you can paste in a curl command, and Webstudio will automatically parse it and populate the respective fields. To get the curl command custom to your Base, go to your Airtable Base > Help > API documentation > click on your Table on the left > then click "List records".

<figure><img src="https://images.surferseo.art/9825e416-8da0-4a5d-87e0-31ff3a8b8205.png" alt="Airtable curl command"><figcaption></figcaption></figure>

Copy the curl command as shown in the image, then paste it into the URL field in the Resource.

Now, you need to add several customizations to it.

First, replace `YOUR_SECRET_API_TOKEN` with your API token. Refer to [Airtable's documentation](https://support.airtable.com/docs/creating-personal-access-tokens) for generating a token. Make sure you keep `Bearer` in front of the token.

<figure><img src="https://images.surferseo.art/84dc1cba-c30f-4e13-9184-6ccd618b66bc.png" alt="Airtable authorization Bearer" width="375"><figcaption></figcaption></figure>

Second, you must modify the URL to filter by the currently viewed URL. So, for example, if somebody is viewing `/products/wireless-mouse`, the URL needs to filter Airtable records using `wireless-mouse`.

Click the "+" in the URL field to open up the [**Expression editor**](../foundations/expression-editor.md)**.**

Use the following as a template to create your dynamic URL:

```
`https://example.com?filterByFormula={YOUR_COLUMN_NAME}="${system.params.YOUR_DYNAMIC_PATH}"`
```

Be sure to:

- Use your URL
- Replace `YOUR_COLUMN_NAME` with the column you want to filter by. It's best to have a URL-friendly column in your Airtable, meaning it only contains alphanumeric characters and dashes.
- Replace `YOUR_DYNAMIC_PATH` with what you created in the Dynamic Path. If you used `:slug`, you will enter "slug".

**In plain text, the Expression will say, "Hey, Airtable, get the record where the slug value equals the currently viewed slug."**

**Add a test URL value**

Nothing will be retrieved until we give it a test slug value. To do this, go to the [Address Bar](../foundations/cms.md#address-bar) and manually enter one of the values from the Airtable column you are filtering by.

<figure><img src="https://images.surferseo.art/74e10fcc-00a2-4319-81d6-e0b570a5dc13.png" alt="Adding a test param slug which is a value from my Airtable Base" width="375"><figcaption></figcaption></figure>

Now, go to your variable and inspect it.

<figure><img src="https://images.surferseo.art/5a601a53-1994-493e-8a2c-cc8760d62542.png" alt="Response from Airtable API call"><figcaption></figcaption></figure>

You should see data within "records" like the image shows. If you are not seeing data, then there is likely an issue with mapping the value from your dynamic path to the dynamic URL. If you see an error, read it and try to correct it.

Now that you are getting data, you can move to the next step, mapping or "binding" the data to the various components within Webstudio.

### 3 Bind Airtable data to Webstudio components

[Binding](../foundations/cms.md#binding-data) enables you to connect or map values from the Airtable response (aka the Airtable data) to the Webstudio components to build your frontend.

**Bind data to components**

First, add the various [components](../core-components/) you want on your page. This example uses a Header, Paragraph, Text Block, and Image.

Here's a page with the various components with their default values:

<figure><img src="https://images.surferseo.art/cb93cbff-d57a-4efb-ad77-ce3b6b6a481b.png" alt="Dynamic page with components without bindings"><figcaption></figcaption></figure>

For each component, go to Settings and the field to which you want to attach an external value and click the "+" to open Bindings.

In the [Expression editor](../foundations/expression-editor.md), click or type the variable you created previously. From there, "drill down" or access the child fields within the variable by typing a period and selecting the following field (repeat until you get the value).

Here is what that looks like:

<figure><img src="https://images.surferseo.art/51e88932-60cb-4929-94a2-dd40019e13e0.png" alt="Binding Airtable data to Webstudio components"><figcaption></figcaption></figure>

Continue this process for all components. All fields in Webstudio can have Airtable fields bound to them, including page fields like Title.

**Bind data to Page Settings**

Here are the Page Settings bound to Airtable values:

<figure><img src="https://images.surferseo.art/40573512-4811-43fa-a7d7-7d928e8ba9d3.png" alt="Page Settings bound to Airtable values"><figcaption></figcaption></figure>

There is one more place to bind: the status code. You want to ensure that if there is no matching value within your Airtable, the page returns a 404, not a 200.

To do this, go to Page Settings > Status Code > "+" and enter an expression.

The format will be like this:

```javascript
<Airtable Slug Value> ? 200 : 404
```

For this example, it looks like this:

<figure><img src="https://images.surferseo.art/dcd9f284-2c14-46a3-9e35-b3631cf09918.png" alt="Status code for Airtable page."><figcaption></figcaption></figure>

In plain text, the expression says, "If the Airtable value exists, return 200 (found); otherwise, return 404 (not found).

Well done! So far, you have successfully created a Dynamic Page, fetched the data from Airtable, and bound the data to Webstudio Components. In the following steps, these same concepts will be used to create an overview page with your various records all on one page and a sitemap for search engines.

### 4 Create an overview page

<figure><img src="https://images.surferseo.art/57850fff-5fa3-4179-8a29-ac09dc3ed8cb.png" alt="Grid of Airtable products in Webstudio"><figcaption></figcaption></figure>

In this step, you will create a page that lists the various Airtable records and links them so that users can click on them and land on the Dynamic Page containing the proper data.

**Create a new page**

Create a new page and ideally give it the base path of the Dynamic Page. So, if the Dynamic Page uses `/products/:slug`, this new page should use `/products`.

**Create a new Resource variable**

Create a new variable, same as last time, except the URL will _not_ be dynamic. For example, `https://api.airtable.com/v0/appXXXXXXXXXX/BASE_NAME`. This should return a list of all the records which you can see in the inspect tool.

**Setup a Collection**

Add the [**Collection**](../core-components/collection.md) component, which will iterate over a list of the records. So, if you can design what a record should look like once, it will replicate it for each record. You need to bind the list of records to the Collection. Here's what that looks like:

<figure><img src="https://images.surferseo.art/80a98c18-69e4-4176-ace9-a9f25292292a.png" alt="Airtable records attached to Collection"><figcaption></figcaption></figure>

The Collection has a default variable containing the value of the current iteration's record. The default name is "Collection Item"; however, in the screenshot, you can see it was renamed to "Airtable Product" for clarity.

**Bind data to components**

Next, bind the various values to the components, as you learned previously. For the link, you'll need to do something special: prefix the slug with the base path.

Here is what that looks like in this example:

<figure><img src="https://images.surferseo.art/0d08b0e5-7895-4e40-9f1f-05381c2566fc.png" alt="Linking to each Airtable records&#x27; corresponding page"><figcaption></figcaption></figure>

Note that the static value is in quotes ("/products/"), and there is a "+" to glue it together with the dynamic slug value.

**Create dynamic filters**

You may notice the example contains a search field letting users dynamically filter content.

Refer to the following guide to create the filters:

{% content-ref url="../how-tos/using-filters-to-dynamically-display-content.md" %}
[using-filters-to-dynamically-display-content.md](../how-tos/using-filters-to-dynamically-display-content.md)
{% endcontent-ref %}

This page is great to let users browse your records, but we need to create a page for search engines, a sitemap.

### 5 Create a sitemap

Webstudio enables you to visually build a dynamic sitemap using [**Collections**](../core-components/collection.md) and [**XML Nodes**](../core-components/xml-node.md).

Here's how to do it:

1. Go to Marketplace > Pages > CMS Sitemap > and click Sitemap. This will insert a template sitemap.
2. Add a new Resource that fetches your slugs and, optionally, the record's updated time to inform search engines when the last edit was made.
3. Bind those values.

Refer to [this video chapter](https://www.youtube.com/watch?v=QC6Y7BHduLw&t=975s) for a full video demonstration on building a sitemap. While the backend differs in this video, the concepts are the same.

## Start using Webstudio as a frontend for Airtable

With [Webstudio](https://apps.webstudio.is/dashboard), you can build an entire Airtable frontend, including a record overview page, a dynamic page displaying each record, and a sitemap – all without writing code!

The flexibility of Resources enables you to fetch exactly what you need from one or more Airtable Databases and even multiple systems altogether (e.g., Airtable team members and Hygraph for blog posts).

## Resources

- [Using filters to dynamically display Airtable content](../how-tos/using-filters-to-dynamically-display-content.md)
- [Building dynamic pages for Airtable data](https://youtu.be/3mW7cPDXIxY)
- [Using Webstudio Webhook form to send data to an Airtable automation (doc)](airtable-form-webhook.md)
- [Airtable filters API (doc)](https://support.airtable.com/docs/airtable-web-api-using-filterbyformula-or-sort-parameters)

## Related

- [CMS](../foundations/cms.md) – Learn about dynamic pages and Resources in Webstudio
- [Variables](../foundations/variables.md) – Understand how to create Resource variables
- [Collection](../core-components/collection.md) – Display multiple records from Airtable
- [Airtable Form Integration](./airtable-form-webhook.md) – Send form submissions to Airtable
- [Notion Integration](./notion.md) – Alternative database option for Webstudio
