import type { LoaderFunction, MetaFunction } from "@remix-run/node";
import CatchAllContnet, {
  loader as catchAllloader,
  meta as catchAllmeta,
  links as catchAllLinks,
} from "./$";

export const meta: MetaFunction = (args) => catchAllmeta(args);
export const loader: LoaderFunction = (args) => catchAllloader(args);
export const links = catchAllLinks;
const Content = () => <CatchAllContnet />;
export default Content;
