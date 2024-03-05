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
import { useState } from "react";
import { MarketplaceProduct } from "@webstudio-is/project-build";
import { serverSyncStore } from "~/shared/sync";
import { createTrpcRemixProxy } from "~/shared/remix/trpc-remix-proxy";
import {
  MarketplaceApprovalStatus,
  type ProjectRouter,
} from "@webstudio-is/project";
import { projectsPath } from "~/shared/router-utils";

const imgStyle = css({
  width: 72,
  height: 72,
  borderRadius: theme.borderRadius[4],
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: theme.colors.borderMain,
});

const defaultMarketplaceProduct: Partial<MarketplaceProduct> = {
  category: "sectionTemplates",
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

const useMarketplaceApprovalStatus = () => {
  const { send, data, state } = trpc.setMarketplaceApprovalStatus.useMutation();
  const project = useStore($project);

  const status =
    data?.marketplaceApprovalStatus ??
    project?.marketplaceApprovalStatus ??
    "UNLISTED";

  const handleSuccess = ({
    marketplaceApprovalStatus,
  }: {
    marketplaceApprovalStatus: MarketplaceApprovalStatus;
  }) => {
    const project = $project.get();
    if (project) {
      $project.set({
        ...project,
        marketplaceApprovalStatus,
      });
    }
  };

  return {
    status,
    state,
    submit() {
      if (project) {
        send(
          {
            projectId: project.id,
            marketplaceApprovalStatus: "PENDING",
          },
          handleSuccess
        );
      }
    },
    unlist() {
      if (project) {
        send(
          {
            projectId: project.id,
            marketplaceApprovalStatus: "UNLISTED",
          },
          handleSuccess
        );
      }
    },
  };
};

export const SectionMarketplace = () => {
  const project = useStore($project);
  const approval = useMarketplaceApprovalStatus();
  const [data, setData] = useState(() => $marketplaceProduct.get());
  const ids = useIds([
    "name",
    "thumbnailAssetId",
    "author",
    "email",
    "website",
    "issues",
    "description",
    "isConfirmed",
  ]);
  const assets = useStore($assets);
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const [errors, setErrors] = useState<ReturnType<typeof validate>>();

  if (data === undefined || project === undefined) {
    return;
  }
  const asset = assets.get(data.thumbnailAssetId ?? "");
  const thumbnailUrl = asset ? `${asset.name}` : undefined;

  const handleSave = <Setting extends keyof MarketplaceProduct>(
    setting: Setting
  ) => {
    return (value: MarketplaceProduct[Setting]) => {
      const nextData = {
        ...defaultMarketplaceProduct,
        ...data,
        [setting]: value,
      };
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
  const sectionSpacing = { mx: theme.spacing[5], px: theme.spacing[5] };

  return (
    <>
      <Grid gap={1} css={sectionSpacing}>
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

      <Grid gap={2} css={sectionSpacing}>
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

      <Grid gap={1} css={sectionSpacing}>
        <Label htmlFor={ids.author}>Author</Label>
        <InputErrorsTooltip errors={errors?.author}>
          <InputField
            id={ids.author}
            value={data.author ?? ""}
            color={errors?.author && "error"}
            onChange={(event) => {
              handleSave("author")(event.target.value);
            }}
          />
        </InputErrorsTooltip>
      </Grid>

      <Grid gap={1} css={sectionSpacing}>
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

      <Grid gap={1} css={sectionSpacing}>
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

      <Grid gap={1} css={sectionSpacing}>
        <Label htmlFor={ids.issues}>Issues Tracker</Label>
        <InputErrorsTooltip errors={errors?.issues}>
          <InputField
            id={ids.issues}
            value={data.issues ?? ""}
            color={errors?.issues && "error"}
            onChange={(event) => {
              handleSave("issues")(event.target.value);
            }}
          />
        </InputErrorsTooltip>
      </Grid>

      <Grid gap={2} css={sectionSpacing}>
        <Label htmlFor={ids.description}>Description</Label>
        <InputErrorsTooltip errors={errors?.description}>
          <TextArea
            id={ids.description}
            rows={5}
            autoGrow
            maxRows={10}
            value={data.description ?? ""}
            onChange={handleSave("description")}
          />
        </InputErrorsTooltip>
      </Grid>

      <Grid gap={2} css={sectionSpacing}>
        <PanelBanner>
          <Text>
            {`For a page to show up in the marketplace, you will need to add a "ws:category"
            meta tag in the page settings. Optionally, you can also define
            "ws:title"; otherwise, the page title will be used.`}
          </Text>
          <Text color="destructive">
            {`Don't forget to publish your project after every change to make your
            changes available in the marketplace!`}
          </Text>
        </PanelBanner>
      </Grid>

      {approval.status === "UNLISTED" && (
        <Grid gap={2} css={sectionSpacing}>
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

      <Flex align="center" justify="between" gap={2} css={sectionSpacing}>
        <Text>Status: {approval.status.toLocaleLowerCase()}</Text>
        {approval.status === "UNLISTED" ? (
          <Button
            color="primary"
            disabled={isConfirmed === false}
            state={approval.state === "idle" ? undefined : "pending"}
            onClick={approval.submit}
          >
            Submit
          </Button>
        ) : (
          <Button
            state={approval.state === "idle" ? undefined : "pending"}
            color="destructive"
            onClick={approval.unlist}
          >
            Unlist from Marketplace
          </Button>
        )}
      </Flex>
    </>
  );
};
