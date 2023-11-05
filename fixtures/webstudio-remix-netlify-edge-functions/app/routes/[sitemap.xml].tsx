import type { LoaderArgs } from "@remix-run/server-runtime";

export const loader = (arg: LoaderArgs) => {
  const host =
    arg.request.headers.get("x-forwarded-host") ||
    arg.request.headers.get("host") ||
    "";

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://${host}/</loc>
    <lastmod>2023-11-05</lastmod>
  </url>
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
