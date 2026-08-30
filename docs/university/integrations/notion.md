---
description: >-
  Learn how to use Webstudio's advanced website builder to create a Notion
  frontend, including an overview page with filters, a details page, and a
  sitemap.
cover: ../../.gitbook/assets/notion-website-cover.png
coverY: 0
---

# How to integrate a Notion database with Webstudio

{% hint style="warning" %}
This guide uses properties from a Notion data source. A page's block content requires additional Notion API requests, so fetch it through an API endpoint or automation that returns the complete document to one Webstudio Resource.
{% endhint %}

By the end of this tutorial, you will have the following using your [Notion](https://notion.so/) database and [Webstudio](https://webstudio.is/):

* **An overview page** – One page that contains all the records in your Notion database, each with a link to view that record on a details page (a dynamic page).
* **A details page** – A template displaying the record/row matching the record viewed. If the user is on /events/birthday, the Dynamic Page will fetch the Notion record matching "birthday" and display its contents.
* **A filter on the overview page** – A filter that lets users find events in the past, within the next week, and within the next year.
* **A sitemap** – A dynamic sitemap containing the various database records in Notion to help with search engine indexing

{% hint style="success" %}
A lightweight Notion template is in the Marketplace. To start a new project, [clone the template](https://wstd.us/notion-template). To integrate with an existing project, visit the Marketplace and insert the various pages.
{% endhint %}

{% embed url="https://www.youtube.com/watch?v=j6JcJ32mxLQ" %}
Video tutorial
{% endembed %}

## **Webstudio is a visual website builder that connects to Notion**

Webstudio is solely focused on creating a visual builder for the frontend. It's backend agnostic, meaning we don't lock you into using any one backend/CMS/database. You can build a website on your custom domain and fetch data from your Notion Workspace.

In the case of Notion, this enables you to leverage your current databases and the ease of use that comes with them. Webstudio enables you to build a custom frontend for your Notion data without writing code. Webstudio is mainly a no-code platform, however, it's also optionally a low-code platform to enable custom logic.

Webstudio is open source, has all CSS properties, and is dynamic at the speed of static.

## **Why Notion**

Notion is where many teams and individuals already manage content, typically in preparation for adding it to their website. By integrating the website builder directly with Notion, people can avoid the unnecessary step of manually transferring the data to the website.

## Use Notion data source properties

You can bind properties returned by a Notion data source query directly to Webstudio. A Notion page response includes its properties, but the page's block content is a separate, paginated API response. A complete page-body integration therefore needs to:

1. Query the data source for the page and its properties, such as title, description, and slug.
2. Read the page's child blocks with the page ID returned by that query.
3. Follow pagination and recursively read child blocks when the document contains nested content.

For page bodies, put those requests behind your own API endpoint or automation and return the combined result to Webstudio in one response. Cache the result when appropriate.

## **Steps to building a website using Notion data**

This example uses the Notion events functionality, enabling you or clients to add events to the website without actually having to touch the website.

It can be adapted to other types of data, such as team members, business data, etc.

### **1 Create a dynamic page**

In this step, you will create a [Dynamic Page](../foundations/cms.md#dynamic-pages) in Webstudio. Think of it as your record template – one page that dynamically changes based on the URL. The URL will contain a dynamic path, and its value will be used to get the record from Notion.

Go to your Webstudio project > Pages > Create a new page.

Add a path with at least two segments in the Dynamic Path field. This example uses the path `/events/:slug`.

<figure><img src="https://images.surferseo.art/e92dc1d1-55b2-432c-aa1a-bf8a337ad57c.png" alt="Dynamic path of /events/:slug"><figcaption></figcaption></figure>

1. The first segment should be something to describe your records (e.g., `events`)
2. The second is a dynamic component. You can name it whatever. This example uses `:slug`. The value will be used in the following steps.

### **2 Fetch Notion data**

In this step, you will configure a [Resource](../foundations/variables.md#resource) in Webstudio to get data from Notion.

#### **Create a Resource variable**

Go to the Navigator on the left > select Body > Settings on the right > and create a new variable with any name (this example uses "Notion Data"), and in type, use Resource.

While the URL and remaining fields can be entered manually, you can also paste a curl command and let Webstudio populate the Resource fields. Start with Notion's [Query a data source](https://developers.notion.com/reference/query-a-data-source) reference.

<figure><img src="https://images.surferseo.art/7928e894-7215-48c9-a975-a563c146223d.png" alt="Notion filter database curl command"><figcaption></figcaption></figure>

Copy the curl command as shown in the image, then paste it into the URL field in the Resource.

Now, you need to add several customizations to it.

First, replace `$NOTION_API_KEY` with your API key, which you can get by [creating a new integration](https://www.notion.so/my-integrations). Make sure you keep `Bearer` in front of the API key.

<figure><img src="https://images.surferseo.art/ea114c6f-5edb-4f55-beee-6735cbdd260b.png" alt="Notion authorization Bearer"><figcaption></figcaption></figure>

Second, set the URL to `https://api.notion.com/v1/data_sources/<data-source-id>/query`. Find the data source ID using Notion's API or by copying the linked database information from Notion. It is not necessarily the page ID shown in a browser URL.

Add `Notion-Version: 2026-03-11`, the version required by the current [data source query API](https://developers.notion.com/reference/query-a-data-source), and keep the `Authorization: Bearer <token>` header from the curl example.

Third, you must modify the filter in the body to use the currently viewed URL. So, for example, if somebody is viewing `/events/birthday`, the URL needs to filter Notion records using birthday.

Click the "+" in the URL field to open the [**Expression editor**](../foundations/expression-editor.md)**.**

Use the following as a template to create your dynamic body:

```json
{
  "filter": {
    "property": "Slug",
    "rich_text": {
    "equals": system.params.slug
    }
  }
}
```

Be sure to:

* Replace "Slug" with the column name you are filtering by.
* Replace `system.params.slug` with what you created in the Dynamic Path. You don't need to change anything if you used `:slug`.

**In plain text, the Expression will say, "Hey, Notion, get the record where the Slug value equals the currently viewed slug."**

#### **Add a test URL value**

Nothing will be retrieved until we give it a test slug value. To do this, go to the [Address Bar](../foundations/cms.md#address-bar) and manually enter one of the values from the Notion column you are filtering by.

<figure><img src="https://images.surferseo.art/bf62fff2-537d-40ba-852e-6a0028cb2dc9.png" alt="Adding a test param slug which is a value from the Notion database"><figcaption></figcaption></figure>

The Address Bar value is for testing. Once you publish the site, the value is whatever is in the URL. Anytime you add data to Notion, you don't need to republish your website. Notion data is dynamically fetched when visiting a page.

Now, go to your variable and inspect it.

<figure><img src="https://images.surferseo.art/aae0d39f-6952-445e-bd06-ee13945d0d1a.png" alt="Response from Notion API call"><figcaption></figcaption></figure>

You should see data like the image shows. If you are not seeing data, then there is likely an issue with mapping the value from your dynamic path to the dynamic URL. If you see an error, read it and try to correct it.

Now that you are getting data, you can move to the next step, mapping or "binding" the data to the various components within Webstudio.

### **3 Bind Notion data to Webstudio components**

[Binding](../foundations/expression-editor.md#binding) enables you to connect or map values from the Notion response (aka the Notion data) to the Webstudio components to build your Notion website.

#### **Bind data to components**

First, add the various [components](../core-components/) you want on your page. This example uses a Header, Paragraph, Time, and Image.

Here's a page with the various components with their default values:

<figure><img src="https://images.surferseo.art/75f784da-3e83-4c0b-b523-ceaabe1bd4e7.png" alt="Dynamic page with components without bindings"><figcaption></figcaption></figure>

For each component, go to Settings and the field to which you want to attach an external value and click the "+" to open Bindings.

In the [Expression editor](../foundations/expression-editor.md), click or type the variable you created previously. From there, "drill down" or access the child fields within the variable by typing a period and selecting the following field (repeat until you get the value).

Notion database properties are contained in: `<Your Variable>.results[0].properties`

Here is what that looks like:

<figure><img src="https://images.surferseo.art/6441da4e-4ef4-4b03-af61-338c8af20f6c.png" alt="Binding Notion data to Webstudio components"><figcaption></figcaption></figure>

Continue this process for all components. All fields in Webstudio can have Notion properties bound to them, including page fields like Title.

#### **Bind data to Page Settings**

Here are the Page Settings bound to Notion values:

<figure><img src="https://images.surferseo.art/e7b06a6d-f4a3-4d73-ad9a-0f9e050771d9.png" alt="Page Settings bound to Notion values"><figcaption></figcaption></figure>

There is one more place to bind: the status code. You want to ensure that if there is no matching value within your Notion, the page returns a 404, not a 200.

To do this, go to Page Settings > Status Code > "+" and enter an expression.

The format will be like this:

Copy

```javascript
<Notion Slug Value> ? 200 : 404
```

For this example, it looks like this:

<figure><img src="https://images.surferseo.art/a51a200c-0205-48a5-b848-d6d3c58602ff.png" alt="Status code for Notion page."><figcaption></figcaption></figure>

In plain text, the Expression says, "If the Notion record exists, return 200 (found); otherwise, return 404 (not found).

Well done! So far, you have successfully created a Dynamic Page, fetched the data from Notion, and bound the data to Webstudio Components. In the following steps, these same concepts will be used to create an overview page with your various records on one page and a sitemap for search engines.

### **4 Create an overview page**

<figure><img src="https://images.surferseo.art/8ca6e676-6633-4f96-8c4c-441e7237a0b2.png" alt="Grid of Notion events in Webstudio"><figcaption></figcaption></figure>

In this step, you will create a page that lists the various Notion records and links them so that users can click on them and land on the Dynamic Page containing the proper data.

#### **Create a new page**

Create a new page and ideally give it the base path of the Dynamic Page. So, if the Dynamic Page uses `/events/:slug`, this new page should use /events.

#### **Create a new Resource variable**

Create a new variable, same as last time, except no body field is needed.

{% hint style="info" %}
The Marketplace contains a filter property that sorts, paginates, and filters events based on user input.
{% endhint %}

#### **Setup a Collection**

Add the [**Collection**](../core-components/collection.md) component, which will iterate over a list of the records. You can design what a record should look like once, and it will replicate it for each record. You need to bind the list of records to the Collection. Here's what that looks like:

<figure><img src="https://images.surferseo.art/0ab681b1-5e38-4b79-9281-542d843feb06.png" alt="Notion records attached to Collection"><figcaption></figcaption></figure>

The Collection has a default variable containing the value of the current iteration's record. The default name is "Collection Item"; however, you can rename this to "Event Item" for clarity.

#### **Bind data to components**

Next, bind the various values to the components, as you learned previously. You'll need to do something special for the link: prefix the slug with the base path.

Here is what that looks like in this example:

<figure><img src="https://images.surferseo.art/1863654c-6f61-467b-ba35-7521da438212.png" alt="Linking to each Notion records&#x27; corresponding page"><figcaption></figcaption></figure>

Note that the static value is in quotes ("/events/"), and there is a "+" to glue it together with the dynamic slug value.

### **5 Create a sitemap for search engines**

Webstudio enables you to visually build a dynamic sitemap using [**Collections**](../core-components/collection.md) and [**XML Nodes**](../core-components/xml-node.md).

The sitemap helps Google and other search engines discover pages on your website and understand when they were last updated. Building a sitemap is a key step in making your Notion website SEO-friendly.

Here's how to do it:

1. Go to Marketplace > Pages > CMS Sitemap > and click Sitemap. This will insert a template sitemap.
2. Add a new Resource that fetches your slugs and, optionally, the record's updated time to inform search engines when the last edit was made. You can add a column to your data with the "Last edited time" property, which automatically outputs the last time you edited that record.
3. Bind those values.

Refer to [this video chapter](https://www.youtube.com/watch?v=j6JcJ32mxLQ?t=1140) for a full video demonstration on building a sitemap containing Notion data.

## **Start using Webstudio to build Notion websites**

With [Webstudio](https://apps.webstudio.is/dashboard), you can build a Notion site, including a record overview page, a dynamic page displaying each record, and a sitemap – all without writing code!

The flexibility of Resources enables you to fetch exactly what you need from one or more Notion Databases and even multiple systems together (e.g., Airtable for team members, Hygraph for blog posts, and Notion for events).

## Related

- [CMS](../foundations/cms.md) – Learn about dynamic pages and Resources in Webstudio
- [Variables](../foundations/variables.md) – Understand how to create and use Resource variables
- [Collection](../core-components/collection.md) – Display multiple records from your data source
- [Airtable Integration](./airtable-frontend.md) – Another popular CMS option for Webstudio
- [Hygraph Integration](./hygraph.md) – Build a frontend for Hygraph using Webstudio
