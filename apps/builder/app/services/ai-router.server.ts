import { z } from "zod";
import { procedure, router } from "@webstudio-is/trpc-interface/index.server";
import env from "~/env/env.server";

const schemaTypes = [
  "Organization",
  "LocalBusiness",
  "Article",
  "BlogPosting",
  "Product",
  "Event",
  "FAQPage",
  "HowTo",
  "Person",
  "WebSite",
  "WebPage",
  "BreadcrumbList",
  "Review",
  "Recipe",
  "Course",
  "JobPosting",
  "SoftwareApplication",
  "VideoObject",
] as const;

const generateSchemaPrompt = (
  schemaType: (typeof schemaTypes)[number],
  pageContext: {
    pageName: string;
    pageTitle: string;
    pageDescription?: string;
    siteName?: string;
    siteUrl?: string;
    pagePath?: string;
    contactEmail?: string;
    language?: string;
    socialImageUrl?: string;
  }
) => {
  const contextLines = [
    `- Page name: ${pageContext.pageName}`,
    `- Page title: ${pageContext.pageTitle}`,
    pageContext.pageDescription
      ? `- Page description: ${pageContext.pageDescription}`
      : null,
    pageContext.siteName
      ? `- Site/Company name: ${pageContext.siteName}`
      : null,
    pageContext.siteUrl ? `- Full page URL: ${pageContext.siteUrl}` : null,
    pageContext.pagePath ? `- Page path: ${pageContext.pagePath}` : null,
    pageContext.contactEmail
      ? `- Contact email: ${pageContext.contactEmail}`
      : null,
    pageContext.language ? `- Language: ${pageContext.language}` : null,
    pageContext.socialImageUrl
      ? `- Social/Preview image URL: ${pageContext.socialImageUrl}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `Generate a valid JSON-LD structured data schema for a "${schemaType}" type.

Context about the page and website:
${contextLines}

Requirements:
1. Output ONLY valid JSON - no markdown code blocks, no explanations
2. Include "@context": "https://schema.org" and "@type": "${schemaType}"
3. Use the provided context data (site name, URL, email, image, etc.) in the schema where appropriate
4. For values that aren't provided in the context and need user customization, use descriptive placeholder text like "[Add your address here]" or "[Add phone number]"
5. Include all common/recommended properties for this schema type according to Google's guidelines
6. If generating LocalBusiness, Organization, or similar: use the contactEmail for email field if provided
7. If generating Article, BlogPosting: use appropriate datePublished and author fields
8. Always include the full URL (siteUrl) where URL fields are needed
9. Use the socialImageUrl for "image" fields when available

Output the JSON object directly:`;
};

export const aiRouter = router({
  generateSchema: procedure
    .input(
      z.object({
        schemaType: z.enum(schemaTypes),
        pageContext: z.object({
          pageName: z.string(),
          pageTitle: z.string(),
          pageDescription: z.string().optional(),
          siteName: z.string().optional(),
          siteUrl: z.string().optional(),
          pagePath: z.string().optional(),
          contactEmail: z.string().optional(),
          language: z.string().optional(),
          socialImageUrl: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      if (!env.OPENAI_KEY) {
        throw new Error(
          "AI features require OPENAI_KEY to be configured. Please set the OPENAI_KEY environment variable."
        );
      }

      const prompt = generateSchemaPrompt(input.schemaType, input.pageContext);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_KEY}`,
      };

      if (env.OPENAI_ORG) {
        headers["OpenAI-Organization"] = env.OPENAI_ORG;
      }

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: "gpt-5.1",
            messages: [
              {
                role: "system",
                content:
                  "You are a JSON-LD structured data expert. You generate valid schema.org JSON-LD markup for SEO. Always output raw JSON without markdown formatting.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.7,
            max_completion_tokens: 1000,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
      };

      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error("No response from AI");
      }

      // Clean up the response - remove markdown code blocks if present
      let jsonContent = content.trim();
      if (jsonContent.startsWith("```json")) {
        jsonContent = jsonContent.slice(7);
      } else if (jsonContent.startsWith("```")) {
        jsonContent = jsonContent.slice(3);
      }
      if (jsonContent.endsWith("```")) {
        jsonContent = jsonContent.slice(0, -3);
      }
      jsonContent = jsonContent.trim();

      // Validate JSON
      try {
        const parsed = JSON.parse(jsonContent);
        // Pretty-print the JSON
        return JSON.stringify(parsed, null, 2);
      } catch {
        throw new Error("AI generated invalid JSON. Please try again.");
      }
    }),

  getSchemaTypes: procedure.query(() => {
    return schemaTypes.map((type) => ({
      value: type,
      label: type.replace(/([A-Z])/g, " $1").trim(),
    }));
  }),
});
