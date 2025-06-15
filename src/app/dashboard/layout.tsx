import type { ReactNode } from 'react';
import { DarkModeToggle } from '@/components/dashboard/common/dark-mode-toggle';
import { WhatsAppButton } from '@/components/dashboard/common/whatsapp-button';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { LogOut } from 'lucide-react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-primary font-headline">
            Trade Hub
          </Link>
          <nav className="flex items-center space-x-4">
             <Link href="/" legacyBehavior passHref>
                <Button variant="outline">
                    <LogOut className="mr-2 h-4 w-4" /> Logout
                </Button>
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-grow container mx-auto p-4 md:p-8">
        {children}
      </main>
      <DarkModeToggle />
      <WhatsAppButton />
      <footer className="py-6 md:px-8 md:py-0 border-t bg-background/80">
        <div className="container flex flex-col items-center justify-center gap-4 md:h-24 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground">
            Made with <span role="img" aria-label="love">💖</span> by Antony
          </p>
        </div>
      </footer>
    </div>
  );
}
