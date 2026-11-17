'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ThreadDetail } from '@/components/ThreadDetail';
import { EmailThread } from '@/types';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export default function ThreadPage() {
  const params = useParams();
  const threadId = params.id as string;
  const [thread, setThread] = useState<EmailThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchThread() {
      try {
        const res = await fetch(`${API_URL}/api/threads/${threadId}`);
        if (res.ok) {
          const data = await res.json();
          setThread(data.thread);
        } else if (res.status === 404) {
          setError('Thread not found');
        } else {
          setError('Failed to load thread');
        }
      } catch (e) {
        setError('Failed to load thread');
      } finally {
        setLoading(false);
      }
    }
    fetchThread();
  }, [threadId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <Mail className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Thread not found</h2>
          <p className="text-muted-foreground mb-4">The email thread you're looking for doesn't exist.</p>
          <Link href="/dashboard/inbox">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Inbox
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ThreadDetail
      thread={thread}
      onBack={() => window.history.back()}
    />
  );
}