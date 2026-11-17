'use client';

import { toast } from 'sonner';
import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Menu,
  X,
  Bell,
  Inbox,
  Flag,
  Users,
  LayoutDashboard,
  Mail,
  Bot,
  Sun,
  Moon,
  Cog,
  User,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { EmailAccount } from '@/types';

interface ClientInfo {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  accounts?: EmailAccount[];
}

interface LayoutProps {
  children: ReactNode;
  currentAccount?: EmailAccount;
  onAccountChange?: (account: EmailAccount) => void;
  viewMode?: 'assistant' | 'client';
  onViewModeChange?: (mode: 'assistant' | 'client') => void;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Inbox', href: '/dashboard/inbox', icon: Inbox },
  { name: 'Important', href: '/dashboard/important', icon: Flag },
  { name: 'Clients', href: '/dashboard/clients', icon: Users },
  { name: 'AI Insights', href: '/dashboard/insights', icon: Bot },
  { name: 'Settings', href: '/dashboard/settings', icon: Cog },
];

function SidebarContentInner({ 
  currentAccount, 
  onAccountChange,
  viewMode,
  onViewModeChange,
  onClose,
}: {
  currentAccount: EmailAccount;
  onAccountChange?: (account: EmailAccount) => void;
  viewMode: 'assistant' | 'client';
  onViewModeChange?: (mode: 'assistant' | 'client') => void;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    async function fetchClient() {
      try {
        const res = await fetch('/api/client/threads');
        if (res.ok) {
          const data = await res.json();
          setClient({
            id: 'client-demo',
            name: 'Demo User',
            email: 'demo@example.com',
            accounts: [{ id: 'demo-account-1', name: 'Demo User', email: 'demo@example.com', provider: 'gmail', connected: false }],
          });
        }
      } catch (e) {
        console.error('Failed to fetch client:', e);
      } finally {
        setLoading(false);
        setShowContent(true);
      }
    }
    fetchClient();
  }, []);

  if (loading || !showContent) {
    return (
      <div className="flex flex-col h-full p-4">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Mail className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl text-gray-900 dark:text-white">PA Assistant</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4">
      {/* Logo / Brand */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Mail className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="font-bold text-xl text-gray-900 dark:text-white">PA Assistant</span>
      </div>

      {/* Current Client Context */}
      {client && (
        <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Managing</p>
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={client.avatar} alt={client.name} />
              <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{client.name}</p>
              <p className="text-xs text-muted-foreground truncate">{client.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* View Mode Toggle (Mobile) */}
      <div className="lg:hidden border-t border-gray-200 dark:border-gray-800 pt-4 mt-4">
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <Button
            variant={viewMode === 'assistant' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1 gap-1"
            onClick={() => onViewModeChange?.('assistant')}
          >
            <Users className="h-4 w-4" />
            <span>Assistant</span>
          </Button>
          <Button
            variant={viewMode === 'client' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1 gap-1"
            onClick={() => onViewModeChange?.('client')}
          >
            <User className="h-4 w-4" />
            <span>Client</span>
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
        <p className="text-xs text-center text-muted-foreground">
          PA Assistant v0.1.0
        </p>
      </div>
    </div>
  );
}

export function Layout({ 
  children, 
  currentAccount, 
  onAccountChange,
  viewMode = 'assistant',
  onViewModeChange,
}: LayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  if (!currentAccount) {
    return (
      <TooltipProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p>Please connect an account from the Settings page</p>
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // Loading state handled by SidebarContentInner
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
        {/* Mobile sidebar sheet - SheetTrigger directly wraps the icon, not a Button */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger className="lg:hidden p-2" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SidebarContentInner 
              currentAccount={currentAccount} 
              onAccountChange={onAccountChange}
              viewMode={viewMode}
              onViewModeChange={onViewModeChange}
              onClose={() => setSidebarOpen(false)}
            />
          </SheetContent>
        </Sheet>

        <div className="flex">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:z-40 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
            <SidebarContentInner 
              currentAccount={currentAccount} 
              onAccountChange={onAccountChange}
              viewMode={viewMode}
              onViewModeChange={onViewModeChange}
            />
          </aside>

          {/* Main Content */}
          <main className="flex-1 lg:ml-64 min-w-0">
            {/* Top Bar */}
            <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-4 min-w-0">
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white truncate">
                  {pathname === '/dashboard' ? 'Dashboard' : 
                   pathname === '/dashboard/inbox' ? 'Inbox' :
                   pathname === '/dashboard/important' ? 'Important' :
                   pathname === '/dashboard/clients' ? 'Clients' :
                   pathname === '/dashboard/insights' ? 'AI Insights' : 'Dashboard'}
                </h1>
              </div>

              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="hidden sm:flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                  <Tooltip>
                    <TooltipTrigger render={<Button variant={viewMode === 'assistant' ? 'default' : 'ghost'} size="sm" className="gap-1" onClick={() => onViewModeChange?.('assistant')} />}>
                      <Users className="h-4 w-4" />
                      <span className="hidden sm:inline">Assistant</span>
                    </TooltipTrigger>
                    <TooltipContent>Assistant View</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger render={<Button variant={viewMode === 'client' ? 'default' : 'ghost'} size="sm" className="gap-1" onClick={() => onViewModeChange?.('client')} />}>
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline">Client</span>
                    </TooltipTrigger>
                    <TooltipContent>Client View</TooltipContent>
                  </Tooltip>
                </div>

                {/* Theme Toggle - TooltipTrigger wraps Button, but we use asChild pattern by putting button content directly */}
                <Tooltip>
                  <TooltipTrigger render={<Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme" />}>
                    {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  </TooltipTrigger>
                  <TooltipContent>Toggle theme</TooltipContent>
                </Tooltip>

                {/* Notifications */}
		<Tooltip>
  <TooltipTrigger render={<Button variant="ghost" size="icon" aria-label="Notifications" onClick={() => toast.info('No new notifications')} />}>
    <Bell className="h-5 w-5" />
  </TooltipTrigger>
  <TooltipContent>Notifications</TooltipContent>
</Tooltip>

                {/* Account Info */}
<div className="relative">
  <Button variant="ghost" className="h-9 w-9 rounded-full p-0" aria-label="Account" onClick={() => setUserMenuOpen((v) => !v)}>
    <Avatar className="h-9 w-9">
      <AvatarImage src={currentAccount.avatar} alt={currentAccount.name} />
      <AvatarFallback className="bg-primary/20 text-primary">{currentAccount.name.charAt(0)}</AvatarFallback>
    </Avatar>
  </Button>
  {userMenuOpen && (
    <div className="absolute right-0 top-11 z-50 w-56 rounded-lg border bg-white p-3 shadow-lg dark:bg-gray-900 dark:border-gray-800">
      <p className="font-medium text-sm">{currentAccount.name}</p>
      <p className="text-xs text-muted-foreground">{currentAccount.email}</p>
      <Link href="/dashboard/settings" onClick={() => setUserMenuOpen(false)} className="mt-2 block text-sm underline">Settings</Link>
    </div>
  )}
</div>
              </div>
            </header>

            {/* Page Content */}
            <div className="p-4 lg:p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
