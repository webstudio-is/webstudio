export { type Response, ResponseSchema } from "./chain";

export {
  AiOperationsSchema,
  type AiOperations,
  WsOperationsSchema,
  type WsOperations,
} from "./shared";

// Operations.

export {
  aiOperation as editStylesAiOperation,
  wsOperation as editStylesWsOperation,
} from "./edit-styles";

export {
  aiOperation as generateTemplatePromptAiOperation,
  wsOperation as generateTemplatePromptWsOperation,
} from "./generate-template-prompt";

export {
  aiOperation as generateInsertTemplateAiOperation,
  wsOperation as generateInsertTemplateWsOperation,
} from "./generate-insert-template";

export {
  aiOperation as deleteInstanceAiOperation,
  wsOperation as deleteInstanceWsOperation,
} from "./delete-instance";
