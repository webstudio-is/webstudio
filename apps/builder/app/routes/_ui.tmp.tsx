import { Link, useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/server-runtime";

export const loader = () => {
  const headers = new Headers();
  headers.set("x-tmp-loader", `EEE`);

  return json({ hello: "world" }, { headers });
};

/**
 * When doing changes in a project, then navigating to a dashboard then pressing the back button,
 * the builder page may display stale data because it’s being retrieved from the browser’s back/forward cache (bfcache).
 *
 * https://web.dev/articles/bfcache
 *
 */
export const headers = () => {
  return {
    "Cache-Control": "no-store",
  };
};

export default function Test() {
  const data = useLoaderData<typeof loader>();
  return (
    <div>
      Test {data.hello} <Link to="/tmp2">Go Away </Link>
    </div>
  );
}
