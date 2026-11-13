import { generateStories } from "@webstudio-is/sdk-cli/generate-stories";
import * as baseComponents from "@webstudio-is/sdk-components-react/components";
import * as baseMetas from "@webstudio-is/sdk-components-react/metas";
import * as components from "./components";
import { templates } from "./story-templates";
import * as metas from "./metas";

await generateStories({
  packageName: "@webstudio-is/sdk-components-animation",
  components,
  templates,
  metas,
  namespaceComponents: new Map([
    ["@webstudio-is/sdk-components-react/components", baseComponents],
  ]),
  namespaceMetas: new Map([
    ["@webstudio-is/sdk-components-react/components", baseMetas],
  ]),
});
