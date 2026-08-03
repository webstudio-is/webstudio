---
description: Connect Webstudio forms to n8n for workflow automation.
---

# How to integrate Webhook Form with N8N

This guide shows you how to link Webstudio Forms with [n8n](https://n8n.io/) for workflow automation. We will move data from Webstudio to n8n, save it in a Supabase table, and then ping a Slack channel when certain conditions are met.

{% embed url="https://www.youtube.com/watch?v=zeJVpfemwj0" %}

### What is n8n?

n8n is a platform designed to automate workflows. It helps you set up a series of tasks that run automatically, connecting different apps and services in the process.

One of the key features of n8n is its visual editor, which allows you to build these automated workflows without having to write any code.

---

### How to create a Webstudio > n8n integration?

For our Webstudio integration, we will create a workflow that sends form submissions to Supabase and notifies a Slack channel if certain requirements are met.

<figure><img src="../../.gitbook/assets/n8n-workflow-overview.avif" alt=""><figcaption></figcaption></figure>

- Get started with n8n
- Create the workflow trigger
- Connect the webhook to your Webstudio Form
- Integrate with External Applications (Supabase)
- Add an IF Node
- Add a Slack Node
- Finalize your workflow

#### Get started with n8n

Start by logging in to your n8n account.

- Inside your dashboard, go to Credentials > Add credential. For this demo, we will be using Supabase and Slack. You can find detailed instructions for all [supported credential setups](https://docs.n8n.io/integrations/builtin/credentials).
- After setting up the relevant credentials, go to “Workflows” and create a new workflow to start building your automation.

#### Create the workflow trigger

To initiate our n8n workflow with a webhook, we need to configure a webhook trigger.

- Add a Webhook node to your workflow by going to Add first step > Select a trigger > On webhook call
- Set HTTP Method to POST.
- Copy the “Test Webhook URL” and head over to Webstudio.

You can learn more about the [Webhook node and its parameters](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/).

#### Connect the webhook to your Webstudio Form

<figure><img src="../../.gitbook/assets/n8n-webhook-form-settings.avif" alt=""><figcaption></figcaption></figure>

1. Open the Webstudio builder, select your form instance, go to Settings and add two properties— _Action_ and _Method_.
2. Paste your copied Test Webhook into the Action property.
3. Write the word “POST" in the Method property.
4. Name every input field in your form so n8n can identify them in a form submission.
5. Head back to n8n and click on “Listen for test event”. It is important to submit your form on the published site to trigger the test submission.
6. Open the published version of your website and submit the updated form.
7. Back in n8n, you will now see the submitted form data in the Output Section.

#### Integrate with External Applications

Next, let’s add an external application to our workflow. To demonstrate this step, we will be adding form records to Supabase.

1. Go to Add Node > Action in an app > Supabase > Create a row.
2. Select the Supabase account you have linked to n8n and modify the other relevant parameters.
3. Link your form’s input fields to your Supabase table by mapping them to your Webhook’s Output Data.

You can learn more about the [Supabase node and its parameters](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.supabase).

#### Add an IF Node

IF and other flow nodes are used to trigger automations when specified conditions are met.

For this example, we will create a condition to send a Slack channel message only if the value of a lead is over $10,000.

1. Go to Add Node > Flow > IF.
2. Add a condition that sets your IF node to “true” if the value from your input is $10,000 or under.
3. Click on “Execute Node” This will return a true/false result.

   a. On “true”, the value is under $10,000.

   b. On “false”, the value is over $10,000.

You can [learn more about the IF node and its parameters](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.if/).

#### Add a Slack Node

Finally, let’s add a Slack node to our workflow. We will configure this node to send a message to the Sales channel in Slack.

1. On your n8n canvas, click the “+” sign next to the IF node’s “false” branch.
2. Go to Action in an app > Slack > Send a message.
3. Select your target Slack account
4. Set “Message Type” to “Simple Text Message” from the dropdown.
5. Map the relevant data from the “Input” Section to your Slack message in the “Message Text” parameter.

You can [learn more about the Slack node and its parameters](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.slack/).

#### Finalize your workflow

After setting up your workflow, you should test it to ensure it runs properly.

1. Execute the n8n workflow.
2. Create a new submission on your published Webstudio site.
3. If the workflow runs without any errors, all nodes will have a green border.

After the checks are concluded, activate your workflow.

1. Replace the “Test Webhook URL” with the “Production Webhook URL” in your Form’s Action property.
2. Go to the upper left of your n8n canvas and activate your workflow by toggling it from “Inactive” to “Active”.\
   ![](../../.gitbook/assets/n8n-workflow-overview.avif)

## Related

- [Webhook Form](../core-components/webhook-form.md) – The form component used to trigger n8n workflows
- [Zapier Integration](./zapier.md) – Alternative workflow automation platform
- [Pabbly Integration](./pabbly.md) – Another automation option with flat-rate pricing
- [Supabase Integration](./supabase.md) – Database that works well with n8n workflows
- [Airtable Form Integration](./airtable-form-webhook.md) – Send form data directly to Airtable
