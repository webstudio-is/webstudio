import { hydrate } from "react-dom";
import { RemixBrowser } from "@remix-run/react";
import { initSentry } from "./shared/sentry";

initSentry();

hydrate(<RemixBrowser />, document);
