import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { Config } from "@svgo/jsx";

const template: Config["template"] = ({
  sourceFile,
  componentName,
  jsx,
}) => `// Generated from ${sourceFile}

import { forwardRef } from "react";
import type { IconProps } from "../types";

// prettier-ignore
export const ${componentName}Icon = forwardRef<SVGSVGElement, IconProps>(
  ({ color = "currentColor", size = 16, ...props }, forwardedRef) => {
    return (
      ${jsx}
    );
  }
);

${componentName}Icon.displayName = "${componentName}Icon";
`;

const transformFilename = (filename: string) => {
  return path.basename(filename, path.extname(filename)) + ".tsx";
};

export const config: Config = {
  inputDir: "./icons",
  outputDir: "./src/__generated__",
  template,
  transformFilename,
  svgProps: {
    width: "{size}",
    height: "{size}",
    fill: "{color}",
    "{...props}": null,
    ref: "{forwardedRef}",
  },
  plugins: [
    {
      name: "preset-default",
      params: {
        overrides: {
          // preserve viewBox
          removeViewBox: false,
          convertTransform: false,
          inlineStyles: false,
        },
      },
    },
    // convert width/height to viewBox if missing
    { name: "removeDimensions" },
  ],
  after: async ({ targets }) => {
    let result = "";
    for (const { file } of targets) {
      const tsFile = path.basename(file, path.extname(file));
      result += `export * from "./${tsFile}";\n`;
    }
    await fs.writeFile(
      path.join(process.cwd(), "./src/__generated__/index.ts"),
      result
    );
  },
};
