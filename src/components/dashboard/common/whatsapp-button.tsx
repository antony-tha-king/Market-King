
"use client";

import { MessageSquare } from "lucide-react"; // Changed from MessageCircle
import { Button } from "@/components/ui/button";

export function WhatsAppButton() {
  const redirectToWhatsApp = () => {
    window.open(
      "https://wa.me/254111918657?text=Hello Antony I saw your trading Application 😎",
      "_blank"
    );
  };

  return (
    <Button
      variant="default"
      size="icon"
      className="fixed bottom-8 right-8 z-50 rounded-full w-16 h-16 shadow-xl bg-green-500 hover:bg-green-600 text-white"
      onClick={redirectToWhatsApp}
      aria-label="Contact on WhatsApp"
    >
      <MessageSquare className="h-8 w-8" /> {/* Changed from MessageCircle */}
    </Button>
  );
}
