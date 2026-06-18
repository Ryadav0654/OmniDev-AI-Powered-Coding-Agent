import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export const getAgentModel = () => {
  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const modelId = process.env.OPENROUTER_DEFAULT_MODEL ?? "openrouter/free";
  return openrouter(modelId);
};
