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
  Select,
  rawTheme,
  Box,
} from "@webstudio-is/design-system";
import { ImageControl } from "./image-control";
import {
  $assets,
  $imageLoader,
  $marketplaceProduct,
  $project,
} from "~/shared/nano-states";
import { Image } from "@webstudio-is/image";
import { useIds } from "~/shared/form-utils";
import { useState } from "react";
import {
  MarketplaceProduct,
  marketplaceCategories,
} from "@webstudio-is/project-build";
import { serverSyncStore } from "~/shared/sync";
import { MarketplaceApprovalStatus } from "@webstudio-is/project";
import { trpcClient } from "~/shared/trpc/trpc-client";
import { rightPanelWidth, sectionSpacing } from "./utils";

const thumbnailStyle = css({
  borderRadius: theme.borderRadius[4],
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: theme.colors.borderMain,
  aspectRatio: "1.91",
  variants: {
    hasAsset: {
      true: {
        objectFit: "cover",
      },
    },
  },
});

const defaultMarketplaceProduct: Partial<MarketplaceProduct> = {
  category: "sectionTemplates",
};

const validate = (data: MarketplaceProduct) => {
  const parsedResult = MarketplaceProduct.safeParse(data);
  if (parsedResult.success === false) {
    return parsedResult.error.formErrors.fieldErrors;
  }
};

const useMarketplaceApprovalStatus = () => {
  const { send, data, state } =
    trpcClient.project.setMarketplaceApprovalStatus.useMutation();
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
  const imageLoader = useStore($imageLoader);
  const approval = useMarketplaceApprovalStatus();
  const [data, setData] = useState(() => $marketplaceProduct.get());
  const ids = useIds([
    "name",
    "category",
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

  return (
    <Grid gap={2}>
      <Text variant="titles" css={sectionSpacing}>
        Marketplace
      </Text>
      <Grid gap={1} css={sectionSpacing}>
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

      <Grid gap={1} css={sectionSpacing}>
        <Label htmlFor={ids.category}>Category</Label>
        <Select
          options={Array.from(marketplaceCategories.keys())}
          getLabel={(category: MarketplaceProduct["category"]) =>
            marketplaceCategories.get(category)?.label
          }
          getDescription={(category: MarketplaceProduct["category"]) => (
            <Box css={{ width: rightPanelWidth }}>
              {marketplaceCategories.get(category)?.description}
            </Box>
          )}
          onChange={handleSave("category")}
          value={data.category}
          defaultValue={defaultMarketplaceProduct.category}
        />
      </Grid>

      <Grid gap={2} css={sectionSpacing}>
        <Label>Thumbnail</Label>
        <Grid flow="column" gap={3}>
          <InputErrorsTooltip errors={errors?.thumbnailAssetId}>
            <Image
              width={rawTheme.spacing[28]}
              className={thumbnailStyle({ hasAsset: asset !== undefined })}
              src={asset ? `${asset.name}` : undefined}
              loader={imageLoader}
            />
          </InputErrorsTooltip>

          <Grid gap={2}>
            <Text color="subtle">
              The optimal dimensions in marketplace are 600x315 px or larger
              with a 1.91:1 aspect ratio.
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
            {`You can add a "ws:category" meta tag in the page settings for pages being grouped by category. You can also define
            "ws:title" for each page; otherwise, the page title will be used.`}
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
            <Label htmlFor={ids.isConfirmed} css={{ flexShrink: 1 }}>
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
            disabled={isConfirmed === false || errors !== undefined}
            state={approval.state === "idle" ? undefined : "pending"}
            onClick={approval.submit}
          >
            Start Review
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
    </Grid>
  );
};
