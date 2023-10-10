export { name, type Response, ResponseSchema } from "./chain";

export {
  AiOperationsSchema,
  type AiOperations,
  WsOperationsSchema,
  type WsOperations,
} from "./shared";

// Operations.

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
