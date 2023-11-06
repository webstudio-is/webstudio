import type { LoaderArgs } from "@remix-run/server-runtime";

export const loader = (arg: LoaderArgs) => {
  const host =
    arg.request.headers.get("x-forwarded-host") ||
    arg.request.headers.get("host") ||
    "";

  return new Response(
    `
User-agent: *
Disallow: /api/

Sitemap: https://${host}/sitemap.xml

  `,
    {
      headers: {
        "Content-Type": "text/plain",
      },
      status: 200,
    }
  );
};
