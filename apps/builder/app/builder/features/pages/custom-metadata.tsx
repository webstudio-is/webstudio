import { useId } from "react";
import { useStore } from "@nanostores/react";
import {
  Button,
  Grid,
  InputErrorsTooltip,
  InputField,
  Label,
  SmallIconButton,
  Text,
  theme,
} from "@webstudio-is/design-system";
import { TrashIcon, PlusIcon } from "@webstudio-is/icons";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import { isLiteralExpression } from "@webstudio-is/sdk";
import { computeExpression } from "~/shared/data-variables";
import {
  BindingControl,
  BindingPopover,
} from "~/builder/shared/binding-popover";
import { $pageRootScope } from "./page-utils";

type Meta = {
  property: string;
  content: string;
};

type CustomMetadataProps = {
  customMetas: Meta[];
  onChange: (value: Meta[]) => void;
};

const MetadataItem = (props: {
  property: string;
  content: string;
  onDelete: () => void;
  onChange: (property: string, content: string) => void;
}) => {
  const propertyId = useId();
  const contentId = useId();
  const { variableValues, scope, aliases } = useStore($pageRootScope);

  const content = computeExpression(props.content, variableValues);

  return (
    <Grid
      gap={2}
      css={{
        gridTemplateColumns: `${theme.spacing[18]} 1fr 19px`,
        gridTemplateAreas: `
         "property property-input button"
         "content  content-input  button"
        `,
      }}
      align={"center"}
    >
      <Label htmlFor={propertyId} css={{ gridArea: "property" }}>
        Property
      </Label>
      <InputErrorsTooltip errors={undefined}>
        <InputField
          css={{ gridArea: "property-input" }}
          id={propertyId}
          property="path"
          value={props.property}
          onChange={(event) => {
            props.onChange(event.target.value, props.content);
          }}
        />
      </InputErrorsTooltip>
      <Label htmlFor={contentId} css={{ gridArea: "content" }}>
        Content
      </Label>
      <BindingControl>
        {isFeatureEnabled("cms") && (
          <BindingPopover
            scope={scope}
            aliases={aliases}
            variant={isLiteralExpression(props.content) ? "default" : "bound"}
            value={props.content}
            onChange={(value) => {
              props.onChange(props.property, value);
            }}
            onRemove={(evaluatedValue) => {
              props.onChange(props.property, JSON.stringify(evaluatedValue));
            }}
          />
        )}
        <InputErrorsTooltip errors={undefined}>
          <InputField
            css={{
              gridArea: "content-input",
            }}
            disabled={isLiteralExpression(props.content) === false}
            color={typeof content !== "string" ? "error" : undefined}
            id={contentId}
            property="path"
            value={content}
            onChange={(event) => {
              props.onChange(
                props.property,
                JSON.stringify(event.target.value)
              );
            }}
          />
        </InputErrorsTooltip>
      </BindingControl>
      <Grid
        css={{
          gridArea: "button",
          justifyItems: "center",
          gap: "2px",
          color: theme.colors.foregroundIconSecondary,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="19"
          height="11"
          viewBox="0 0 19 11"
          fill="currentColor"
        >
          <path d="M10 10.05V6.05005C10 2.73634 7.31371 0.0500488 4 0.0500488H0V1.05005H4C6.76142 1.05005 9 3.28863 9 6.05005V10.05H10Z" />
        </svg>

        <SmallIconButton
          variant="destructive"
          icon={<TrashIcon />}
          onClick={props.onDelete}
        />

        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="19"
          height="11"
          viewBox="0 0 19 11"
          fill="currentColor"
        >
          <path d="M-4.37114e-07 10.05L4 10.05C7.31371 10.05 10 7.36376 10 4.05005L10 0.0500488L9 0.0500488L9 4.05005C9 6.81147 6.76142 9.05005 4 9.05005L-3.93402e-07 9.05005L-4.37114e-07 10.05Z" />
        </svg>
      </Grid>
    </Grid>
  );
};

export const CustomMetadata = (props: CustomMetadataProps) => {
  return (
    <Grid gap={2} css={{ my: theme.spacing[5], mx: theme.spacing[8] }}>
      <Label text="title">Custom Metadata</Label>
      <Text color="subtle">
        Use this section to input metadata for the document, which will be used
        to generate{" "}
        <Text as="b" variant={"regularBold"}>
          &lt;meta&gt;
        </Text>{" "}
        tags. Each pair consists of a{" "}
        <Text as="b" variant={"regularBold"}>
          property
        </Text>{" "}
        attribute, indicating the type of metadata, and a{" "}
        <Text as="b" variant={"regularBold"}>
          content
        </Text>{" "}
        attribute, specifying its value.
      </Text>
      <div />
      <Grid gap={3}>
        {props.customMetas.map((meta, index) => (
          <MetadataItem
            key={index}
            property={meta.property}
            content={meta.content}
            onChange={(property, content) => {
              const newCustomMetas = [...props.customMetas];
              newCustomMetas[index] = { property, content };
              props.onChange(newCustomMetas);
            }}
            onDelete={() => {
              const newCustomMetas = [...props.customMetas];
              newCustomMetas.splice(index, 1);
              props.onChange(newCustomMetas);
            }}
          />
        ))}

        <Button
          type="button"
          color="neutral"
          css={{
            justifySelf: "center",
          }}
          prefix={<PlusIcon />}
          onClick={() => {
            const newCustomMetas = [
              ...props.customMetas,
              { property: "", content: `""` },
            ];
            props.onChange(newCustomMetas);
          }}
        >
          Add another metadata pair
        </Button>
      </Grid>
    </Grid>
  );
};
