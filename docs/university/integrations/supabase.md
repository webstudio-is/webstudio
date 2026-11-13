---
description: Use Supabase as a backend database for your Webstudio site.
---

# How to build a frontend for Supabase using Webstudio

In Webstudio, a "Collection" is a powerful feature designed to manage and display dynamic content on web pages. Essentially, they serve as containers that can connect to various data sources, like databases or APIs, to fetch and present data in a structured and repeatable manner. This allows developers and designers to create instances, such as lists, galleries, or testimonial sections, where each item in the collection is automatically populated with data from the connected source. By using a collection, Webstudio users can efficiently create pages with content that updates in real-time, reflecting changes in the data source without manual intervention, thereby enhancing the site's interactivity and relevance.

{% embed url="https://www.youtube.com/watch?v=2MrkfnjYuCo" %}

## Create dynamic content with Webstudio and Supabase

This guide creates pages with dynamic content by using Supabase as the data source.

---

### Set up your Supabase project

1. Sign up for a free Supabase account.
2. Create a new project. (You'll need to set a strong password for your project to proceed).
3. Once your project is initialized, navigate to the table editor to create a new table
4. Define your fields (e.g., text fields for name, testimonial content, and an image URL field)

---

### Upload images to Supabase Storage

1. Go to **Storage** in your Supabase dashboard
2. Create a new bucket and set it as **public**
3. Upload your images
4. Each image will have a URL you can copy and store in your table

---

### Configure Row Level Security

1. Navigate to your table → "No active RLS policies"
2. Create a new policy
3. Enable **read access** for everyone (anonymous users)
4. Save the policy

---

### Integrate Supabase with Webstudio

#### Get the API URL

1. Go to **Table Editor** → select your table
2. Click **API** (at the top right of the table view)
3. Switch the example code to **bash**
4. Copy the URL provided

#### Add the Resource variable

1. In Webstudio, select your Collection's parent element
2. Go to **Settings → Add Variable → Type: Resource**
3. Paste the API URL
4. Add a header:
   - Name: `apikey`
   - Value: Your publishable key from **Project settings → API Keys**

{% hint style="warning" %}
Use only a Supabase publishable key (or the legacy `anon` key) in a website integration. Never use a secret or `service_role` key. Publishable keys identify the project but do not protect its data; configure Row Level Security policies and table grants for every operation the site permits. See [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys) and [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).
{% endhint %}

---

### Map data and finish the page

Map the data from Supabase to your Webstudio project. This involves setting up the data within your collection to inform Webstudio about the available data for use.

- Delete any automatically generated preview box within the collection.
- Drag in your pre-created and pre-styled components, which will be repeated for each fetched item from Supabase.
- For each component (e.g., paragraph, field, and image), bind the corresponding data from your Supabase collection.
- Use `.data` to access the actual content (e.g., `resource.data`)
- When binding inside a Collection, use `collectionItem` instead of the resource name
- Once everything is connected and data is properly mapped, your page will dynamically display the testimonials stored in Supabase.

Make sure to check the responsiveness and appearance on mobile devices before publishing.

---

## Related

- [CMS](../foundations/cms.md) – Learn about dynamic pages and Resources in Webstudio
- [Variables](../foundations/variables.md) – Understand how to create Resource variables
- [Collection](../core-components/collection.md) – Display multiple records from Supabase
- [Airtable Integration](./airtable-frontend.md) – Alternative database option for Webstudio
- [n8n Integration](./n8n.md) – Automate workflows between Webstudio forms and Supabase
