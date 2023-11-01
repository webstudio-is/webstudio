import { ActionArgs } from "@remix-run/server-runtime";

export const loader = (arg: ActionArgs) => {
  const host =
    arg.request.headers.get("x-forwarded-host") ||
    arg.request.headers.get("host") ||
    "";

  return new Response(
    `
User-agent: *
Disallow: /api/

# Uncomment
# Sitemap: https://${host}/sitemap.xml

  `,
    {
      headers: {
        "Content-Type": "text/plain",
      },
      status: 200,
    }
  );
};
