import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { AIInsight } from '@/types';
import { z } from 'zod';

const analysisSchema = z.object({
  category: z.enum(['meeting', 'follow-up', 'decision-needed', 'informational', 'urgent', 'other']),
  urgency: z.enum(['low', 'medium', 'high']),
  suggestedResponder: z.enum(['client', 'assistant', 'either']),
  importanceScore: z.number().int().min(0).max(100),
  reasoning: z.string(),
  actionItems: z.array(z.string()),
  summary: z.string(),
  confidence: z.number().min(0).max(100),
});

const systemPrompt = `You are an AI assistant that analyzes emails for a personal assistant (PA) service. Your job is to determine who should respond to each email - the client (executive) or their assistant - and provide actionable insights.

Context:
- The client is a busy executive/CEO who receives many emails
- The assistant handles scheduling, routine tasks, follow-ups, and administrative work
- The client should handle: strategic decisions, personal relationships, high-stakes negotiations, approvals, urgent crises
- The assistant should handle: scheduling, routine follow-ups, meeting coordination, invoices, travel arrangements, informational emails

Analyze the email and return structured JSON with:
1. category: The type of email (meeting, follow-up, decision-needed, informational, urgent, other)
2. urgency: How quickly a response is needed (low, medium, high)
3. suggestedResponder: Who should respond - 'client' (executive), 'assistant', or 'either'
4. importanceScore: 0-100 score of importance
5. reasoning: Clear explanation of why this responder is suggested
6. actionItems: Specific actionable steps for the suggested responder
7. summary: One-sentence summary of the email
8. confidence: 0-100 confidence score in your analysis`;

const userPrompt = (subject: string, body: string, fromEmail: string, isFromClient: boolean) => `
Email to analyze:
- Subject: ${subject}
- From: ${fromEmail}
- Is from client directly: ${isFromClient ? 'Yes' : 'No'}
- Body: ${body}

Return the analysis as structured JSON.`;

function getOpenAI(apiKey: string) {
  return new OpenAI({ apiKey });
}

function isDemoMode(apiKey: string | null): boolean {
  return !apiKey || apiKey.trim() === '';
}

