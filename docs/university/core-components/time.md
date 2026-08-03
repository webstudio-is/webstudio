---
description: Display dates and times with semantic markup using the Time component in Webstudio.
---

# 🕐 Time

> See [MDN: \<time\>](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time)

The Time component displays formatted dates and times with support for localization. It renders a semantic `<time>` HTML element and allows you to format dates according to different languages, countries, and formats.

## When to Use

Use Time for:

- Blog post publication dates
- Event dates and times
- Last updated timestamps
- Any date/time display that needs localization

## How to Use

1. Drag a **Time** component from Components > General onto your canvas
2. Set the `datetime` value (the actual date/time data)
3. Configure the display format using the formatting properties
4. Choose the timezone used to display the date
5. Optionally bind dynamic dates from your CMS

## Properties

Some commonly used properties (see the Settings panel for all available options):

### Core Properties

| Property     | Description                                                |
| ------------ | ---------------------------------------------------------- |
| **datetime** | The date/time value (ISO 8601 format recommended)          |
| **timeZone** | Timezone used to display the date, such as `UTC`, `visitor`, or `Europe/Berlin` |

### Formatting Properties

| Property      | Description                          | Example Values                    |
| ------------- | ------------------------------------ | --------------------------------- |
| **language**  | Language code for localization       | `en`, `es`, `fr`, `de`, `ja`      |
| **country**   | Country code for regional formatting | `US`, `GB`, `DE`, `JP`            |
| **dateStyle** | How to display the date              | `full`, `long`, `medium`, `short` |
| **timeStyle** | How to display the time              | `full`, `long`, `medium`, `short` |
| **format**    | Custom format using tokens           | `DDDD, MMMM DD, YYYY`             |

## Timezone

The Time component formats dates in `UTC` by default, which keeps output consistent across visitors and deployments.

Use the `timeZone` property when the displayed time should be tied to a specific location or to the visitor:

| Value | Behavior |
| --- | --- |
| `UTC` | Displays the date in Coordinated Universal Time |
| `visitor` | Displays the date in each visitor's browser timezone after the page loads |
| IANA timezone | Displays the date in a fixed timezone such as `Europe/Berlin`, `America/New_York`, or `Asia/Tokyo` |

For events, webinars, launches, and deadlines, use a fixed IANA timezone so every visitor sees the time in the intended location. Use `visitor` when the time should adapt to each visitor's local timezone.

## Custom Date Formatting

For more control over date display, use the `format` property with these tokens:

### Date Tokens

| Token    | Description             | Example            |
| -------- | ----------------------- | ------------------ |
| **YYYY** | 4-digit year            | 2025               |
| **YY**   | 2-digit year            | 25                 |
| **MMMM** | Full month name         | January            |
| **MMM**  | Short month name        | Jan                |
| **MM**   | 2-digit month           | 01                 |
| **M**    | Month number            | 1                  |
| **DDDD** | Full day name           | Monday             |
| **DDD**  | Short day name          | Mon                |
| **DD**   | 2-digit day             | 05                 |
| **D**    | Day number              | 5                  |

### Time Tokens

| Token  | Description       | Example |
| ------ | ----------------- | ------- |
| **HH** | 24-hour format    | 14      |
| **H**  | Hour (24-hour)    | 14      |
| **hh** | 12-hour format    | 02      |
| **h**  | Hour (12-hour)    | 2       |
| **mm** | Minutes           | 30      |
| **m**  | Minutes (no zero) | 30      |
| **ss** | Seconds           | 45      |
| **s**  | Seconds (no zero) | 45      |
| **a**  | am/pm             | pm      |
| **A**  | AM/PM             | PM      |

### Format Examples

For the date `2025-01-20T14:30:00`:

| Format                | Result                      |
| --------------------- | --------------------------- |
| `DDDD, MMMM DD, YYYY` | Monday, January 20, 2025    |
| `MMM DD, YYYY`        | Jan 20, 2025                |
| `DD/MM/YYYY`          | 20/01/2025                  |
| `YYYY-MM-DD`          | 2025-01-20                  |
| `DDD, MMM D`          | Mon, Jan 20                 |
| `HH:mm:ss`            | 14:30:00                    |
| `h:mm A`              | 2:30 PM                     |

### Localized Names

Month and day names adapt to the `language` property:

- **en**: Monday, January
- **es**: lunes, enero
- **fr**: lundi, janvier
- **de**: Montag, Januar
- **ja**: 月曜日, 1月

{% hint style="info" %}
When using custom format tokens, month and day names are automatically localized based on the `language` property, making it easy to create multilingual sites.
{% endhint %}

## Date Style Examples

For the date `2025-01-20`:

| Style      | en-US                    | de-DE                   |
| ---------- | ------------------------ | ----------------------- |
| **full**   | Monday, January 20, 2025 | Montag, 20. Januar 2025 |
| **long**   | January 20, 2025         | 20. Januar 2025         |
| **medium** | Jan 20, 2025             | 20.01.2025              |
| **short**  | 1/20/25                  | 20.01.25                |

## Using with Dynamic Data

When binding dates from a CMS or API:

1. Bind the `datetime` property to your date field
2. Optionally bind `language` to a dynamic value for multilingual sites
3. Optionally bind `timeZone` if the CMS provides an IANA timezone
4. The component will format the date according to your settings

### Example Expression

```javascript
// If your CMS returns an ISO date string
myResource.publishedAt;
```

## Localization

The Time component is essential for multilingual sites:

1. Set the `language` property to match the page language
2. For dynamic language, bind to `system.params.lang` (if using language in URL)
3. The date will automatically format according to locale conventions

## Semantic HTML

Time renders as a `<time>` element with a `datetime` attribute:

```html
<time datetime="2025-01-20T10:30:00Z">January 20, 2025</time>
```

This helps search engines and assistive technologies understand the date.

## Related

- [XML Time](xml-time.md) – ISO format for RSS/XML feeds
- [Collection](collection.md) – Display dates from CMS data
- [Variables](../foundations/variables.md) – Bind dynamic date values

## Related Videos

{% embed url="https://www.youtube.com/watch?v=EznQsyS5M5A" %}
