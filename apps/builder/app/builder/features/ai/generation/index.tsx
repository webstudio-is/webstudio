import { Box } from "@webstudio-is/design-system";
import { Prompt } from "./prompt";
import { useState } from "react";
import type { Sections } from "./types";
import type { sections } from "@webstudio-is/ai";
import { SectionsEditor } from "./sections-editor";

export const AiGeneration = () => {
  const [sections, setSections] = useState<Sections | undefined>();

  return (
    <Box>
      {sections ? (
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
            console.log({ id, state });
            if (state.status === "done") {
              // eslint-disable-next-line no-console
              console.log(JSON.stringify(state.data, null, 2));
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
