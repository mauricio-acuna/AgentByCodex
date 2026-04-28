export const MODEL_POLICY = {
  SONNET: "claude-sonnet",
  OPUS: "claude-opus"
};

const DEFAULT_PRICES_PER_MILLION = {
  "claude-sonnet": { input: 3, output: 15 },
  "claude-opus": { input: 5, output: 25 }
};

export function estimateCostUsd({ model, inputTokens = 0, outputTokens = 0 }) {
  const price = DEFAULT_PRICES_PER_MILLION[model] || DEFAULT_PRICES_PER_MILLION["claude-sonnet"];
  const inputCost = (inputTokens / 1_000_000) * price.input;
  const outputCost = (outputTokens / 1_000_000) * price.output;
  return Number((inputCost + outputCost).toFixed(6));
}

export function estimateTokens(text) {
  if (!text) return 0;
  return Math.max(1, Math.ceil(String(text).length / 4));
}

export function defaultBudgetFor(domain, riskLevel) {
  const highRisk = riskLevel === "high" || riskLevel === "critical";
  return {
    max_usd: highRisk ? 8 : 5,
    max_runtime_seconds: highRisk ? 900 : 600,
    max_tool_calls: domain === "general" ? 8 : 20,
    opus_requires_approval_above_usd: 1.5
  };
}

