import { FloatingPanel } from "~/builder/shared/floating-panel";
import type { SectionProps } from "../shared/section";
import { humanizeString } from "~/shared/string-utils";
import {
  CssValueListItem,
  Grid,
  theme,
  Label,
  SmallToggleButton,
  SmallIconButton,
} from "@webstudio-is/design-system";
import { toValue, type StyleProperty } from "@webstudio-is/css-engine";
import {
  EyeconOpenIcon,
  SubtractIcon,
  EyeconClosedIcon,
} from "@webstudio-is/icons";

const property: StyleProperty = "transformOrigin";

export const TransformOrigin = (props: SectionProps & { index: number }) => {
  const { currentStyle, setProperty, deleteProperty, index } = props;
  const value = currentStyle[property]?.value;
  console.log(currentStyle[property]);

  if (value?.type !== "tuple") {
    return;
  }

  return (
    <FloatingPanel
      title={humanizeString(property)}
      content={
        <Grid
          gap="4"
          align="center"
          css={{ p: theme.spacing[9], gridTemplateColumns: "1.5fr 1fr" }}
        >
          Testing
        </Grid>
      }
    >
      <CssValueListItem
        id={property}
        index={index}
        hidden={value.hidden}
        label={
          <Label truncate>
            {humanizeString(property)}: {toValue({ ...value, hidden: false })}
          </Label>
        }
        buttons={
          <>
            <SmallToggleButton
              variant="normal"
              // pressed={value.hidden}
              tabIndex={-1}
              icon={value.hidden ? <EyeconClosedIcon /> : <EyeconOpenIcon />}
              onPressedChange={() =>
                // setProperty(property)({
                //   ...value,
                //   hidden: value.hidden ? false : true,
                // })
                console.log("onPressedChange")
              }
            />
            <SmallIconButton
              variant="destructive"
              tabIndex={-1}
              icon={<SubtractIcon />}
              onClick={() => deleteProperty(property)}
            />
          </>
        }
      ></CssValueListItem>
    </FloatingPanel>
  );
};
