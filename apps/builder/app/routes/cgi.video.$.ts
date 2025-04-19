import type { LoaderFunctionArgs } from "@remix-run/server-runtime";
import env from "~/env/env.server";

// this route used as proxy for images to cloudflare endpoint
// https://developers.cloudflare.com/fundamentals/get-started/reference/cdn-cgi-endpoint/

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (env.RESIZE_ORIGIN !== undefined) {
    const url = new URL(request.url);
    const imgUrl = new URL(env.RESIZE_ORIGIN + url.pathname);
    imgUrl.search = url.search;

    const response = await fetch(imgUrl.href, {
      headers: {
        accept: request.headers.get("accept") ?? "",
        "accept-encoding": request.headers.get("accept-encoding") ?? "",
      },
    });

    const responseWHeaders = new Response(response.body, response);

    if (false === responseWHeaders.ok) {
      console.error(
        `Request to Image url ${imgUrl.href} responded with status = ${responseWHeaders.status}`
      );
    }

    return responseWHeaders;
  }

  return new Response("Not supported", {
    status: 200,
  });
};
