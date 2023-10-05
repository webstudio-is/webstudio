import { z } from "zod";

import * as editStyles from "./edit-styles";
import * as generateTemplatePrompt from "./generate-template-prompt";
import * as generateInsertTemplate from "./generate-insert-template";
import * as deleteInstance from "./delete-instance";

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

export const aiToWs = (aiOperations: AiOperations) => {
  return aiOperations
    .map((aiOperation) => {
      if (aiOperation.operation === "editStylesWithTailwindCSS") {
        return editStyles.aiOperationToWs(aiOperation);
      }
      if (aiOperation.operation === "generateTemplatePrompt") {
        return generateTemplatePrompt.aiOperationToWs(aiOperation);
      }
      // if (aiOperation.operation === "generateInstanceWithTailwindStyles") {
      //   return generateInsertTemplate.aiOperationToWs(aiOperation);
      // }
      if (aiOperation.operation === "deleteInstance") {
        return deleteInstance.aiOperationToWs(aiOperation);
      }
    })
    .filter(function <T>(value: T): value is NonNullable<T> {
      return value !== undefined;
    });
};

export const WsOperationsSchema = z.array(
  z.discriminatedUnion("operation", [
    editStyles.wsOperation,
    generateTemplatePrompt.wsOperation,
    generateInsertTemplate.wsOperation,
    deleteInstance.wsOperation,
  ])
);
export type WsOperations = z.infer<typeof WsOperationsSchema>;
