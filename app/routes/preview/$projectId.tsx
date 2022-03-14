import { useLoaderData } from "remix";
import { Root, type Data } from "@webstudio-is/sdk";
// @todo bad idea to import directly from routes
import { loader, type ErrorData } from "../canvas/$projectId";

export { loader };

export default function Preview() {
  const data = useLoaderData<Data | ErrorData>();
  if ("errors" in data) {
    return <p>{data.errors}</p>;
  }
  return <Root data={data} />;
}
