export * from "./layout/layout";
export * from "./flex-child/flex-child";
export * from "./grid-child/grid-child";
// export * from "./spacing/spacing";
export * from "./size/size";
export * from "./position/position";
export * from "./typography/typography";
export * from "./backgrounds/backgrounds";
export * from "./borders/borders";
export * from "./effects/effects";
export * from "./other/other";

import { SpacingSection as SpacingSectionNew } from "./spacing/spacing";
import { SpacingSection as SpacingSectionOld } from "./spacing/spacing-old";

// TMP (also remane back to index.ts)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SpacingSection = (props: any) => {
  return (
    <>
      <SpacingSectionNew {...props} />
      <SpacingSectionOld {...props} />
    </>
  );
};
