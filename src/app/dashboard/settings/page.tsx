'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Save, Eye, EyeOff, CheckCircle, AlertTriangle, Key, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [demoMode, setDemoMode] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Demo mode means: no key saved in this browser's localStorage
  const checkDemoMode = () => {
    const key = localStorage.getItem('user_ai_api_key');
    setDemoMode(!key);
  };

  useEffect(() => {
    const savedKey = localStorage.getItem('user_ai_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
    setDemoMode(!savedKey);
  }, []);

  const handleSave = () => {
    const trimmed = apiKey.trim();
    if (!trimmed) return;
    localStorage.setItem('user_ai_api_key', trimmed);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    checkDemoMode();
  };

  const handleRemove = () => {
    localStorage.removeItem('user_ai_api_key');
    setApiKey('');
    setShowKey(false);
    setSaved(false);
    setTestResult(null);
    setDemoMode(true);
  };

  const handleTest = async () => {
    if (!apiKey.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-ai-api-key': apiKey.trim(),
        },
        body: JSON.stringify({
          subject: 'Test email',
          body: 'This is a test email to verify the API key works.',
          fromEmail: 'test@example.com',
          isFromClient: false,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTestResult({ success: false, message: data.error || 'API key test failed' });
      } else if (data.demoMode === true || data.insight?.demoMode === true) {
        setTestResult({ success: false, message: 'No AI call was made; the key was not used.' });
      } else {
        setTestResult({ success: true, message: 'API key works! Model responded successfully.' });
      }
    } catch {
      setTestResult({ success: false, message: 'Network error or invalid API key' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your AI provider and preferences</p>
      </div>

      {/* Demo Mode Banner */}
      {demoMode && (
        <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
          <div>
            <p className="font-medium text-yellow-800 dark:text-yellow-200">Demo Mode Active</p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Using rule-based analysis (not real AI). Add your API key below to enable real AI analysis.
            </p>
          </div>
        </div>
      )}

      {/* AI Provider Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            AI Provider Settings
          </CardTitle>
          <CardDescription>
            Configure your OpenAI-compatible API key. The key is stored only in this browser. With each AI request it is
            sent to this app&apos;s server in the <code>x-ai-api-key</code> header, and the server forwards it to the AI
            provider. The server does not store or log it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="api-key" className="block text-sm font-medium mb-2">API Key</Label>
            <div className="relative">
              <Input
                id="api-key"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-... or your provider's API key"
                className="pr-12"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => setShowKey(!showKey)}
                aria-label={showKey ? 'Hide API key' : 'Show API key'}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Stored in this browser&apos;s localStorage. It is sent to this app&apos;s server in the{' '}
              <code>x-ai-api-key</code> header with each AI request and forwarded to the AI provider. It is not stored or
              logged by the server.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleSave} disabled={!apiKey.trim()} className="gap-2 w-full sm:w-auto">
              <Save className="h-4 w-4" />
              {saved ? 'Saved!' : 'Save Settings'}
            </Button>
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={testing || !apiKey.trim()}
              className="w-full sm:w-auto"
            >
              {testing ? 'Testing...' : 'Test API Key'}
            </Button>
            <Button
              variant="outline"
              onClick={handleRemove}
              disabled={demoMode && !apiKey.trim()}
              className="w-full sm:w-auto text-red-700 border-red-300 hover:bg-red-50 dark:text-red-300 dark:border-red-800 dark:hover:bg-red-900/20"
            >
              Remove key
            </Button>
          </div>

          {testResult && (
            <div className={cn(
              'p-3 rounded-lg text-sm',
              testResult.success
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
            )}>
              {testResult.message}
            </div>
          )}

          {saved && (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 text-sm">
              Settings saved successfully! Your API key is now active.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security & Privacy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Stored Only in This Browser</p>
              <p>
                Your API key is saved only in this browser&apos;s localStorage. With each AI request it is sent to this
                app&apos;s server, which forwards it to the AI provider.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Not Stored or Logged</p>
              <p>The server uses your key only to forward the request to the AI provider. It is not stored or logged.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Header-Based Auth</p>
              <p>Key is sent via <code>x-ai-api-key</code> header with each AI request.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">OpenAI Compatible</p>
              <p>Works with any OpenAI-compatible API (OpenAI, Together.ai, Groq, etc.).</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demo Mode Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Demo Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>When no API key is configured, the app runs in <strong>Demo Mode</strong>:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Email analysis uses rule-based heuristics (keywords, patterns)</li>
            <li>Draft replies use static templates</li>
            <li>All AI insights show a <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">Demo</Badge> badge</li>
            <li>No external API calls are made</li>
          </ul>
          <p className="text-xs">
            Demo mode is fully functional for UI testing but decisions should not be relied upon for real work.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
