---
description: >-
  Learn how to integrate Flotiq with Webstudio to build dynamic,  content-driven
  websites—visually.
---

# How to integrate Flotiq with Webstudio

This guide demonstrates how to integrate Flotiq with Webstudio to build a fully dynamic, content-driven website.

## **What is Flotiq?**

Flotiq is a headless CMS designed to make content management simple and powerful. It allows you to create, manage, and deliver content through APIs, offering flexibility and scalability.

Paired with Webstudio, you can design dynamic frontends while keeping content stored and managed in Flotiq.

## **Prerequisites**

Before starting, ensure you have the following:

* **Flotiq account** – [Register here](https://flotiq.com).
* **Flotiq API Key** – Learn more about [Flotiq API Keys](https://flotiq.com/docs).
* **Webstudio account** – [Sign up here](https://webstudio.com).

{% hint style="info" %}
> Webstudio’s **Pro tier plan** is required to use the Resource feature. Flotiq does not require a paid plan.
{% endhint %}

## **1. Setting up Flotiq**

### **Create a content type**

Start by creating a content type in Flotiq. For this tutorial, we’ll use Flotiq’s **Blogpost Template**, which includes fields like `title`, `slug`, `excerpt`, `content`, and `headerImage`.

<figure><img src="../../.gitbook/assets/flotiq-create-content-type.png" alt="Create content type in Flotiq"><figcaption></figcaption></figure>

### **Add sample data**

Populate your content type with a few example blog posts to test your integration.

## 2. Setting Up Webstudio

### **Create a new project**

1. Log in to Webstudio and either create a new project or edit an existing one.
2. Choose a template or start with a blank project.

### **Create a Dynamic Page**

[Dynamic pages](../foundations/cms.md) in Webstudio allow you to create a single template that dynamically changes based on the currently viewed URL.

To create a page with a dynamic path, go to **Pages > Add New Page**. In the **Dynamic Path** field, use a parameter to represent the dynamic part of the URL, such as the slug of your blog posts.

<figure><img src="../../.gitbook/assets/flotiq-dynamic-page.jpeg" alt="Create a Page with a Dynamic Path"><figcaption></figcaption></figure>

In the [Address Bar](../foundations/cms.md#address-bar), provide a test value.

<figure><img src="../../.gitbook/assets/flotiq-dynamic-path.png" alt="Set the dynamic path"><figcaption></figcaption></figure>

### **Add a GraphQL Data Variable**

[GraphQL data variables](../foundations/variables.md#graphql) fetch external content.

Go to `Page Settings > Data variables > Add New Variable`.

Next, configure the variable:

* **Name**: A custom name for the variable.
* **Type**: Use `GraphQL` for this integration.
* **URL**: Set to `https://api.flotiq.com/api/graphql`.
* **Headers**: Add a header with `X-Auth-Token` as the key and your Flotiq API Key as the value.
*   **Query**: Use a GraphQL query to fetch data. Here’s an example for the `Blogpost` template:

    ```graphql
    query Post($slug: String = "") {
      blogpost(field: "slug", value: $slug) {
        id
        title
        slug
        excerpt
        headerImage {
            alt
            url
        }
      }
    }
    ```
*   **GraphQL Variables**: Bind the `slug` from the dynamic path:

    ```json
    {
      "slug": system.params.slug
    }
    ```

The variable should be configured as shown in the screenshot below:

<figure><img src="../../.gitbook/assets/flotiq-data-variable.png" alt="Configure a data variable"><figcaption></figcaption></figure>

Test the variable - if it is configured correctly, the fetched Flotiq content will appear in the **Inspect Tool**.

<figure><img src="../../.gitbook/assets/flotiq-inspect-tool.png" alt=""><figcaption></figcaption></figure>

### **Bind Flotiq data to your page**

Once your Flotiq data is fetched, you can [bind](../foundations/cms.md#binding-data) it to your components and page settings.

#### **Bind data to components**

Add components such as headings or images to your page.

To bind data:

* Select a component and navigate to its settings.
* Click the "+" button next to the desired property (e.g., **Text Content**).
* Open the [Expression editor](../foundations/expression-editor.md) and map values from your Flotiq data variable, for example, `VariableName.data.data.blogpost.title`.

{% hint style="info" %}
> For images add an **Image Component**, and bind the **Source Property** to the image URL: `"https://api.flotiq.com/" + VariableName.data.data.blogpost.headerImage[0].url`.
{% endhint %}

<figure><img src="../../.gitbook/assets/flotiq-bind-data.gif" alt=""><figcaption></figcaption></figure>

### **Create a listing page**

Showcase multiple content items, like blog posts or portfolio entries, on a single page by fetching and displaying a list of data.

#### **Add a new Data Variable**

This variable will fetch a list of all objects from your Flotiq content type. Example query for `BlogpostList`:

```graphql
query Posts {
 blogpostList {
   id
   title
   slug
   excerpt
   headerImage {
       alt
       url
   }
 }
}
```

#### **Add a collection component**

* Bind the list (array) of items from the Data Variable to the [collection](../core-components/collection.md):\
  `<Data Variable Name>.data.data.<Content Type API Name>List`.
* The collection component iterates over each item and replicates your design. Bind the **collectionItem** to get the current iteration's data.

#### **Customize the collection**

Add components to the collection item (e.g., cards with titles, excerpts, and images). Editing one item applies the same layout to all items.

<figure><img src="../../.gitbook/assets/flotiq-listing-page.gif" alt="Create overwiev page"><figcaption></figcaption></figure>

## Conclusion

Now you should have your content from Flotiq displayed on Webstudio on both a listing page and a dynamic page that changes depending on the slug viewed.

## Related

- [CMS](../foundations/cms.md) – Learn about dynamic pages and Resources in Webstudio
- [Variables](../foundations/variables.md) – Understand GraphQL Resource variables
- [Collection](../core-components/collection.md) – Display multiple records from your CMS
- [Hygraph Integration](./hygraph.md) – Another GraphQL-based headless CMS
- [WordPress Integration](./wordpress.md) – Build a frontend for headless WordPress
