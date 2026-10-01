# Configurable Webhook Form emails

Status: proposal for [#5658](https://github.com/webstudio-is/webstudio/issues/5658).
Implementation and release tasks belong in the accompanying draft PR checklist.

## User story

As a builder creating a site for a client, I want each form to send a useful,
branded email to the right people, with enough context to act on the inquiry and
reply to its author. I also want to configure an optional confirmation for the
visitor when the site needs one.

Examples include sending sales inquiries to sales, job applications to hiring,
and booking requests to a business owner. Each needs different recipients,
wording, fields, and reply behavior. A visitor confirmation has its own content
and recipient rules so internal notes and recipients stay private.

## Recommended model

Keep project email defaults, with overrides on each Webhook Form. Show inherited
values and a reset-to-project-default action. An explicit disabled notification
is distinct from an empty value that inherits a default.

Start with one client/team notification per form. Keep existing forms working
with their current recipients and default email. Offer structured settings with
a useful generated message and a preview. Broader delivery workflows can build on
this model once their delivery and retry behavior is defined.

| Setting                       | Builder need                                     | Recommended behavior                                                                    |
| ----------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Enabled and notification name | Choose which forms send email and recognize them | Preserve existing delivery; explicit opt-out for new configuration                      |
| To                            | Route inquiries to the right client or team      | Project recipients by default; per-form overrides and multiple addresses                |
| Cc and Bcc                    | Copy colleagues or keep an archive               | Optional; explain recipient visibility and enforce total recipient limits               |
| Sender name                   | Identify the business in the inbox               | Configurable display name, with a useful site-based default                             |
| Sender address                | Send from the business domain                    | Platform sender by default; custom identities require verified authorization            |
| Reply-To name and address     | Reply directly to the visitor or a support team  | Explicit field mapping or a fixed address; validated with a defined fallback            |
| Subject                       | Recognize the form and inquiry                   | Text plus safe submission values and optional submission ID                             |
| Preview text                  | Make the inbox summary useful                    | Optional text; avoid accidentally exposing sensitive submitted values                   |
| Message content               | Give the recipient useful context                | Editable introduction, submitted-field summary, and footer; HTML and plain text         |
| Included fields               | Send the information this recipient needs        | Select fields, change labels and order, hide empty values, format repeated values       |
| Branding                      | Match the client website                         | Reusable logo, business name, basic colors, signature, and footer links                 |
| Language and formatting       | Make notifications readable for their recipients | Project/form locale, translated labels and text, timezone and date formatting           |
| Submission context            | Identify where and when an inquiry came from     | Form name, site/page link, timestamp and submission ID; optional campaign fields        |
| Uploaded files                | Review documents with the inquiry                | Explicit file selection and limits; attachment/link behavior requires a delivery design |
| Visitor confirmation          | Acknowledge a submission                         | Separate opt-in message, recipient field, template and delivery status                  |
| Routing conditions            | Send a department-specific message               | Later allowlisted conditions and destinations, configured by the builder                |

## Delivery rules

Published server configuration controls recipients, sender identities, templates,
and allowed conditions. Submitted values provide content and explicitly mapped
Reply-To/confirmation fields. They cannot override delivery configuration.

A visitor's email address can be used for Reply-To. Sending from that visitor's
address would require authorization the site does not have. Custom sender domain
verification, loss of verification, quotas, bounces, and suppressed recipients
need visible states and defined outcomes.

Generate standards-compliant Message-ID and MIME headers automatically. An
optional unique submission value in the subject can help distinguish inquiries;
email applications ultimately decide how conversations are grouped.

Delivery state must distinguish provider acceptance from confirmed delivery.
Retries need a stable submission/message identity to avoid duplicate
notifications, especially once a submission can send both an email and a webhook.

## Suggested rollout

1. **Core configuration:** project defaults and per-form overrides, To/Cc/Bcc,
   sender display name, Reply-To mapping, subject, editable structured content,
   field selection, locale, preview and test send. Keep the platform sender as the
   initial default and preserve existing forms.
2. **Custom sender identities:** verified-domain setup and status, sender
   selection, authorization checks, and delivery diagnostics.
3. **Additional delivery needs:** visitor confirmations, attachments or protected
   file links, conditional routing, and email plus webhook actions. Track these
   as explicit follow-ups with their own acceptance criteria.

Plan entitlement, permitted recipient counts, the initial body editor, and which
later capabilities belong in the first release remain product decisions in the
PR. Provider credentials, Return-Path, transport headers, signing, and retry
backoff remain service-managed. Bulk campaigns, arbitrary mail headers,
scheduling/digests, tracking, and read receipts need separate use cases before
adding controls to the form.

## Current behavior and related work

The Builder currently has a project-wide Contact email setting with support for
multiple addresses and plan limits. Publishing falls back to the owner's email
when that setting is empty. Generated server actions call the hosting email
adapter when the form has no external action. Custom notification settings need
a versioned contract across Builder, publishing, generated runtimes, and delivery.

- [#5658: subject and sender](https://github.com/webstudio-is/webstudio/issues/5658)
- [#4414: branding, content and language](https://github.com/webstudio-is/webstudio/issues/4414)
- [#4385: per-form recipients](https://github.com/webstudio-is/webstudio/issues/4385)
- [#5018: separate submission conversations](https://github.com/webstudio-is/webstudio/issues/5018)
- [#5499: multiple submission actions](https://github.com/webstudio-is/webstudio/issues/5499)
- [#5432: multipart data](https://github.com/webstudio-is/webstudio/issues/5432)
- [#6485: Resource actions and upload delivery](https://github.com/webstudio-is/webstudio/pull/6485)

Multipart webhook forwarding does not by itself implement email attachments.
The public runtime exposes an email adapter hook; self-hosted installations need
an adapter or a configured external service. Static exports also need a server
endpoint to deliver email.

## References

- [Mailgun message API](https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/messages/post-v3--domain-name--messages): delivery fields and attachment support; confirm the deployed adapter exposes the chosen capabilities.
- [Mailgun domain verification](https://documentation.mailgun.com/docs/mailgun/user-manual/domains/domains-verify): sender-domain authorization and DNS setup.
- [Gmail conversation grouping](https://support.google.com/mail/answer/5900?hl=en): client-controlled grouping behavior.
