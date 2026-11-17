'use client';

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Settings,
  LogOut,
  User,
  ChevronDown,
  Inbox,
  Flag,
  LayoutDashboard,
  Mail,
  Sun,
  Moon,
  ArrowLeft,
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

interface ClientLayoutProps {
  children: ReactNode;
  currentAccount?: EmailAccount;
  onAccountChange?: (account: EmailAccount) => void;
}

const clientNavigation = [
  { name: 'My Attention', href: '/client', icon: Flag },
];

export function ClientLayout({ 
  children, 
  currentAccount, 
  onAccountChange,
}: ClientLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);

  // Fetch client data - always run hooks
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

  // Show loading state while fetching
  if (loading || !showContent) {
    return (
      <TooltipProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-pulse h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // Render nothing if no currentAccount (but still run hooks)
  if (!currentAccount) {
    return (
      <TooltipProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p>Please connect an account from the Assistant view</p>
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
        {/* Mobile sidebar sheet - SheetTrigger directly wraps the icon, not a Button */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger className="lg:hidden p-2" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <ClientSidebarContent 
              currentAccount={currentAccount} 
              onAccountChange={onAccountChange}
              onClose={() => setSidebarOpen(false)}
              client={client}
            />
          </SheetContent>
        </Sheet>

        <div className="flex">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:z-40 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
            <ClientSidebarContent 
              currentAccount={currentAccount} 
              onAccountChange={onAccountChange}
              client={client}
            />
          </aside>

          {/* Main Content */}
          <main className="flex-1 lg:ml-64 min-w-0">
            {/* Top Bar */}
            <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-4 min-w-0">
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white truncate">
                  {pathname === '/client' ? 'My Attention' : 
                   pathname === '/client/all' ? 'All Emails' :
                   pathname === '/client/archived' ? 'Archived' : 'Client View'}
                </h1>
              </div>

              <div className="flex items-center gap-2">
                {/* Back to Assistant View */}
                <Tooltip>
                  <TooltipTrigger render={<Button variant="ghost" size="icon" onClick={() => window.location.href = '/dashboard'} aria-label="Switch to Assistant View" />}>
                    <ArrowLeft className="h-5 w-5" />
                  </TooltipTrigger>
                  <TooltipContent>Assistant View</TooltipContent>
                </Tooltip>

                {/* Theme Toggle */}
                <Tooltip>
                  <TooltipTrigger render={<Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme" />}>
                    {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  </TooltipTrigger>
                  <TooltipContent>Toggle theme</TooltipContent>
                </Tooltip>

                {/* Account Switcher */}
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" className="relative h-9 w-9 rounded-full p-0" />}>
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={currentAccount.avatar} alt={currentAccount.name} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {currentAccount.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="absolute bottom-1 right-1 h-3 w-3 text-gray-400" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={currentAccount.avatar} alt={currentAccount.name} />
                          <AvatarFallback>{currentAccount.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{currentAccount.name}</p>
                          <p className="text-xs text-muted-foreground">{currentAccount.email}</p>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {client?.accounts?.map((account) => (
                      <DropdownMenuItem
                        key={account.id}
                        className={cn(
                          'flex items-center gap-2',
                          currentAccount.id === account.id && 'bg-primary/10 text-primary'
                        )}
                        onClick={() => onAccountChange?.(account)}
                        disabled={!account.connected}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={account.avatar} alt={account.name} />
                            <AvatarFallback className="text-xs">{account.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium">{account.name}</p>
                            <p className="text-xs text-muted-foreground">{account.email}</p>
                          </div>
                          {currentAccount.id === account.id && (
                            <span className="text-primary">✓</span>
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>

            {/* Page Content */}
            <div className="p-4 lg:p-6 max-w-3xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

function ClientSidebarContent({ 
  currentAccount, 
  onAccountChange,
  onClose,
  client: clientProp,
}: {
  currentAccount: EmailAccount;
  onAccountChange?: (account: EmailAccount) => void;
  onClose?: () => void;
  client: ClientInfo | null;
}) {
  const pathname = usePathname();
  const client = clientProp;

  return (
    <div className="flex flex-col h-full p-4">
      {/* Logo / Brand */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
          <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <span className="font-bold text-xl text-gray-900 dark:text-white">PA Assistant</span>
      </div>

      {/* Client Context */}
      {client && (
        <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-1">Your Account</p>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={client.avatar} alt={client.name} />
              <AvatarFallback className="text-lg">{client.name.charAt(0)}</AvatarFallback>
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
        {clientNavigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/client' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
        <p className="text-xs text-center text-muted-foreground">
          Client View · PA Assistant v0.1.0
        </p>
      </div>
    </div>
  );
}