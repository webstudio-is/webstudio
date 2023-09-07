import prompts, { type PromptObject } from "prompts";

export const prompt = (prompt: PromptObject) => {
  return prompts([
    {
      ...prompt,
      onState: (state) => {
        if (state.aborted) {
          process.nextTick(() => {
            process.exit(0);
          });
        }
      },
    },
  ]);
};
