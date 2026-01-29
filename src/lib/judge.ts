import { sha256 } from "@/lib/hash";

export interface JudgeResult {
  score: number;
  verdict: string;
}

export interface Judge {
  evaluate(
    rubric: string,
    expected: string,
    transcript: string
  ): Promise<JudgeResult>;
  model: string;
}

export function buildPrompt(
  rubric: string,
  expected: string,
  transcript: string
): string {
  return `You are an evaluation judge. Score the agent's performance on a scale of 1-10.

## Rubric
${rubric}

## Expected Output
${expected}

## Agent Transcript
${transcript}

## Instructions
Evaluate how well the agent's result matches the expected output according to the rubric.
You MUST respond with valid JSON only, no other text:
{"score": <integer 1-10>, "verdict": "<brief explanation>"}`;
}

export function computePromptHash(
  rubric: string,
  expected: string,
  transcript: string
): string {
  return sha256(buildPrompt(rubric, expected, transcript));
}

export class OpenRouterJudge implements Judge {
  model: string;
  private apiKey: string;

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
  }

  async evaluate(
    rubric: string,
    expected: string,
    transcript: string
  ): Promise<JudgeResult> {
    const prompt = buildPrompt(rubric, expected, transcript);

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenRouter API error: ${res.status}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in judge response");
    }

    const parsed = JSON.parse(content);

    if (
      typeof parsed.score !== "number" ||
      typeof parsed.verdict !== "string"
    ) {
      throw new Error("Invalid judge output format");
    }

    if (parsed.score < 1 || parsed.score > 10) {
      throw new Error(`Score out of range: ${parsed.score}. Must be 1-10.`);
    }

    return {
      score: Math.round(parsed.score),
      verdict: parsed.verdict,
    };
  }
}

export class MockJudge implements Judge {
  model = "mock-model";
  public calls: { rubric: string; expected: string; transcript: string }[] = [];
  public mockResult: JudgeResult | Error = { score: 8, verdict: "Good job" };

  async evaluate(
    rubric: string,
    expected: string,
    transcript: string
  ): Promise<JudgeResult> {
    this.calls.push({ rubric, expected, transcript });
    if (this.mockResult instanceof Error) {
      throw this.mockResult;
    }
    return this.mockResult;
  }
}
