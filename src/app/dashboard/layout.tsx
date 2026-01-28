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
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Floating Utilities for Mobile - Anchored top right for stability */}
      <div className="lg:hidden fixed top-3 right-4 z-[60] flex items-center gap-2 px-2 py-1.5 rounded-2xl bg-background/80 backdrop-blur-md border shadow-lg shadow-black/20 ring-1 ring-white/5 transition-all active:scale-95">
        <DarkModeToggle />
        <div className="h-4 w-[1px] bg-border/50 mx-1" />
        <Link href="/">
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl border-none hover:bg-red-500/10 hover:text-red-500">
            <LogOut className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-2 md:gap-4 overflow-hidden shrink-0">
            <Link href="/" className="text-xl md:text-2xl font-bold text-primary font-headline shrink-0">
              Trade Hub
            </Link>

            {instrumentName && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                <span className="text-sm md:text-lg font-black tracking-tighter text-foreground/80 truncate max-w-[80px] sm:max-w-none">
                  {instrumentName}
                </span>
              </div>
            )}
          </div>

          <nav className="flex items-center space-x-2 md:space-x-3 py-1 lg:pr-0 pr-20">
            <div className="hidden lg:flex items-center gap-3 mr-2">
              <MarketFAQ />
              <VolumeWidget />
              <ClockWidget />
              <TimerWidget />
            </div>

            <TradingSessions variant="nav" />

            {/* Desktop-only utilities */}
            <div className="hidden lg:flex items-center gap-2">
              <div className="h-6 w-[1px] bg-border mx-2" />
              <DarkModeToggle />
              <Link href="/">
                <Button variant="outline" size="sm" className="rounded-xl font-bold">
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </Button>
              </Link>
            </div>
          </nav>
        </div>

        {/* Secondary Navigation bar for Mobile Devices - Optimized Scrollable Strip */}
        <div className="lg:hidden border-t bg-background/40 overflow-x-auto scrollbar-hide py-2.5">
          <div className="flex items-center justify-center gap-4 px-6 min-w-max">
            <MarketFAQ />
            <div className="h-4 w-[1px] bg-border/30" />
            <VolumeWidget />
            <div className="h-4 w-[1px] bg-border/30" />
            <ClockWidget />
            <div className="h-4 w-[1px] bg-border/30" />
            <TimerWidget />
          </div>
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
