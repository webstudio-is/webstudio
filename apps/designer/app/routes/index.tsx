// We want our catch-all route to also handle `/`.
// Unfortunately, Remix doesn't do this by default,
// see https://github.com/remix-run/remix/issues/2098#issuecomment-1049262218 .
// To solve this, we're re-exporting the $.tsx route API in index.tsx

import type { LoaderFunction, MetaFunction } from "@remix-run/node";
import CatchAllContnet, {
  loader as catchAllloader,
  meta as catchAllmeta,
  handle as catchAllHandle,
} from "./$";

// We're wrapping functions in order for them to be distinct from the ones in $.tsx.
// If they are the same, Remix may get confused, and don't load data on page transitions.

export const meta: MetaFunction = (args) => catchAllmeta(args);
export const loader: LoaderFunction = (args) => catchAllloader(args);
export const handle = catchAllHandle;
const Content = () => <CatchAllContnet />;
export default Content;
