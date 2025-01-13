import type { LoaderFunctionArgs } from "react-router";
import { sitemap } from "__SITEMAP__";

export const loader = (arg: LoaderFunctionArgs) => {
  const host =
    arg.request.headers.get("x-forwarded-host") ||
    arg.request.headers.get("host") ||
    "";

  const urls = sitemap.map((page) => {
    const url = new URL(`https://${host}${page.path}`);

    return `
  <url>
    <loc>${url.href}</loc>
    <lastmod>${page.lastModified.split("T")[0]}</lastmod>
  </url>
    `;
  });

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("")}
</urlset>
  `,
    {
      headers: {
        "Content-Type": "application/xml",
      },
      status: 200,
    }
  );
};
