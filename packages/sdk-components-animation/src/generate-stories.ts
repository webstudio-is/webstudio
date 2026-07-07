import { generateStories } from "@webstudio-is/sdk-cli/generate-stories";
import * as baseMetas from "@webstudio-is/sdk-components-react/metas";
import * as templates from "./story-templates";
import * as metas from "./metas";

await generateStories({
  packageName: "@webstudio-is/sdk-components-animation",
  templates,
  metas,
  namespaceMetas: new Map([
    ["@webstudio-is/sdk-components-react/components", baseMetas],
  ]),
});
