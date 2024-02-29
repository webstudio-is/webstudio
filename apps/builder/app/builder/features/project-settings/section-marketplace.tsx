import { useStore } from "@nanostores/react";
import {
  Grid,
  InputField,
  Label,
  theme,
  Text,
  TextArea,
  Button,
  css,
  Flex,
  CheckboxAndLabel,
  Checkbox,
  InputErrorsTooltip,
  PanelBanner,
} from "@webstudio-is/design-system";
import { ImageControl } from "./image-control";
import {
  $assets,
  $authToken,
  $marketplaceProduct,
  $project,
} from "~/shared/nano-states";
import env from "~/shared/env";
import { Image, createImageLoader } from "@webstudio-is/image";
import { useIds } from "~/shared/form-utils";
import { useEffect, useState } from "react";
import { MarketplaceProduct } from "@webstudio-is/project-build";
import { serverSyncStore } from "~/shared/sync";
import { createTrpcRemixProxy } from "~/shared/remix/trpc-remix-proxy";
import { Project, type ProjectRouter } from "@webstudio-is/project";
import { projectsPath } from "~/shared/router-utils";

const imgStyle = css({
  width: 72,
  height: 72,
  borderRadius: theme.borderRadius[4],
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: theme.colors.borderMain,
});

const defaultMarketplaceProduct: MarketplaceProduct = {
  category: "templates",
  name: "",
  thumbnailAssetId: "",
  description: "",
  email: "",
};

const imageLoader = createImageLoader({
  imageBaseUrl: env.IMAGE_BASE_URL,
});

const trpc = createTrpcRemixProxy<ProjectRouter>((method) =>
  projectsPath(method, { authToken: $authToken.get() })
);

const validate = (data: MarketplaceProduct) => {
  const parsedResult = MarketplaceProduct.safeParse(data);
  if (parsedResult.success === false) {
    return parsedResult.error.formErrors.fieldErrors;
  }
};

