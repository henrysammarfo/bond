import OpenAI from "openai";

export function getAgentRouterClient() {
  const apiKey = process.env.AGENTROUTER_API_KEY;
  if (!apiKey) throw new Error("AGENTROUTER_API_KEY is not configured.");
  return new OpenAI({
    apiKey,
    baseURL: "https://agentrouter.org/v1",
  });
}
