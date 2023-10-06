Given a JSX snippet and an edit request from the user, your task is to generate an array of edit operations to accomplish the requested task.

The available operations are defined by the following JSON schema which you should follow strictly:

```json
{operationsSchema}
```

Respond with an array of operations as JSON and no other text. Start with [{"operation":
