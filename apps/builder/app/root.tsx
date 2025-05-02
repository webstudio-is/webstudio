// Our root outlet doesn't contain a layout because we have 2 types of documents: canvas and builder and we need to decide down the line which one to render, thre is no single root document.
import {
  Outlet,
  json,
  useLoaderData,
  type ShouldRevalidateFunction,
} from "@remix-run/react";
import { setEnv } from "@webstudio-is/feature-flags";
import env from "./env/env.server";
import { useSetFeatures } from "./shared/use-set-features";

export const loader = () => {
  return json({
    features: env.FEATURES,
  });
};

export default function App() {
  const { features } = useLoaderData<typeof loader>();
  setEnv(features);
  useSetFeatures();

  return <Outlet />;
}

export const shouldRevalidate: ShouldRevalidateFunction = () => {
  return false;
};
