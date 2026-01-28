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
      <header className="sticky top-0 z-[100] w-full border-b bg-background/95 backdrop-blur-xl shadow-md supports-[backdrop-filter]:bg-background/80" style={{ position: '-webkit-sticky' } as React.CSSProperties}>
        {/* Row 1: Brand & Current Market Navigation */}
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-2 md:gap-4 overflow-hidden shrink-0">
            <Link href="/" className="text-xl md:text-2xl font-bold text-primary font-headline shrink-0">
              Trade Hub
            </Link>

            {instrumentName && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                <span className="text-sm md:text-lg font-black tracking-tighter text-foreground/80 truncate max-w-[120px] sm:max-w-none">
                  {instrumentName}
                </span>
              </div>
            )}
          </div>

          <nav className="flex items-center space-x-2 md:space-x-3 py-1">
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

        {/* Row 2: Secondary Stats & Mobile Utilities - Optimized Scrollable Strip */}
        <div className="lg:hidden border-t bg-background/60 overflow-x-auto scrollbar-hide py-3">
          <div className="flex items-center justify-center gap-5 px-6 min-w-max">
            <MarketFAQ />
            <div className="h-4 w-[1px] bg-border/40" />
            <VolumeWidget />
            <div className="h-4 w-[1px] bg-border/40" />
            <ClockWidget />
            <div className="h-4 w-[1px] bg-border/40" />
            <TimerWidget />

            {/* Mobile-only utilities integrated into scroll */}
            <div className="h-4 w-[1px] bg-border/40 ml-1" />
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-red-500/10 hover:text-red-500">
                  <LogOut className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow w-full lg:container lg:mx-auto p-3 md:p-6 lg:p-8">
        {children}
      </main>
      
      {/* Floating Dark Mode Toggle for Mobile - Positioned above WhatsApp button */}
      <div className="fixed bottom-28 right-8 z-50 lg:hidden">
        <DarkModeToggle />
      </div>

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