export const SectionMarketplace = () => {
  const project = useStore($project);
  const {
    send: setMarketplaceApprovalStatus,
    data: updatedProject,
    state: marketplaceApprovalStatusLoadingState,
  } = trpc.setMarketplaceApprovalStatus.useMutation();
  const [data, setData] = useState(() => ({
    ...defaultMarketplaceProduct,
    ...$marketplaceProduct.get(),
  }));
  const ids = useIds([
    "name",
    "thumbnailAssetId",
    "email",
    "website",
    "description",
    "isConfirmed",
  ]);
  const assets = useStore($assets);
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const [errors, setErrors] = useState<ReturnType<typeof validate>>();
  const asset = assets.get(data.thumbnailAssetId ?? "");
  const thumbnailUrl = asset ? `${asset.name}` : undefined;

  const marketplaceApprovalStatus = updatedProject?.marketplaceApprovalStatus;
  useEffect(() => {
    if (marketplaceApprovalStatus) {
      const nextProject = {
        ...$project.get(),
        marketplaceApprovalStatus,
      } as Project;
      $project.set(nextProject);
    }
  }, [marketplaceApprovalStatus]);

  const handleSave = <Setting extends keyof MarketplaceProduct>(
    setting: Setting
  ) => {
    return (value: MarketplaceProduct[Setting]) => {
      const nextData = { ...data, [setting]: value };
      const errors = validate(nextData);
      setErrors(errors);
      setData(nextData);
      if (errors) {
        return;
      }
      serverSyncStore.createTransaction(
        [$marketplaceProduct],
        (marketplaceProduct) => {
          if (marketplaceProduct === undefined) {
            return;
          }
          Object.assign(marketplaceProduct, nextData);
        }
      );
    };
  };

  if (project === undefined) {
    return;
  }
  return (
    <>
      <Grid
        gap={1}
        css={{
          mx: theme.spacing[5],
          px: theme.spacing[5],
        }}
      >
        <Text variant="titles">Marketplace</Text>
        <Label htmlFor={ids.name}>Product Name</Label>
        <InputErrorsTooltip errors={errors?.name}>
          <InputField
            id={ids.name}
            value={data.name ?? ""}
            autoFocus
            color={errors?.name && "error"}
            onChange={(event) => {
              handleSave("name")(event.target.value);
            }}
          />
        </InputErrorsTooltip>
      </Grid>

      <Grid gap={2} css={{ mx: theme.spacing[5], px: theme.spacing[5] }}>
        <Label>Thumbnail</Label>
        <Grid flow="column" gap={3}>
          <Image
            width={72}
            height={72}
            className={imgStyle()}
            src={thumbnailUrl}
            loader={imageLoader}
          />

          <Grid gap={2}>
            <Text color="subtle">
              Upload a 32 x 32 px image to display in the marketplace overview.
            </Text>
            <ImageControl onAssetIdChange={handleSave("thumbnailAssetId")}>
              <Button css={{ justifySelf: "start" }}>Upload</Button>
            </ImageControl>
          </Grid>
        </Grid>
      </Grid>

      <Grid
        gap={1}
        css={{
          mx: theme.spacing[5],
          px: theme.spacing[5],
        }}
      >
        <Label htmlFor={ids.email}>Email</Label>
        <InputErrorsTooltip errors={errors?.email}>
          <InputField
            id={ids.email}
            value={data.email ?? ""}
            color={errors?.email && "error"}
            onChange={(event) => {
              handleSave("email")(event.target.value);
            }}
          />
        </InputErrorsTooltip>
      </Grid>

      <Grid
        gap={1}
        css={{
          mx: theme.spacing[5],
          px: theme.spacing[5],
        }}
      >
        <Label htmlFor={ids.website}>Website</Label>
        <InputErrorsTooltip errors={errors?.website}>
          <InputField
            id={ids.website}
            value={data.website ?? ""}
            color={errors?.website && "error"}
            onChange={(event) => {
              handleSave("website")(event.target.value);
            }}
          />
        </InputErrorsTooltip>
      </Grid>

      <Grid gap={2} css={{ mx: theme.spacing[5], px: theme.spacing[5] }}>
        <Label htmlFor={ids.description}>Description</Label>
        <TextArea
          id={ids.description}
          rows={5}
          autoGrow
          maxRows={10}
          value={data.description ?? ""}
          onChange={handleSave("description")}
        />
      </Grid>

      {project.marketplaceApprovalStatus === "UNLISTED" && (
        <Grid gap={2} css={{ mx: theme.spacing[5], px: theme.spacing[5] }}>
          <CheckboxAndLabel>
            <Checkbox
              checked={isConfirmed}
              id={ids.isConfirmed}
              onCheckedChange={(value) => {
                if (typeof value === "boolean") {
                  setIsConfirmed(value);
                }
              }}
            />
            <Label htmlFor={ids.isConfirmed} css={{ flexBasis: "fit-content" }}>
              I understand that by submitting, this project will become
              available in a public marketplace.
            </Label>
          </CheckboxAndLabel>
        </Grid>
      )}

      <Grid gap={2} css={{ mx: theme.spacing[5], px: theme.spacing[5] }}>
        <PanelBanner>
          <Text color="destructive">
            {`Don't forget to publish your project after every change to make your
            changes available in the marketplace!`}
          </Text>
          <Text color="destructive">
            {`Ensure that every page containing a template has the "ws:category"
            meta in the page settings. Optionally, you can also define
            "ws:title"; otherwise, the page title will be used.`}
          </Text>

          {project.marketplaceApprovalStatus === "UNLISTED" && (
            <Text>
              {`After submitting, we will review your project. Please reach out to
              us on Discord if you have any questions.`}
            </Text>
          )}
        </PanelBanner>
      </Grid>

      <Flex
        align="center"
        justify="end"
        gap={2}
        css={{ mx: theme.spacing[5], px: theme.spacing[5] }}
      >
        {project.marketplaceApprovalStatus === "UNLISTED" ? (
          <Button
            color="primary"
            disabled={isConfirmed === false}
            state={
              marketplaceApprovalStatusLoadingState === "idle"
                ? undefined
                : "pending"
            }
            onClick={() => {
              setMarketplaceApprovalStatus({
                projectId: project.id,
                marketplaceApprovalStatus: "PENDING",
              });
            }}
          >
            Submit
          </Button>
        ) : (
          <Button
            state={
              marketplaceApprovalStatusLoadingState === "idle"
                ? undefined
                : "pending"
            }
            color="destructive"
            onClick={() => {
              setMarketplaceApprovalStatus({
                projectId: project.id,
                marketplaceApprovalStatus: "UNLISTED",
              });
            }}
          >
            Unlist from Marketplace
          </Button>
        )}
      </Flex>
    </>
  );
};
