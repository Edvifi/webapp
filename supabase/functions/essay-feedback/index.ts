import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import Anthropic from "npm:@anthropic-ai/sdk"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const MODEL = "claude-opus-4-8"
const MAX_TOKENS = 16000
// ~6,500 words — well past any college essay; guards token cost from abuse
const MAX_ESSAY_CHARS = 40_000
const MIN_ESSAY_WORDS = 30

const SYSTEM_PROMPT = `You are an experienced college admissions essay coach at Edvifi, giving structured feedback to a high school student on a draft college application essay.

Principles:
- Be encouraging but honest. Students improve from specific, actionable notes — not vague praise or harsh criticism.
- Ground every point in the student's actual text. Quote or closely paraphrase their words as evidence.
- Never rewrite the essay for them or supply replacement sentences longer than a short phrase. Suggest *what* to change and *why*; the writing must stay theirs.
- Judge the essay as an admissions essay: does it reveal character, voice, and reflection? Does it answer the prompt? Is it specific rather than generic?
- If a word target is given, factor in whether the essay is meaningfully over or under it.
- If the essay appears to be off-topic for the prompt, plagiarized-sounding boilerplate, or clearly AI-generated generic text, say so kindly in the summary and focus improvements on making it authentic.`

const FEEDBACK_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description:
        "3-5 sentence overall assessment: what the essay is doing well, its single biggest opportunity, and an encouraging close.",
    },
    strengths: {
      type: "array",
      description: "2-4 concrete strengths, each grounded in the student's text.",
      items: {
        type: "object",
        properties: {
          point: { type: "string", description: "Short name for the strength, e.g. 'Vivid opening scene'." },
          evidence: { type: "string", description: "Quote or close paraphrase from the essay showing this strength." },
        },
        required: ["point", "evidence"],
        additionalProperties: false,
      },
    },
    improvements: {
      type: "array",
      description: "2-5 improvement areas, ordered by impact, each with a concrete suggestion.",
      items: {
        type: "object",
        properties: {
          area: {
            type: "string",
            enum: ["structure", "voice", "specificity", "clarity", "prompt-fit", "length"],
          },
          issue: { type: "string", description: "What's holding the essay back, tied to their text." },
          suggestion: {
            type: "string",
            description: "Actionable next move the student can make themselves — not rewritten prose.",
          },
        },
        required: ["area", "issue", "suggestion"],
        additionalProperties: false,
      },
    },
    next_steps: {
      type: "array",
      description: "2-3 short, ordered revision actions for the next working session.",
      items: { type: "string" },
    },
  },
  required: ["summary", "strengths", "improvements", "next_steps"],
  additionalProperties: false,
} as const

interface FeedbackRequest {
  essay?: string
  prompt?: string
  title?: string
  wordTarget?: number
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: CORS })
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405)
  }

  let body: FeedbackRequest
  try {
    body = await req.json()
  } catch {
    return json({ error: "Invalid JSON body" }, 400)
  }

  const essay = (body.essay ?? "").trim()
  if (!essay) return json({ error: "Missing essay text" }, 400)
  if (essay.length > MAX_ESSAY_CHARS) {
    return json({ error: `Essay too long (max ${MAX_ESSAY_CHARS.toLocaleString()} characters)` }, 400)
  }
  const words = essay.split(/\s+/).length
  if (words < MIN_ESSAY_WORDS) {
    return json({ error: `Write at least ${MIN_ESSAY_WORDS} words before requesting feedback` }, 400)
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY")
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY is not set")
    return json({ error: "Server misconfigured: missing ANTHROPIC_API_KEY" }, 500)
  }

  const client = new Anthropic({ apiKey })

  const context = [
    body.title ? `Essay title: ${body.title}` : null,
    body.prompt ? `The prompt the student is answering:\n${body.prompt}` : "No prompt was provided — judge the essay on its own terms.",
    body.wordTarget ? `Word target: ${body.wordTarget} (draft is currently ${words} words)` : null,
  ]
    .filter(Boolean)
    .join("\n\n")

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      thinking: { type: "adaptive" },
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ],
      output_config: { format: { type: "json_schema", schema: FEEDBACK_SCHEMA } },
      messages: [
        {
          role: "user",
          content: `${context}\n\nThe student's draft:\n\n${essay}`,
        },
      ],
    })

    if (response.stop_reason === "refusal") {
      return json({ error: "Feedback couldn't be generated for this text. Try revising and resubmitting." }, 422)
    }
    if (response.stop_reason === "max_tokens") {
      console.error("essay-feedback: hit max_tokens before completing JSON")
      return json({ error: "Feedback ran too long — try again." }, 502)
    }

    const textBlock = response.content.find(
      (b: { type: string }) => b.type === "text",
    ) as { type: "text"; text: string } | undefined
    if (!textBlock) {
      return json({ error: "Empty response from feedback model" }, 502)
    }

    // output_config.format guarantees the text block is valid JSON per schema
    const feedback = JSON.parse(textBlock.text)
    return json({ feedback }, 200)
  } catch (err) {
    console.error("essay-feedback: Anthropic call failed:", err)
    const message = err instanceof Error ? err.message : "Unknown error"
    return json({ error: message }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  })
}
