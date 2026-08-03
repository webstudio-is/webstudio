---
description: Connect Webstudio forms to Pabbly Connect for automation.
---

# How to integrate Webhook Form with Pabbly

{% embed url="https://youtu.be/gKNsyYKxuDA" %}
How to integrate Webstudio with Pabbly
{% endembed %}

Pabbly Connect is a workflow automation platform similar to Zapier. It allows you to connect Webstudio forms to various apps and automate tasks when forms are submitted.

## What You'll Need

- A Webstudio project with a [Webhook Form](../core-components/webhook-form.md)
- A [Pabbly Connect account](https://www.pabbly.com/connect/)

## Step-by-Step Guide

### 1. Create a Workflow in Pabbly

1. Log in to Pabbly Connect and click **Create Workflow**
2. Name your workflow (e.g., "Webstudio Form Submissions")
3. For the trigger, select **Webhook** from the app list
4. Copy the webhook URL that Pabbly generates

### 2. Configure Webstudio

1. In Webstudio, select your Webhook Form component
2. Go to Settings and paste the Pabbly webhook URL into the **Action** field
3. Publish your site

### 3. Capture the Webhook Response

1. In Pabbly, click **Capture Webhook Response**
2. Go to your published Webstudio site and submit a test form
3. Return to Pabbly – it should capture your submission data
4. Click **Save & Send Test Request** to confirm

### 4. Add Your Action

1. Click the **+** to add an action step
2. Choose your destination app (Google Sheets, Mailchimp, etc.)
3. Connect your account and configure the action
4. Map the form fields from the webhook to the action fields
5. Save and enable your workflow

## Why Choose Pabbly?

| Feature              | Pabbly                     | Zapier           |
| -------------------- | -------------------------- | ---------------- |
| Pricing              | Flat rate, unlimited tasks | Per-task pricing |
| Multi-step workflows | Included                   | Premium feature  |
| Best for             | High volume forms          | Occasional use   |

## Common Integrations

- Google Sheets – Log submissions
- Gmail/SMTP – Send emails
- Mailchimp – Add to email lists
- Slack/Discord – Get notifications
- CRM systems – Create contacts

## Related

- [Webhook Form](../core-components/webhook-form.md) – The form component used to send data to Pabbly
- [Zapier Integration](./zapier.md) – Alternative workflow automation platform
- [n8n Integration](./n8n.md) – Open-source automation tool with visual editor
- [Airtable Form Integration](./airtable-form-webhook.md) – Send form submissions directly to Airtable
