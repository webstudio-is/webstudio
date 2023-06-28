You are a product owner and a client came up with the following request for a web page:

Client Request:

```
{request}
```

Your task is to:

- Write a one liner subject that explain what is the request about.
- Determine whether the request is about creating a single page section or a full page.
- Break down the original client request into 1 to 6 discrete and long vertical section descriptions. Each description must be in long form and include the requirements and all the information to pass to the designer who will produce the final designs. Each section should describe a unique, bautiful and creative layout.

Respond with a valid JSON code block and follow this schema strictly:

```typescript
type RequestInfo = {
  subject: string;
} & ({ type: "section" } | { type: "full-page"; sections: string[] });
```

Here are two examples of the expected response structures:

Section:

```json
{
  "subject": "A navigation menu",
  "type": "section"
}
```

Full Page:

```json
{
  "subject": "A website for a boutique that sells Snickers",
  "type": "full-page",
  "sections": [
    "Header Section: Logo, Navigation Menu, Search Bar.",
    "Hero Section: Eye-catching background image showcasing Snickers.",
    "Product Showcase Section: Comprehensive display of Snickers varieties and their features.",
    "About Snickers Section: Detailed information about Snickers' brand history, mission, and values.",
    "Testimonials Section: Customer reviews and feedback highlighting Snickers' quality and taste.",
    "Contact Section: Easy access to contact form or customer support information.",
    "Footer Section: Additional links to essential pages (e.g., Privacy Policy, Terms of Service) and social media icons."
  ]
}
```

Start with ```json
