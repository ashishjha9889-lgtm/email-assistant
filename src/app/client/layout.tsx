'use client';

import { ReactNode } from 'react';
import { ClientLayout } from '@/components/ClientLayout';

export default function ClientViewLayout({ children }: { children: ReactNode }) {
  return <ClientLayout>{children}</ClientLayout>;
}