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
  List,
  ListItem,
  Flex,
  DropdownMenu,
  DropdownMenuTrigger,
  SmallIconButton,
  DropdownMenuContent,
  DropdownMenuItem,
  ScrollArea,
  Box,
} from "@webstudio-is/design-system";
import { nativeClient } from "~/shared/trpc/trpc-client";
import type { User } from "~/shared/db/user.server";
import { nanoid } from "nanoid";
import { EllipsesIcon } from "@webstudio-is/icons";

type DeleteConfirmationDialogProps = {
  onClose: () => void;
  onConfirm: () => void;
  question: string;
};

const DeleteConfirmationDialog = ({
  onClose,
  onConfirm,
  question,
}: DeleteConfirmationDialogProps) => {
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (isOpen === false) {
          onClose();
        }
      }}
    >
      <DialogContent>
        <Flex gap="3" direction="column" css={{ padding: theme.panel.padding }}>
          <Text>{question}</Text>
          <Flex direction="rowReverse" gap="2">
            <DialogClose>
              <Button
                color="destructive"
                onClick={() => {
                  onConfirm();
                }}
              >
                Delete
              </Button>
            </DialogClose>
            <DialogClose>
              <Button color="ghost">Cancel</Button>
            </DialogClose>
          </Flex>
        </Flex>
        <DialogTitle>Delete confirmation</DialogTitle>
      </DialogContent>
    </Dialog>
  );
};

const TagsList = ({
  projectId,
  projectsTags,
  projectTagsIds,
  onEdit,
}: {
  projectId: string;
  projectsTags: User["projectsTags"];
  projectTagsIds: string[];
  onEdit: (tagId: string) => void;
}) => {
  const revalidator = useRevalidator();
  const [deleteConfirmationTagId, setDeleteConfirmationTagId] =
    useState<string>();

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
      <Box css={{ maxHeight: 300 }}>
        <ScrollArea>
          <List asChild>
            <Grid gap={1} css={{ paddingBlock: theme.panel.paddingBlock }}>
              {projectsTags
                .sort((a, b) => a.label.localeCompare(b.label))
                .map((tag, index) => (
                  <ListItem
                    asChild
                    onSelect={() => {}}
                    index={index}
                    key={tag.id}
                  >
                    <Flex
                      justify="between"
                      align="center"
                      gap="2"
                      css={{
                        paddingInline: theme.panel.paddingInline,
                        outlineColor: theme.colors.borderFocus,
                        outlineOffset: -2,
                        paddingBlock: theme.spacing[2],
                      }}
                    >
                      <CheckboxAndLabel
                        key={tag.id}
                        css={{ overflow: "hidden", flexGrow: 1 }}
                      >
                        <Checkbox
                          id={tag.id}
                          name="tagId"
                          value={tag.id}
                          tabIndex={-1}
                          defaultChecked={projectTagsIds.includes(tag.id)}
                        />
                        <Label truncate htmlFor={tag.id}>
                          {tag.label}
                        </Label>
                      </CheckboxAndLabel>
                      <DropdownMenu modal>
                        <DropdownMenuTrigger asChild>
                          {/* a11y is completely broken here
                          focus is not restored to button invoker
                          @todo fix it eventually and consider restoring from closed value preview dialog
                      */}
                          <SmallIconButton
                            tabIndex={-1}
                            aria-label="Open variable menu"
                            icon={<EllipsesIcon />}
                          />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          css={{ width: theme.spacing[24] }}
                          onCloseAutoFocus={(event) => event.preventDefault()}
                          align="end"
                        >
                          <DropdownMenuItem
                            onSelect={() => {
                              onEdit(tag.id);
                            }}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => {
                              setDeleteConfirmationTagId(tag.id);
                            }}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </Flex>
                  </ListItem>
                ))}
              {projectsTags.length === 0 && (
                <Text align="center">No tags found</Text>
              )}
              {deleteConfirmationTagId && (
                <DeleteConfirmationDialog
                  question="Are you sure you want to delete this tag? It will be removed from all projects."
                  onClose={() => setDeleteConfirmationTagId(undefined)}
                  onConfirm={async () => {
                    setDeleteConfirmationTagId(undefined);
                    const updatedTags = projectsTags.filter(
                      (tag) => tag.id !== deleteConfirmationTagId
                    );
                    await nativeClient.user.updateProjectsTags.mutate({
                      tags: updatedTags,
                    });
                    revalidator.revalidate();
                  }}
                />
              )}
            </Grid>
          </List>
        </ScrollArea>
      </Box>
    </form>
  );
};

const TagEdit = ({
  projectsTags,
  tag,
  onComplete,
}: {
  projectsTags: User["projectsTags"];
  tag: User["projectsTags"][number];
  onComplete: () => void;
}) => {
  const revalidator = useRevalidator();
  const isExisting = projectsTags.some(({ id }) => id === tag.id);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const label = ((formData.get("tag") as string) || "").trim();
        if (tag.label === label || !label) {
          return;
        }
        let updatedTags = [];
        if (isExisting) {
          updatedTags = projectsTags.map((availableTag) => {
            if (availableTag.id === tag.id) {
              return { ...availableTag, label };
            }
            return availableTag;
          });
        } else {
          updatedTags = [...projectsTags, { id: tag.id, label }];
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
        <Button type="submit">
          {isExisting ? "Update tag" : "Create tag"}
        </Button>
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
  projectsTags,
  projectTagsIds,
  isOpen,
  onOpenChange,
}: {
  projectId: string;
  projectsTags: User["projectsTags"];
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
              projectsTags={projectsTags}
              projectTagsIds={projectTagsIds}
              onEdit={(tagId) => {
                setEditingTag(projectsTags.find((tag) => tag.id === tagId));
              }}
            />
            <DialogActions>
              <Button
                onClick={() => setEditingTag({ id: nanoid(5), label: "" })}
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
            projectsTags={projectsTags}
            tag={editingTag}
            onComplete={() => setEditingTag(undefined)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
