import { generateStories } from "@webstudio-is/sdk-cli/generate-stories";
import * as components from "./components";
import { templates } from "./story-templates";
import * as metas from "./metas";

await generateStories({
  packageName: "@webstudio-is/sdk-components-react",
  components,
  templates,
  metas,
});
