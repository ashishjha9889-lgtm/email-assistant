'use client';

import { useState, useCallback } from 'react';
import { AIInsight } from '@/types';

export function useAIAnalysis() {
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (
    subject: string,
    body: string,
    fromEmail: string,
    isFromClient: boolean
  ): Promise<AIInsight | null> => {
    setAnalyzing(true);
    setError(null);
    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body, fromEmail, isFromClient }),
      });
      if (!response.ok) throw new Error('Analysis failed');
      const data = await response.json();
      return data.insight;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed';
      setError(message);
      return null;
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const analyzeBatch = useCallback(async (
    emails: Array<{ subject: string; body: string; fromEmail: string; isFromClient: boolean; id: string }>
  ): Promise<Map<string, AIInsight>> => {
    setAnalyzing(true);
    setError(null);
    const results = new Map<string, AIInsight>();
    
    // Process in batches to avoid rate limits
    for (const email of emails) {
      const insight = await analyze(email.subject, email.body, email.fromEmail, email.isFromClient);
      if (insight) {
        results.set(email.id, insight);
      }
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    setAnalyzing(false);
    return results;
  }, [analyze]);

  return {
    analyze,
    analyzeBatch,
    analyzing,
    error,
  };
}