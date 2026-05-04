const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_TEST_MODEL = "gpt-5.4-nano";

interface OpenAIResponsesPayload {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
}

export async function testOpenAIConnection(): Promise<{
  model: string;
  message: string;
}> {
  const model = process.env.OPENAI_TEST_MODEL || DEFAULT_TEST_MODEL;
  const apiKey = getRequiredEnv("OPENAI_API_KEY");
  const response = await fetch(OPENAI_RESPONSES_URL, {
    body: JSON.stringify({
      input: "請用繁體中文回覆：OpenAI API 連線正常。",
      max_output_tokens: 80,
      model,
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API failed with ${response.status}: ${errorText}`);
  }

  const payload = (await response.json()) as OpenAIResponsesPayload;

  return {
    message: extractTextOutput(payload) || "OpenAI API 連線正常。",
    model,
  };
}

function extractTextOutput(payload: OpenAIResponsesPayload): string {
  if (payload.output_text) {
    return payload.output_text;
  }

  return (
    payload.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text ?? "")
      .filter(Boolean)
      .join("\n") ?? ""
  );
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
