import { z } from "zod";
import * as editStyles from "./edit-styles";
import * as generateTemplatePrompt from "./generate-template-prompt";
import * as generateInsertTemplate from "./generate-insert-template";
import * as deleteInstance from "./delete-instance";

export {
  name as editStylesName,
  aiOperation as editStylesAiOperation,
  wsOperation as editStylesWsOperation,
} from "./edit-styles";

export {
  name as generateTemplatePromptName,
  aiOperation as generateTemplatePromptAiOperation,
  wsOperation as generateTemplatePromptWsOperation,
} from "./generate-template-prompt";

export {
  name as generateInsertTemplateName,
  aiOperation as generateInsertTemplateAiOperation,
  wsOperation as generateInsertTemplateWsOperation,
} from "./generate-insert-template";

export {
  name as deleteInstanceName,
  aiOperation as deleteInstanceAiOperation,
  wsOperation as deleteInstanceWsOperation,
} from "./delete-instance";

export const name = "operations";

export const ContextSchema = z.object({
  prompt: z.string().describe("Edit request from the user"),
  components: z.array(z.string()).describe("Available Webstudio components"),
  jsx: z.string().describe("Input JSX to edit"),
});
export type Context = z.infer<typeof ContextSchema>;

// AiOperations are supported LLM operations.
// A valid completion is then converted to WsOperations
// which is the final format that we send to the client.

export const AiOperationsSchema = z.array(
  z.discriminatedUnion("operation", [
    editStyles.aiOperation,
    generateTemplatePrompt.aiOperation,
    // Currently disable generateInsertTemplate operations
    // this is because with the current "operations" chain prompt the LLM produces poor quality results.
    // Instead we let the LLM enhance the user prompt producing generateTemplatePrompt operations.
    // Later on we can manually process these and call another better fitting chain to generate the user interface
    // and replace generateTemplatePrompt wsOperations with generateInsertTemplate wsOperations.
    //
    // generateInsertTemplate.aiOperation,
    deleteInstance.aiOperation,
  ])
);
export type AiOperations = z.infer<typeof AiOperationsSchema>;

export const WsOperationsSchema = z.array(
  z.discriminatedUnion("operation", [
    editStyles.wsOperation,
    generateTemplatePrompt.wsOperation,
    generateInsertTemplate.wsOperation,
    deleteInstance.wsOperation,
  ])
);
export type WsOperations = z.infer<typeof WsOperationsSchema>;

export const ResponseSchema = WsOperationsSchema;
export type Response = z.infer<typeof ResponseSchema>;
