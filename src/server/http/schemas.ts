const text = { type: "string", minLength: 1 };
const object = (properties: Record<string, unknown>) => ({
  type: "object", properties, required: Object.keys(properties), additionalProperties: false
});

export const connectionSchema = {
  oneOf: [
    object({ sourceType: { const: "github" }, repositoryUrl: text, folderPath: { type: "string" } }),
    object({ sourceType: { const: "local" }, localPath: text, folderPath: { type: "string" } }),
    object({ repositoryUrl: text, folderPath: { type: "string" } })
  ]
};
export const snapshotSchema = object({ snapshotId: text });
export const documentSchema = object({ snapshotId: text, documentKey: text });
export const answersSchema = object({
  snapshotId: text,
  selections: { type: "array", minItems: 1, items: object({ questionKey: text, optionLetter: { type: "string", pattern: "^[A-Z]$" } }) }
});
