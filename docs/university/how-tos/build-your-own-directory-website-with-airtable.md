---
description: Build a directory website in Webstudio using Airtable as a CMS.
---

# ▶️ Build Your Own Directory Website with Airtable

{% embed url="https://youtu.be/21y1_CiBqnM" %}

In this video, Alex guides you through creating your own directory website using Webstudio and Airtable! Whether you're a beginner or have some experience, this tutorial is designed to provide you with a clear, step-by-step process to build a functional and visually appealing directory website.

Clonable Link: [https://wstd.us/template/directory](https://wstd.us/template/directory)

## Overview

This tutorial covers building a fully automated directory in four steps:

1. **Project Setup**: Clone the template to your Webstudio account
2. **Database Creation**: Set up Airtable with the necessary tables
3. **Database Integration**: Connect Webstudio to Airtable API
4. **Automation**: Configure forms to automatically populate your database

## Database Structure

Create these tables in Airtable:

### Directory Items Table

| Field          | Type             |
| -------------- | ---------------- |
| Name           | Single line text |
| Description    | Long text        |
| Featured Image | Attachment       |
| URL            | URL              |
| Pretty URL     | Single line text |

### Directory Submissions Table

For user-submitted resource requests.

### Subscribers Table

For newsletter/email collection.

## API Integration

### 1. Create Airtable API Token

1. Go to Airtable → Profile → Developer Hub
2. Create new token with scopes: `data.records:read`, `schema.bases:read`
3. Grant access to your directory base
4. **Save the token** — it won't be shown again

### 2. Get API URL

1. In your base, click Help → API Documentation
2. Copy the curl command URL for your table

### 3. Create Resource Variable in Webstudio

1. Select your Collection's parent element
2. Settings → Add Variable → Type: Resource
3. Paste the API URL
4. Add Header: `Authorization` = `Bearer YOUR_API_TOKEN`

### 4. Bind Collection Data

- Collection data path: `airtable.data.records`
- Field bindings use: `collectionItem.fields.fieldname`
- For images: `collectionItem.fields.featured_image[0].url`

## Form Automation

### Connect Forms to Airtable

1. In Airtable Automations, create new automation
2. Trigger: "When webhook received" — copy the webhook URL
3. In Webstudio, select your Form → Action → paste webhook URL
4. Action: "Create record" in your target table
5. Map form fields to table columns
6. Enable the automation

Test by publishing and submitting the form.

## Related

- [Airtable Integration](../integrations/airtable-frontend.md) – Detailed guide on connecting Airtable to Webstudio
- [CMS](../foundations/cms.md) – Create dynamic content-driven pages
- [Collection](../core-components/collection.md) – Display and loop through data records
- [Form](../core-components/form.md) – Capture user submissions
- [Using Filters to Dynamically Display Content](using-filters-to-dynamically-display-content.md) – Add search and filtering to your directory
