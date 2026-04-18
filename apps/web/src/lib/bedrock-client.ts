import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";

const MODEL_ID =
  process.env.BEDROCK_MODEL_ID ?? "anthropic.claude-sonnet-4-6-20250514";

type BedrockProvider = ReturnType<typeof createAmazonBedrock>;
type BedrockModel = ReturnType<BedrockProvider>;

export function getModel(): BedrockModel {
  const provider = createAmazonBedrock({
    region: process.env.AWS_REGION ?? "eu-central-1",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  });
  return provider(MODEL_ID);
}
