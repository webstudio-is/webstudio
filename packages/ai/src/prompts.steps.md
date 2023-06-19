#### Base theme

Hardcoded, merged with generated theme

```
type Size: "xs" | "s" | "m" | "l" | "xl" | "2xl" |"3xl" |"4xl";
```

```json
{
  "fontSize": {
    "xs": 10,
    "s": 12,
    "m": 14,
    "l": 16,
    "xl": 18,
    "2xl": 20,
    "3xl": 24,
    "4xl": 28
  },
  "spacing": {
    "xs": 4,
    "s": 8,
    "m": 12,
    "l": 16,
    "xl": 20,
    "2xl": 24,
    "3xl": 28,
    "4xl": 32
  },
  "borderRadius": {
    "xs": 2,
    "s": 4,
    "m": 6,
    "l": 8,
    "xl": 10,
    "2xl": 12,
    "3xl": 16,
    "4xl": 20
  }
}
```

## Theme

You are a designer and the client came to you with the following request:

```
Develop a website for a gourmet bakery. Include sections such as Product Catalog, Special Occasion Cakes, Testimonials from satisfied customers, Ordering Information, and a Contact page. Use mouthwatering food photography, and a whimsical design to evoke a sense of indulgence.
```

Your task is to:

- Rewrite or enhance the request to provide further context and requirements to designers.
- Produce a theme for the request: we will use in the final designs. Select colors (their hex value) from the TailwindCSS palette. Gradients and shadow colors should be on brand with the theme `colors`.
- Determine whether the design should be in light or dark mode

Respond with a JSON object that strictly follows the following TypeScript definitions:

```typescript
type RgbaColor = string;
type Response = {
  requirements: string;
  colorMode: "light" | "dark";
  theme: {
    colors: HexColor[];
    text: HexColor[];
    gradients: [
      [HexColor, HexColor],
      [HexColor, HexColor],
      [HexColor, HexColor]
    ];
    fontFamily: {
      base: FontName; // generally a simple sans-serif font
      headings: FontName;
    };
    shadowsColors: [RgbaColor, RgbaColor, RgbaColor, RgbaColor];
  };
};
```

Respond with a valid JSON code block. Start with ```json

---

Alternative for sections

- A list of comprehensive and long sections descriptions based on the request. We will use these as instructions to hand over to designers so they should be detailed.
  sections: string[];

### Response

```json
{
  "sections": [
    "Product Catalog: Showcase the delectable array of gourmet bakery products through high-quality food photography and enticing descriptions. Organize the catalog into categories such as bread, pastries, cakes, and cookies to make it easy for visitors to explore and find their desired treats.",
    "Special Occasion Cakes: Highlight the bakery's specialty in creating stunning and delicious cakes for special occasions. Present a gallery of beautifully decorated cakes, including wedding cakes, birthday cakes, and anniversary cakes. Provide information on customization options, flavors, and ordering process for these bespoke creations.",
    "Testimonials: Feature testimonials from satisfied customers to build trust and credibility. Include customer reviews, their names, and possibly their photos. Display a variety of testimonials that highlight the bakery's exceptional products, flavors, and customer service.",
    "Ordering Information: Provide comprehensive information about the ordering process. Explain how customers can place orders, specify delivery or pickup options, and provide any relevant policies or guidelines regarding payment, cancellation, and returns. Make the ordering experience seamless and convenient for visitors.",
    "Contact: Offer a dedicated page for visitors to get in touch with the bakery. Include a contact form for general inquiries, as well as the bakery's phone number, email address, and physical address. Optionally, provide links to the bakery's social media profiles for additional communication channels."
  ],
  "colorMode": "light",
  "theme": {
    "colors": ["#FDE68A", "#F6E05E", "#F9A8D4", "#A78BFA", "#34D399"],
    "text": ["#111827", "#4B5563", "#6B7280"],
    "gradients": [
      ["#FDE68A", "#F6E05E"],
      ["#F9A8D4", "#A78BFA"],
      ["#34D399", "#6B7280"]
    ],
    "fontFamily": {
      "base": "sans-serif",
      "headings": "Poppins"
    },
    "shadowsColors": [
      "rgba(17, 24, 39, 0.1)",
      "rgba(17, 24, 39, 0.2)",
      "rgba(17, 24, 39, 0.3)",
      "rgba(17, 24, 39, 0.4)"
    ],
    "fontSize": {
      "xs": 10,
      "s": 12,
      "m": 14,
      "l": 16,
      "xl": 18,
      "2xl": 20,
      "3xl": 24,
      "4xl": 28
    },
    "spacing": {
      "xs": 4,
      "s": 8,
      "m": 12,
      "l": 16,
      "xl": 20,
      "2xl": 24,
      "3xl": 28,
      "4xl": 32
    },
    "borderRadius": {
      "xs": 2,
      "s": 4,
      "m": 6,
      "l": 8,
      "xl": 10,
      "2xl": 12,
      "3xl": 16,
      "4xl": 20
    }
  }
}
```