export async function POST(request: NextRequest) {
  let demoFallback = null as AIInsight | null;
  try {
    const body = await request.json();
    const { subject, fromEmail, isFromClient } = body;
    const emailBody = typeof body.body === 'string' ? body.body.slice(0, 8000) : body.body;

    if (!subject || !emailBody) {
      return NextResponse.json(
        { error: 'Subject and body are required' },
        { status: 400 }
      );
    }

    // Get API key from header (client-provided) or env (server default)
    const headerApiKey = request.headers.get('x-ai-api-key');
    const envApiKey = process.env.AI_API_KEY;
    const apiKey: string | null = headerApiKey || envApiKey || null;
    const model = process.env.AI_MODEL || 'gpt-4o-mini';
    const demoMode = isDemoMode(apiKey);
    demoFallback = demoAnalysis(subject, emailBody, fromEmail || '', isFromClient || false);

    if (demoMode) {
      // Demo mode: rule-based analysis
      const result = demoAnalysis(subject, emailBody, fromEmail, isFromClient || false);
      return NextResponse.json({ 
        insight: { ...result, demoMode: true },
        demoMode: true 
      });
    }

    const openai = new OpenAI({ apiKey: apiKey! });

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt(subject, emailBody, fromEmail, isFromClient || false) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error('No response from AI');
    }

    const raw = JSON.parse(rawContent);
    const parsed = analysisSchema.parse({ ...raw, confidence: raw.confidence ?? 85 });
    const result: AIInsight = {
      category: parsed.category,
      urgency: parsed.urgency,
      suggestedResponder: parsed.suggestedResponder,
      importanceScore: parsed.importanceScore,
      reasoning: parsed.reasoning,
      actionItems: parsed.actionItems,
      summary: parsed.summary,
      confidence: parsed.confidence ?? 85,
    };

    return NextResponse.json({ insight: result, demoMode: false });
  } catch (error) {
    console.error('AI Analysis error:', error);
    if (demoFallback) {
      return NextResponse.json({ insight: { ...demoFallback, demoMode: true }, demoMode: true, fallback: true });
    }
    return NextResponse.json(
      { error: 'AI analysis failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function demoAnalysis(subject: string, emailBody: string, fromEmail: string, isFromClient: boolean): AIInsight {
  const lowerSubject = subject.toLowerCase();
  const lowerBody = emailBody.toLowerCase();
  
  let category: AIInsight['category'] = 'other';
  if (lowerSubject.includes('meeting') || lowerBody.includes('meeting') || lowerBody.includes('call') || lowerBody.includes('schedule')) {
    category = 'meeting';
  } else if (lowerSubject.includes('follow') || lowerBody.includes('follow up') || lowerBody.includes('following up')) {
    category = 'follow-up';
  } else if (lowerSubject.includes('decision') || lowerBody.includes('decide') || lowerBody.includes('approve') || lowerBody.includes('approval')) {
    category = 'decision-needed';
  } else if (lowerSubject.includes('urgent') || lowerSubject.includes('asap') || lowerBody.includes('urgent') || lowerBody.includes('immediate')) {
    category = 'urgent';
  } else if (lowerSubject.includes('fyi') || lowerSubject.includes('update') || lowerBody.includes('for your information')) {
    category = 'informational';
  }

  let urgency: AIInsight['urgency'] = 'low';
  if (category === 'urgent' || lowerSubject.includes('urgent') || lowerBody.includes('asap') || lowerBody.includes('immediate') || lowerBody.includes('today') || lowerBody.includes('eod')) {
    urgency = 'high';
  } else if (category === 'meeting' || category === 'decision-needed' || lowerBody.includes('tomorrow') || lowerBody.includes('this week')) {
    urgency = 'medium';
  }

  let suggestedResponder: AIInsight['suggestedResponder'] = 'either';
  if (isFromClient) {
    suggestedResponder = 'assistant';
  } else if (category === 'decision-needed' || category === 'urgent' || lowerBody.includes('your thoughts') || lowerBody.includes('your opinion') || lowerBody.includes('you decide')) {
    suggestedResponder = 'client';
  } else if (category === 'meeting' || category === 'follow-up' || lowerBody.includes('schedule') || lowerBody.includes('coordinate')) {
    suggestedResponder = 'assistant';
  }

  let importanceScore = 50;
  if (urgency === 'high') importanceScore += 30;
  else if (urgency === 'medium') importanceScore += 15;
  if (category === 'decision-needed') importanceScore += 20;
  if (category === 'urgent') importanceScore += 25;
  if (category === 'meeting') importanceScore += 10;
  if (isFromClient) importanceScore += 10;
  importanceScore = Math.min(100, importanceScore);

  const reasoningParts = [];
  if (isFromClient) reasoningParts.push('Email is from the client directly');
  if (category === 'meeting') reasoningParts.push('Contains meeting scheduling request');
  if (category === 'decision-needed') reasoningParts.push('Requires executive decision-making');
  if (category === 'urgent') reasoningParts.push('Marked as urgent with time-sensitive language');
  if (category === 'follow-up') reasoningParts.push('Follow-up on previous conversation');
  if (urgency === 'high') reasoningParts.push('Time-sensitive language detected');
  
  const reasoning = reasoningParts.length > 0 
    ? reasoningParts.join('. ') + '. [Demo mode: rule-based, not real AI]'
    : 'Standard business communication requiring routine handling. [Demo mode: rule-based, not real AI]';

  const actionItems: string[] = [];
  if (category === 'meeting') {
    actionItems.push('Check calendar availability');
    actionItems.push('Propose 3 time slots');
    actionItems.push('Send calendar invite');
  }
  if (category === 'follow-up') {
    actionItems.push('Review previous conversation context');
    actionItems.push('Prepare response with updates');
  }
  if (category === 'decision-needed') {
    actionItems.push('Gather relevant information for decision');
    actionItems.push('Present options with pros/cons');
    actionItems.push('Document decision for records');
  }
  if (category === 'urgent') {
    actionItems.push('Prioritize immediate response');
    actionItems.push('Escalate if needed');
  }
  if (actionItems.length === 0) {
    actionItems.push('Review and respond appropriately');
    actionItems.push('File for reference');
  }

  const summaryMap = {
    meeting: 'Meeting request requiring scheduling [Demo]',
    'follow-up': 'Follow-up on previous conversation [Demo]',
    'decision-needed': 'Decision required from leadership [Demo]',
    urgent: 'Urgent matter requiring immediate attention [Demo]',
    informational: 'Informational update, no action needed [Demo]',
    other: 'General business communication [Demo]',
  };

  return {
    importanceScore,
    suggestedResponder,
    reasoning,
    actionItems,
    summary: summaryMap[category],
    urgency,
    category,
    confidence: 60,
  };
}

export async function GET() {
  return NextResponse.json({ 
    message: 'AI Analysis API',
    usage: 'POST with { subject, body, fromEmail, isFromClient }',
    demoMode: !process.env.AI_API_KEY,
    model: process.env.AI_MODEL || 'gpt-4o-mini'
  });
}