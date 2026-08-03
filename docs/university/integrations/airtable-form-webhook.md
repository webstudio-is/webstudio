---
description: >-
  This article will explore the process for integrating your Webstudio Form with
  Airtable using a simple automation.
---

# How to integrate a Webhook Form with Airtable

{% embed url="https://www.youtube.com/watch?v=xYJFh_u-8Tc" %}

Out of the box, Webstudio automatically sends form data to the site owner’s registered email, effectively creating singular records. To expand this functionality, we can seamlessly integrate it with a relational database like Airtable. This will centralize, access, and analyze all your form submission data in one place, making data management a breeze and enabling efficient team collaboration.

---

### Integration overview:

You can integrate your Webstudio form with Airtable in 3 simple steps:

1. Configuring your Webstudio form
2. Setting Up Webhooks in Airtable and Webstudio
3. Mapping Data to the Right Fields

### Step 1: Configuring your Webstudio Form

To configure your form for the integration, you will need to define the input name for each field. Select your form input field in the navigator, and head over to “Settings” on the right to fill in the name property. Repeat this for every input field on your form as this is what Airtable will use to identify your website form submissions.

<figure><img src="../../.gitbook/assets/airtable-input-settings.avif" alt=""><figcaption></figcaption></figure>

### Step 2: Setting Up Webhooks in Airtable and Webstudio

Airtable simplifies the process of setting up webhooks within the platform.

1. Open your Airtable workspace and navigate to the table where you want to add data.
2. Click on the "Automations" button located on the top of the screen.
3. Create a new automation by selecting "Create Automation" and choose the trigger event. In this case, select "When webhook received" as the trigger.
4. Copy the webhook URL to your clipboard.

<figure><img src="../../.gitbook/assets/airtable-webhook-setup.avif" alt=""><figcaption></figcaption></figure>

Next, link your Webstudio form to this webhook.

1. Open up Webstudio and select the form you want to link to Airtable.
2. Navigate to the Settings tab on the top right.
3. Click on the "+" button beside properties.
4. Select "Action" from the dropdown.
5. Paste the Airtable webhook URL into the new action field.
6. Publish your new changes on Webstudio.
7. Head over to the live version of your site and create a test submission on your form. This will trigger send the submission to Airtable and validate your integration.

### Step 3: Mapping Data to the Right Fields

With the webhook set up, data will automatically flow into your Airtable automation. Now, let's proceed to map the incoming data to the appropriate feeds within the table.\
To learn more about how to use Airtable's powerful automation tool, refer to their official [documentation](https://support.airtable.com/docs/getting-started-with-airtable-automations).

1. Identify Key Data Points\
   Determine the essential data points you want to capture from the incoming data. For example, if you're receiving data from a contact form, key data points might include the name, email address, phone number, and message.
2. Create Fields in Airtable\
   Under the data tab, in your selected table, create fields that correspond to the identified data points. Airtable offers various field types (e.g., Single Line Text, Email, Phone, Date) to accommodate different types of data.
3. Set Up Data Mapping Automation\
   Head back to Airtable's automation tab, add a new action to your original automation. Select "Create record" as the action type and map the incoming data to the respective fields. In the automation setup, specify which data points should populate each field in the Airtable table.
4. Turn on your automation\
   Now that we have finished configuring our automation, we can turn it on.

<figure><img src="../../.gitbook/assets/airtable-automation-toggle.avif" alt=""><figcaption></figcaption></figure>

### Conclusion

Airtable's native [automation](https://support.airtable.com/docs/getting-started-with-airtable-automations) features empower users to streamline data entry and enhance data organization. By setting up a webhook action from your Webstudio form to receive external data and automating the mapping process, you eliminate the need for manual data entry, reduce the risk of errors and gain access to all of Airtable's data management features.

## Related

- [Webhook Form](../core-components/webhook-form.md) – The form component used to send data to Airtable
- [Airtable Frontend](./airtable-frontend.md) – Build a complete frontend for Airtable data
- [Zapier Integration](./zapier.md) – Alternative workflow automation for forms
- [Pabbly Integration](./pabbly.md) – Another automation option with flat-rate pricing
- [n8n Integration](./n8n.md) – Open-source automation with visual workflow editor
