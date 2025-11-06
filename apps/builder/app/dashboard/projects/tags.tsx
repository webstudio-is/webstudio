import { useRevalidator } from "react-router-dom";
import { useState } from "react";
import {
  Text,
  theme,
  Dialog,
  DialogContent,
  DialogTitle,
  Button,
  DialogActions,
  DialogClose,
  Checkbox,
  CheckboxAndLabel,
  Label,
  InputField,
  DialogTitleActions,
  Grid,
} from "@webstudio-is/design-system";
import { nativeClient } from "~/shared/trpc/trpc-client";
import type { User } from "~/shared/db/user.server";
import { nanoid } from "nanoid";

const TagsList = ({
  projectId,
  availableTags,
  projectTagsIds,
}: {
  projectId: string;
  availableTags: User["projectsTags"];
  projectTagsIds: string[];
}) => {
  const revalidator = useRevalidator();

  return (
    <form
      onChange={async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const tagsIds = formData.getAll("tagId") as string[];
        await nativeClient.project.updateTags.mutate({
          projectId,
          tags: tagsIds,
        });
        revalidator.revalidate();
      }}
    >
      <Grid gap={1} css={{ padding: theme.panel.padding }}>
        {availableTags
          .sort((a, b) => a.label.localeCompare(b.label))
          .map((tag) => (
            <CheckboxAndLabel key={tag.id}>
              <Checkbox
                id={tag.id}
                name="tagId"
                value={tag.id}
                defaultChecked={projectTagsIds.includes(tag.id)}
              />
              <Label htmlFor={tag.id}>{tag.label}</Label>
            </CheckboxAndLabel>
          ))}
        {availableTags.length === 0 && (
          <Text align="center">No tags found</Text>
        )}
      </Grid>
    </form>
  );
};

const TagEdit = ({
  availableTags,
  tag,
  onComplete,
}: {
  availableTags: User["projectsTags"];
  tag: User["projectsTags"][number];
  onComplete: () => void;
}) => {
  const revalidator = useRevalidator();

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const label = ((formData.get("tag") as string) || "").trim();
        if (tag.label === label || !label) {
          return;
        }
        const isExisting = availableTags.some(({ id }) => id === tag.id);
        let updatedTags = [];
        if (isExisting) {
          updatedTags = availableTags.map((availableTag) => {
            if (availableTag.id === tag.id) {
              return { ...availableTag, label };
            }
            return availableTag;
          });
        } else {
          updatedTags = [...availableTags, { id: tag.id, label }];
        }

        await nativeClient.user.updateProjectsTags.mutate({
          tags: updatedTags,
        });
        revalidator.revalidate();
        onComplete();
      }}
    >
      <Grid css={{ padding: theme.panel.padding }}>
        <InputField
          autoFocus
          defaultValue={tag.label}
          name="tag"
          placeholder="My tag"
          minLength={1}
        />
      </Grid>
      <DialogActions>
        <Button type="submit">Create tag</Button>
        <Button
          color="ghost"
          type="button"
          onClick={() => {
            onComplete();
          }}
        >
          Cancel
        </Button>
      </DialogActions>
    </form>
  );
};

export const TagsDialog = ({
  projectId,
  availableTags,
  projectTagsIds,
  isOpen,
  onOpenChange,
}: {
  projectId: string;
  availableTags: User["projectsTags"];
  projectTagsIds: string[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) => {
  const [editingTag, setEditingTag] = useState<
    User["projectsTags"][number] | undefined
  >();
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle
          suffix={
            <DialogTitleActions>
              <DialogClose />
            </DialogTitleActions>
          }
        >
          Project tags
        </DialogTitle>
        {!editingTag && (
          <>
            <TagsList
              projectId={projectId}
              availableTags={availableTags}
              projectTagsIds={projectTagsIds}
            />
            <DialogActions>
              <Button
                onClick={() => setEditingTag({ id: nanoid(), label: "" })}
              >
                Create tag
              </Button>
              <DialogClose>
                <Button color="ghost" type="button">
                  Cancel
                </Button>
              </DialogClose>
            </DialogActions>
          </>
        )}
        {editingTag && (
          <TagEdit
            availableTags={availableTags}
            tag={editingTag}
            onComplete={() => setEditingTag(undefined)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
