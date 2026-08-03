---
description: Use Supabase as a backend database for your Webstudio site.
---

# How to build a frontend for Supabase using Webstudio

In Webstudio, a "Collection" is a powerful feature designed to manage and display dynamic content on web pages. Essentially, they serve as containers that can connect to various data sources, like databases or APIs, to fetch and present data in a structured and repeatable manner. This allows developers and designers to create instances, such as lists, galleries, or testimonial sections, where each item in the collection is automatically populated with data from the connected source. By using a collection, Webstudio users can efficiently create pages with content that updates in real-time, reflecting changes in the data source without manual intervention, thereby enhancing the site's interactivity and relevance.

{% embed url="https://www.youtube.com/watch?v=2MrkfnjYuCo" %}

## Dynamic Content Creation with Webstudio and Supabase

To create pages featuring dynamic content in Webstudio by integrating Supabase as your data source.

---

### Setting Up Your Supabase Project

1. Sign up for a free Supabase account.
2. Create a new project. (You'll need to set a strong password for your project to proceed).
3. Once your project is initialized, navigate to the table editor to create a new table
4. Define your fields (e.g., text fields for name, testimonial content, and an image URL field)

---

### Uploading Images to Supabase Storage

1. Go to **Storage** in your Supabase dashboard
2. Create a new bucket and set it as **public**
3. Upload your images
4. Each image will have a URL you can copy and store in your table

---

### Configuring Row Level Security (RLS)

1. Navigate to your table → "No active RLS policies"
2. Create a new policy
3. Enable **read access** for everyone (anonymous users)
4. Save the policy

---

### Integrating Supabase with Webstudio

#### Getting the API URL

1. Go to **Table Editor** → select your table
2. Click **API** (at the top right of the table view)
3. Switch the example code to **bash**
4. Copy the URL provided

#### Adding the Resource Variable

1. In Webstudio, select your Collection's parent element
2. Go to **Settings → Add Variable → Type: Resource**
3. Paste the API URL
4. Add a Header:
   - Name: `apikey`
   - Value: Your public API key from **Project settings → API**

{% hint style="info" %}
The API key stays between you and the builder and is not exposed on the frontend.
{% endhint %}

---

### Mapping Data and Finalizing Your Page

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
