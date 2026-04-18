import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";

const MODEL_ID =
  process.env.BEDROCK_MODEL_ID ?? "anthropic.claude-sonnet-4-6-20250514";

export const bedrock = createAmazonBedrock({
  region: process.env.AWS_REGION ?? "eu-central-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export const model: ReturnType<typeof bedrock> = bedrock(MODEL_ID);
