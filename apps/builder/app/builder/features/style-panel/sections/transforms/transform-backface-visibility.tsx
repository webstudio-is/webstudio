import { toValue, type StyleProperty } from "@webstudio-is/css-engine";
import {
  CssValueListItem,
  Grid,
  Label,
  SmallIconButton,
  SmallToggleButton,
  theme,
} from "@webstudio-is/design-system";
import { humanizeString } from "~/shared/string-utils";
import type { SectionProps } from "../shared/section";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import { transformPanels } from "./transforms";
import {
  EyeconClosedIcon,
  EyeconOpenIcon,
  SubtractIcon,
} from "@webstudio-is/icons";
import { TextControl } from "../../controls";
import { PropertyName } from "../../shared/property-name";
import { styleConfigByName } from "../../shared/configs";

const property: StyleProperty = "backfaceVisibility";

export const BackfaceVisibility = (props: SectionProps) => {
  const { currentStyle, setProperty, deleteProperty } = props;
  const value = currentStyle[property]?.local;
  const { label } = styleConfigByName(property);

  if (value?.type !== "keyword") {
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
          <PropertyName
            label={label}
            properties={[property]}
            style={currentStyle}
            onReset={() => deleteProperty(property)}
          />
          <TextControl
            property={property}
            currentStyle={currentStyle}
            setProperty={setProperty}
            deleteProperty={deleteProperty}
          />
        </Grid>
      }
    >
      <CssValueListItem
        id={property}
        index={transformPanels.length + 1}
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
              pressed={value.hidden}
              tabIndex={-1}
              onPressedChange={() =>
                setProperty(property)({
                  ...value,
                  hidden: value.hidden ? false : true,
                })
              }
              icon={value.hidden ? <EyeconClosedIcon /> : <EyeconOpenIcon />}
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
