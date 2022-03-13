import { useLoaderData } from "remix";
import { Root, type Data } from "@webstudio-is/sdk";
import { loader } from "../canvas/$id";

export { loader };

export default function Preview() {
  const data = useLoaderData<Data>();
  return <Root data={data} />;
}
