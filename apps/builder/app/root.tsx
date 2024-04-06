// Our root outlet doesn't contain a layout because we have 2 types of documents: canvas and builder and we need to decide down the line which one to render, thre is no single root document.
import { Outlet, json, useLoaderData } from "@remix-run/react";
import { setEnv } from "@webstudio-is/feature-flags";
import env from "./env/env.server";
import type { ComponentProps } from "react";
import { useSetFeatures } from "./shared/use-set-features";

type OutletProps = ComponentProps<typeof Outlet>;

export const loader = () => {
  return json({
    features: env.FEATURES,
  });
};

const Root = (props: OutletProps) => {
  const { features } = useLoaderData<typeof loader>();
  setEnv(features);
  useSetFeatures();

  return <Outlet {...props} />;
};

export default Root;
