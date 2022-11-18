import * as fs from "fs/promises";
import * as path from "path";
import type { Config } from "@svgo/jsx";

const template = ({
  sourceFile,
  componentName,
  jsx,
}) => `// Generated from ${sourceFile}

import { forwardRef } from "react";
import { IconProps } from "../types";

// prettier-ignore
export const ${componentName}Icon = forwardRef<SVGSVGElement, IconProps>(
  ({ color = "currentColor", ...props }, forwardedRef) => {
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
  outputDir: "./src/gen",
  template,
  transformFilename,
  svgProps: {
    width: "16",
    height: "16",
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
    await fs.writeFile(path.join(process.cwd(), "./src/gen/index.ts"), result);
  },
};
