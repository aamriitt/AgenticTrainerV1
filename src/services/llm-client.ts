/**
 * Thin client for calling a real LLM from the browser — either a free,
 * fully local Ollama server (default, e.g. running Gemma) or the Anthropic
 * API with your own key. Nothing is proxied through any server of ours;
 * requests go straight from this browser to wherever you point it.
 */

export type LLMProvider = "ollama" | "anthropic";

const PROVIDER_KEY = "atlas-trainer-llm-provider";
const ENABLED_KEY = "atlas-trainer-llm-enabled";
const ANTHROPIC_API_KEY = "atlas-trainer-anthropic-key";
const OLLAMA_URL_KEY = "atlas-trainer-ollama-url";
const MODEL_KEY_PREFIX = "atlas-trainer-model-";

const DEFAULTS: Record<LLMProvider, string> = {
  ollama: "gemma2",
  anthropic: "claude-sonnet-4-5-20250929",
};

const DEFAULT_OLLAMA_URL = "http://localhost:11434";

function read(key: string, fallback = ""): string {
  if (typeof window === "undefined") return fallback;
  return window.localStorage.getItem(key) ?? fallback;
}

function write(key: string, value: string): void {
  if (!value) window.localStorage.removeItem(key);
  else window.localStorage.setItem(key, value);
}

export function getStoredProvider(): LLMProvider {
  const p = read(PROVIDER_KEY, "ollama");
  return p === "anthropic" ? "anthropic" : "ollama";
}

export function setStoredProvider(provider: LLMProvider): void {
  write(PROVIDER_KEY, provider);
}

export function getStoredModel(provider: LLMProvider = getStoredProvider()): string {
  return read(`${MODEL_KEY_PREFIX}${provider}`, DEFAULTS[provider]);
}

export function setStoredModel(provider: LLMProvider, model: string): void {
  write(`${MODEL_KEY_PREFIX}${provider}`, model.trim() || DEFAULTS[provider]);
}

export function getStoredApiKey(): string {
  return read(ANTHROPIC_API_KEY);
}

export function setStoredApiKey(key: string): void {
  write(ANTHROPIC_API_KEY, key.trim());
}

export function getStoredOllamaUrl(): string {
  return read(OLLAMA_URL_KEY, DEFAULT_OLLAMA_URL);
}

export function setStoredOllamaUrl(url: string): void {
  write(OLLAMA_URL_KEY, (url.trim() || DEFAULT_OLLAMA_URL).replace(/\/$/, ""));
}

export function isLLMEnabled(): boolean {
  return read(ENABLED_KEY) === "true";
}

export function setLLMEnabled(enabled: boolean): void {
  write(ENABLED_KEY, enabled ? "true" : "");
}

/** True once the person has explicitly connected a provider with everything it needs. */
export function hasLiveLLM(): boolean {
  if (!isLLMEnabled()) return false;
  const provider = getStoredProvider();
  if (provider === "ollama") return true; // no key required, just a reachable local server
  return getStoredApiKey().trim().length > 0;
}

export interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LLMResult {
  text: string;
}

async function callOllama(system: string, messages: LLMMessage[]): Promise<LLMResult> {
  const baseUrl = getStoredOllamaUrl();
  const model = getStoredModel("ollama");

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: system }, ...messages],
        stream: false,
      }),
    });
  } catch {
    throw new Error(
      `Couldn't reach Ollama at ${baseUrl}. Make sure "ollama serve" is running and the model is pulled (ollama pull ${model}).`
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Ollama error ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data?.message?.content?.trim();
  if (!text) throw new Error("Empty response from Ollama.");
  return { text };
}

async function callAnthropic(system: string, messages: LLMMessage[]): Promise<LLMResult> {
  const apiKey = getStoredApiKey();
  if (!apiKey) throw new Error("No Anthropic API key configured.");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: getStoredModel("anthropic"),
      max_tokens: 1024,
      system,
      messages,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Anthropic API error ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = (data.content ?? [])
    .filter((block: { type: string }) => block.type === "text")
    .map((block: { text: string }) => block.text)
    .join("\n")
    .trim();

  if (!text) throw new Error("Empty response from model.");
  return { text };
}

/** Routes to whichever provider is currently configured. */
export async function callLLM(system: string, messages: LLMMessage[]): Promise<LLMResult> {
  const provider = getStoredProvider();
  return provider === "ollama" ? callOllama(system, messages) : callAnthropic(system, messages);
}
