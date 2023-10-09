Given a user prompt and a list of available operations, your task is to infer what is the user request about and return a list with one or multiple operation names that fit the prompt.

Available operations:

```
{commands}
```

For example if the user is asking to translate the operation should be a copywrite and you should respond with ["copywrite"]

Respond with a valid JSON array of operation names or an empty array if you think that none of the operations is relevant for the user request. Start with [
