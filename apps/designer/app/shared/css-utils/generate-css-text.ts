import { json } from "@remix-run/node";
import { db } from "@webstudio-is/project/server";
import { utils } from "@webstudio-is/project";
import { loadCanvasData } from "~/shared/db";
import { createCssEngine } from "@webstudio-is/css-engine";
import { idAttribute } from "@webstudio-is/react-sdk";
import { addGlobalRules } from "~/canvas/shared/styles";
import { BuildParams } from "../router-utils";

export const generateCssText = async (buildParams: BuildParams) => {
  if (buildParams === undefined) {
    throw json("Required project info", { status: 404 });
  }
  const project = await db.project.loadByParams(buildParams);

  if (project === null) {
    throw json("Project not found", { status: 404 });
  }

  const canvasData = await loadCanvasData(
    project,
    buildParams.mode === "published" ? "prod" : "dev",
    buildParams.pageId
  );

  if (canvasData === undefined) {
    throw json("Page not found", { status: 404 });
  }

  const engine = createCssEngine();

  addGlobalRules(engine, canvasData);

  for (const breakpoint of canvasData.breakpoints) {
    engine.addMediaRule(breakpoint.id, breakpoint);
  }

  const cssRules = utils.tree.getCssRules(canvasData.tree?.root);
  for (const [instanceId, cssRule] of cssRules) {
    engine.addStyleRule(`[${idAttribute}="${instanceId}"]`, cssRule);
  }
  const { cssText } = engine;
  return cssText;
};
