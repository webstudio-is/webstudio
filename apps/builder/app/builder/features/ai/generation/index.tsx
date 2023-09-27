import { Box, Button } from "@webstudio-is/design-system";
import { Prompt } from "./prompt";
import { useEffect, useRef, useState } from "react";
import type { SectionId, Sections } from "./types";
import type { sections } from "@webstudio-is/ai";
import { SectionsEditor } from "./sections-editor";
import type { DroppableTarget, InstanceSelector } from "~/shared/tree-utils";
import {
  breakpointsStore,
  registeredComponentMetasStore,
  selectedInstanceSelectorStore,
} from "~/shared/nano-states";
import {
  WsEmbedTemplate,
  generateDataFromEmbedTemplate,
} from "@webstudio-is/react-sdk";
import { isBaseBreakpoint } from "~/shared/breakpoints";
import { insertTemplateData } from "~/shared/instance-utils";

export const AiGeneration = ({
  rootInstanceSelector,
}: {
  rootInstanceSelector: InstanceSelector;
}) => {
  const [sections, setSections] = useState<Sections | undefined>();

  // calculateInsertionPosition should always work with the latest sections state.
  const calculateInsertionPositionRef = useRef((id: SectionId) =>
    sections ? calculateInsertionPosition(id, sections) : -1
  );
  useEffect(() => {
    calculateInsertionPositionRef.current = (id: SectionId) =>
      sections ? calculateInsertionPosition(id, sections) : -1;
  }, [sections]);

  return (
    <Box>
      {sections ? (
        <Box>
          {sections !== undefined ? (
            <Button
              onClick={() => {
                setSections(undefined);
              }}
            >
              Clear
            </Button>
          ) : null}
          <SectionsEditor
            sections={Object.entries(sections)}
            onInput={(id, key, value) => {
              setSections((sections) => {
                if (sections) {
                  return {
                    ...sections,
                    [id]: {
                      ...sections[id],
                      [key]: value,
                    },
                  };
                }
              });
            }}
            onStateChange={(id, state) => {
              // eslint-disable-next-line no-console
              // console.log({ id, state });
              if (state.status === "done") {
                // eslint-disable-next-line no-console
                // console.log(JSON.stringify(state.data, null, 2));
                selectedInstanceSelectorStore.set(rootInstanceSelector);

                const position = calculateInsertionPositionRef.current(id);

                const dropTarget: DroppableTarget = {
                  parentSelector: rootInstanceSelector,
                  position: position === -1 ? "end" : position,
                };

                if (state.data[0].type === "instance") {
                  state.data[0].label = sections[id].name;
                }

                if (insertTemplate(state.data, dropTarget) === false) {
                  alert("Error");
                  setSections((sections) => {
                    if (sections) {
                      return {
                        ...sections,
                        [id]: {
                          ...sections[id],
                          state: {
                            status: "error",
                            message: "Something went wrong",
                          },
                        },
                      };
                    }
                  });
                  return;
                }

                selectedInstanceSelectorStore.set(rootInstanceSelector);
              }

              setSections((sections) => {
                if (sections) {
                  return {
                    ...sections,
                    [id]: {
                      ...sections[id],
                      state,
                    },
                  };
                }
              });
            }}
          />
        </Box>
      ) : (
        <Prompt
          onSections={(sections) => {
            if (sections) {
              setSections(responseDataToSections(sections));
            } else {
              setSections(undefined);
            }
          }}
        />
      )}
    </Box>
  );
};

const insertTemplate = (
  template: WsEmbedTemplate,
  dropTarget: DroppableTarget
) => {
  const breakpoints = breakpointsStore.get();
  const breakpointValues = Array.from(breakpoints.values());
  const baseBreakpoint = breakpointValues.find(isBaseBreakpoint);
  if (baseBreakpoint === undefined) {
    return false;
  }
  const metas = registeredComponentMetasStore.get();
  const templateData = generateDataFromEmbedTemplate(
    template,
    metas,
    baseBreakpoint.id
  );

  const rootInstanceIds = templateData.children
    .filter((child) => child.type === "id")
    .map((child) => child.value);

  insertTemplateData(templateData, dropTarget);
  return rootInstanceIds;
};

const calculateInsertionPosition = (
  sectionId: SectionId,
  sections: Sections
) => {
  const entries = Object.entries(sections);

  let sectionIndex = -1;
  const insertedIndices = [];

  for (let index = 0; index < entries.length; index++) {
    const [id, section] = entries[index];

    // The index of the current section in the sections list.
    if (id === sectionId) {
      sectionIndex = index;
      continue;
    }

    // Collect the indices of the inserted templates.
    if (section.state.status === "done") {
      insertedIndices.push(index);
    }
  }

  if (sectionIndex === -1) {
    return -1;
  }

  let insertionPosition = 1;

  // Find the position for the current sectionIndex.
  for (const index of insertedIndices) {
    if (sectionIndex > index) {
      insertionPosition++;
    } else {
      break;
    }
  }

  return insertionPosition > insertedIndices.length ? -1 : insertionPosition;
};

const responseDataToSections = (data: sections.Sections): Sections => {
  return Object.fromEntries(
    Object.entries(data).map(([name, description]) => [
      Math.random(),
      { name, description, state: { status: "idle" } },
    ])
  );
};

// const testSections = responseDataToSections({
//   Header: "A vintage-inspired header for the JazzJams festival page",
//   Navigation:
//     "A navigation menu with links to different sections of the JazzJams festival page",
//   "Hero Section":
//     "A hero section with a vintage background texture and shadow effect, displaying the JazzJams festival logo and a catchy tagline",
//   "About Section":
//     "A section providing information about the JazzJams festival, including its history, mission, and featured artists. The section should have a vintage background texture and shadow effect",
//   "Schedule Section":
//     "A section displaying the schedule of events for the JazzJams festival, including the date, time, and location of each performance. The section should have a vintage background texture and shadow effect",
//   "Ticket Section":
//     "A section where users can purchase tickets for the JazzJams festival. The section should have a vintage background texture and shadow effect",
//   "Featured Artists Section":
//     "A section showcasing the featured artists of the JazzJams festival. Each artist should have a photo, name, and a brief description. The section should have a vintage background texture and shadow effect",
//   "Venue Section":
//     "A section providing information about the venue of the JazzJams festival, including its address, map, and parking details. The section should have a vintage background texture and shadow effect",
//   "Sponsors Section":
//     "A section displaying the sponsors of the JazzJams festival, including their logos and a brief description. The section should have a vintage background texture and shadow effect",
//   "Contact Section":
//     "A section where users can contact the organizers of the JazzJams festival. The section should include a contact form with fields for name, email, and message. The section should have a vintage background texture and shadow effect",
//   Footer:
//     "A vintage-inspired footer for the JazzJams festival page, displaying copyright information and social media links",
// });
