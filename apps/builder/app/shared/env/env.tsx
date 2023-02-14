import { useLoaderData } from "@remix-run/react";
import { namespace } from "./namespace";

// @todo remove once remix has a built-in way
// https://github.com/remix-run/remix/discussions/2769
// This renders env config as a script tag so we can have access to it before any scripts run
export const Env = () => {
  const data = useLoaderData();
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `window["${namespace}"] = ${JSON.stringify(data.env)}`,
      }}
    />
  );
};
