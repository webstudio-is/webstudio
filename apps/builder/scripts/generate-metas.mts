import { join } from "node:path";
import { writeFile } from "node:fs/promises";
import * as baseComponentMetas from "@webstudio-is/sdk-components-react/metas";
import * as baseComponentPropsMetas from "@webstudio-is/sdk-components-react/props";
import * as remixComponentMetas from "@webstudio-is/sdk-components-react-remix/metas";
import * as remixComponentPropsMetas from "@webstudio-is/sdk-components-react-remix/props";
import * as radixComponentMetas from "@webstudio-is/sdk-components-react-radix/metas";
import * as radixComponentPropsMetas from "@webstudio-is/sdk-components-react-radix/props";

const data = {
  base: {
    metas: baseComponentMetas,
    propsMetas: baseComponentPropsMetas,
  },
  remix: {
    metas: remixComponentMetas,
    propsMetas: remixComponentPropsMetas,
  },
  radix: {
    metas: radixComponentMetas,
    propsMetas: radixComponentPropsMetas,
  },
};

await writeFile(join(process.cwd(), "public/metas.json"), JSON.stringify(data));
console.info("public/metas.json is generated");
