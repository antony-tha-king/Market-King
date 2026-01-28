"use client";

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { DarkModeToggle } from '@/components/dashboard/common/dark-mode-toggle';
import { TradingSessions } from '@/components/dashboard/common/trading-sessions';
import { WhatsAppButton } from '@/components/dashboard/common/whatsapp-button';
import { ClockWidget, TimerWidget, VolumeWidget, MarketFAQ } from '@/components/dashboard/common/dashboard-meta';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { LogOut, ChevronRight } from 'lucide-react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const getInstrumentName = () => {
    if (pathname.includes('/dashboard/gold')) return 'Gold';
    if (pathname.includes('/dashboard/volatility75')) return 'Volatility 75';
    return '';
  };

  const instrumentName = getInstrumentName();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
            <Link href="/" className="text-xl md:text-2xl font-bold text-primary font-headline shrink-0">
              Trade Hub
            </Link>

            {instrumentName && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                <span className="text-sm md:text-lg font-black tracking-tighter text-foreground/80 truncate">
                  {instrumentName}
                </span>
              </div>
            )}
          </div>

          <nav className="flex items-center space-x-2 md:space-x-3 overflow-x-auto scrollbar-hide py-1">
            <div className="hidden lg:flex items-center gap-3 mr-2">
              <MarketFAQ />
              <VolumeWidget />
              <ClockWidget />
              <TimerWidget />
            </div>

            <TradingSessions variant="nav" />
            <div className="h-6 w-[1px] bg-border hidden sm:block" />
            <DarkModeToggle />
            <Link href="/">
              <Button variant="outline" size="sm" className="hidden sm:flex rounded-xl font-bold">
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </Button>
              <Button variant="outline" size="icon" className="sm:hidden rounded-xl">
                <LogOut className="h-4 w-4" />
              </Button>
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-grow container mx-auto p-4 md:p-8">
        {children}
      </main>
      <WhatsAppButton />
      <footer className="py-6 md:px-8 md:py-0 border-t bg-background/80">
        <div className="container flex flex-col items-center justify-center gap-4 md:h-24 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground font-medium">
            Made with <span role="img" aria-label="love">💖</span> by Antony
          </p>
        </div>
      </footer>
    </div>
  );
}
