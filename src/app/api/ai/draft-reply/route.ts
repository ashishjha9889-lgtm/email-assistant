import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';

const DraftReplySchema = z.object({
  draft: z.string(),
  subject: z.string().optional(),
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
});

const RequestSchema = z.object({
  thread: z.object({
    subject: z.string(),
    messages: z.array(z.object({
      from: z.object({
        email: z.string(),
        name: z.string(),
        isClient: z.boolean(),
        isAssistant: z.boolean(),
      }),
      body: z.string(),
      timestamp: z.string(),
    })),
  }),
  responder: z.enum(['client', 'assistant']),
  context: z.string().optional(),
});

const SYSTEM_PROMPT = `You are an AI email assistant that drafts professional email replies.

CONTEXT:
- You are drafting a reply on behalf of either the CLIENT (executive) or the ASSISTANT
- The client is a busy executive who prefers concise, professional emails
- The assistant handles scheduling, logistics, and routine matters
- Match the tone and style of the person you're writing as

GUIDELINES:
- Client replies: Professional, decisive, concise. Use "I" for decisions, "Please" for requests.
- Assistant replies: Organized, proactive, helpful. Use "I'll" for actions, "Please let me know" for coordination.
- Keep replies under 200 words unless complexity requires more.
- Always include a clear next step or call to action.

Return structured JSON with:
- draft: The complete email draft
- subject: Optional subject line (if different from original)
- confidence: 0-100 confidence in the draft quality
- reasoning: Brief explanation of approach`;

function isDemoMode(apiKey: string | null): boolean {
  return !apiKey || apiKey.trim() === '';
}

export async function POST(request: NextRequest) {
  let fallbackResponder: 'client' | 'assistant' = 'assistant';
  let fallbackSubject = '';
  try {
    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { thread, responder, context } = parsed.data;
    fallbackResponder = responder;
    fallbackSubject = thread.subject;

    // Get API key from header (client-provided) or env (server default)
    const headerApiKey = request.headers.get('x-ai-api-key');
    const envApiKey = process.env.AI_API_KEY;
    const apiKey: string | null = headerApiKey || envApiKey || null;
    const model = process.env.AI_MODEL || 'gpt-4o-mini';
    const demoMode = isDemoMode(apiKey);

    if (demoMode) {
      const result = demoDraft(thread, responder, context);
      return NextResponse.json({ draft: { ...result, demoMode: true }, demoMode: true });
    }

    const openai = new OpenAI({ apiKey: apiKey! });

    const conversationHistory = thread.messages
      .slice(-5)
      .map(m => `${m.from.isClient ? 'Client' : m.from.isAssistant ? 'Assistant' : m.from.name}: ${m.body.slice(0, 2000)}`)
      .join('\n---\n');

    const userPrompt = `Draft a reply as the ${responder}:

Thread subject: ${thread.subject}
Responder: ${responder}
${context ? `Additional context: ${context}` : ''}

Recent conversation:
${conversationHistory}

The latest message is from: ${thread.messages[thread.messages.length - 1].from.name} (${thread.messages[thread.messages.length - 1].from.isClient ? 'Client' : 'Assistant'})`;

    const openaiClient = new OpenAI({ apiKey: apiKey! });

    const completion = await openaiClient.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error('No response from AI');
    }

    const parsedResponse = DraftReplySchema.safeParse(JSON.parse(rawContent));
    if (!parsedResponse.success) {
      console.error('AI draft validation failed:', parsedResponse.error);
      const result = demoDraft(thread, responder, context);
      return NextResponse.json({ draft: { ...result, demoMode: true }, demoMode: true });
    }

    return NextResponse.json({ draft: parsedResponse.data, demoMode: false });
  } catch (error) {
    console.error('AI Draft Reply error:', error);
    const result = demoDraft({ subject: fallbackSubject, messages: [] }, fallbackResponder, '');
    return NextResponse.json({ draft: { ...result, demoMode: true }, demoMode: true });
  }
}

function demoDraft(thread: any, responder: 'client' | 'assistant', context?: string) {
  const templates = {
    client: {
      draft: `Thanks for the update. I've reviewed this and will proceed as discussed. Please let me know if you need anything else from my side.`,
      subject: thread.subject?.startsWith('Re:') ? thread.subject : `Re: ${thread.subject || 'Follow-up'}`,
      confidence: 60,
      reasoning: 'Demo mode: rule-based template, not real AI',
    },
    assistant: {
      draft: `Thanks for the email. I'll handle this for my client and get back to you with confirmation shortly. Let me know if you need anything else in the meantime.`,
      subject: thread.subject?.startsWith('Re:') ? thread.subject : `Re: ${thread.subject || 'Follow-up'}`,
      confidence: 60,
      reasoning: 'Demo mode: rule-based template, not real AI',
    },
  };

  return { ...templates[responder], demoMode: true };
}

export async function GET() {
  return NextResponse.json({ 
    message: 'AI Draft Reply API',
    usage: 'POST with { thread, responder, context? }',
    demoMode: !process.env.AI_API_KEY,
    model: process.env.AI_MODEL || 'gpt-4o-mini'
  });
}