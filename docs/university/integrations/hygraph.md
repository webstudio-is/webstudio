---
description: >-
  Learn how to use Webstudio's advanced visual builder to create a Hygraph
  frontend without writing code, including a blog overview page, a blog page,
  and a sitemap.
cover: ../../.gitbook/assets/hygraph-frontend-cover.png
coverY: 0
---

# How to build a frontend for Hygraph using Webstudio

{% hint style="success" %}
A lightweight Hygraph template is in the Marketplace. To start a new project, [clone the template](https://wstd.us/hygraph-template). To integrate with an existing project, visit the Marketplace and insert the various pages.
{% endhint %}

By the end of this tutorial, you will have the following using your [Hygraph](https://hygraph.com/) data and [Webstudio](https://webstudio.is/):

* **An overview page** – One page that contains all the records in the Hygraph blog model, each with a link to view that record on a details page (a dynamic page).
* **A details page** – A template displaying the blog data matching the blog URL viewed. If the user is on /blog/mouse, the [Dynamic Page](../foundations/cms.md#dynamic-pages) will fetch Hygraph for a record whose slug equals "mouse" and display its contents.
* **A sitemap** – A dynamic [sitemap](../core-components/xml-node.md) containing the various records in Hygraph.

## Video tutorial

This video contains a step-by-step walkthrough on using Webstudio and Hygraph together.

{% embed url="https://www.youtube.com/watch?v=QC6Y7BHduLw" %}
Full video walkthrough
{% endembed %}

## **Webstudio is a visual builder that connects to Hygraph**

Webstudio is solely focused on creating a visual builder for the frontend. It's backend agnostic, meaning we don't lock you into using any one backend/CMS/database.

In the case of Hygraph, this enables you to leverage your current data without having to custom code a frontend.

Webstudio is open source, has all CSS properties, and is dynamic at the speed of static.

## Pagination

The demo did not show how to paginate your Hygraph content, so this section will show you.

{% hint style="warning" %}
Use pagination only if necessary. Users and search engines prefer minimal navigation.
{% endhint %}

First, start by going to the Marketplace > Hygraph > and insert the Posts page.

The Posts page contains:

* A query ready for pagination
* A `Posts Per Page` variable on the body that lets you define how many posts should display
* Accessibility and SEO-friendly pagination that will display if the amount of posts in Hygraph exceeds the `Posts Per Page` number
* Bindings with logic to calculate the offset and conditions to hide prev/next links if at the beginning or end

The method of pagination will use prev/next links with offset values, i.e., skipping a specified number of items to move to the next set of results.

{% hint style="info" %}
Offset is used over cursors (another pagination method) because offsets provide a single URL per page, such as `?page=4`, whereas cursor provides two URLs per page, such as `?after=abc` and `?before=ghi`, which is not good for SEO.
{% endhint %}

### Converting your existing query

If you have an existing query, it will need to be modified if it uses `<yourModel>`, such as `posts`, and not `<yourModelConnection>`, such as `postsConnection`.

If your query looks like this:

<pre class="language-graphql"><code class="lang-graphql">query Posts {
	...
  posts {
<strong>    title
</strong><strong>    slug
</strong>    ...
  }
}
</code></pre>

It will now look like this:

<pre class="language-graphql"><code class="lang-graphql">query Posts($first: Int, $skip: Int = 0) {
  postsConnection(
    first: $first
    skip: $skip
    orderBy: publishedAt_DESC
  ) {
    pageInfo {
      hasNextPage
      hasPreviousPage
    }
    edges {
      node {
<strong>        title
</strong><strong>        slug
</strong>        ...
      }
    }
  }
}

</code></pre>

The contents of `edges.node` in the second query are exactly the same as the contents of `posts` from the first query. Therefore, you can copy the contents of `posts` and paste them into `edges.node`.

The rest of the second query provides context about whether there are previous or next pages and introduces filters to offset/skip results based on the current page.

If you already setup a page using `posts`, you will need to rebind the values on your page because the Resource response will be different. For example, `Post Item.node.title` instead of `Post Item.title`.

## Related

- [CMS](../foundations/cms.md) – Learn about dynamic pages and Resources in Webstudio
- [Variables](../foundations/variables.md) – Understand GraphQL Resource variables
- [Collection](../core-components/collection.md) – Display multiple records from Hygraph
- [Flotiq Integration](./flotiq.md) – Another GraphQL-based headless CMS option
- [WordPress Integration](./wordpress.md) – Build a frontend for headless WordPress
