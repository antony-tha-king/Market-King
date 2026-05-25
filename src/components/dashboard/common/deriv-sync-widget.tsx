"use client";

import * as React from "react";
import { useDerivApi } from "@/hooks/use-deriv-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  XCircle, 
  HelpCircle,
  Eye,
  EyeOff,
  Coins
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function DerivSyncWidget() {
  const {
    token,
    appId,
    syncEnabled,
    isConnected,
    isAuthorized,
    balance,
    accountInfo,
    error,
    connect,
    toggleSync,
    removeToken
  } = useDerivApi();

  const [inputToken, setInputToken] = React.useState("");
  const [inputAppId, setInputAppId] = React.useState("1089");
  const [showToken, setShowToken] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const [redirectUrl, setRedirectUrl] = React.useState("http://localhost:9002");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const pathSegments = window.location.pathname.split('/');
      // If hosted on GitHub Pages, append repository directory
      if (window.location.hostname.includes("github.io") && pathSegments[1]) {
        setRedirectUrl(`${window.location.origin}/${pathSegments[1]}/`);
      } else {
        setRedirectUrl(`${window.location.origin}/`);
      }
    }
  }, []);

  // Sync state token to input when dialog opens
  React.useEffect(() => {
    if (dialogOpen) {
      setInputToken(token || "");
      setInputAppId(appId || "1089");
    }
  }, [dialogOpen, token, appId]);

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputToken) return;
    connect(inputToken, inputAppId || "1089");
    toggleSync(true);
  };

  const handleToggleSync = (checked: boolean) => {
    toggleSync(checked);
  };

  // Get status color coding
  const getStatusBadge = () => {
    if (syncEnabled && isAuthorized) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
          <Wifi className="w-3 h-3 animate-pulse" /> LIVE SYNCED
        </span>
      );
    }
    if (syncEnabled && isConnected) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-mono font-bold animate-pulse">
          <RefreshCw className="w-3 h-3 animate-spin" /> AUTHORIZING...
        </span>
      );
    }
    if (syncEnabled) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-mono font-bold animate-pulse">
          <RefreshCw className="w-3 h-3 animate-spin" /> CONNECTING...
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 text-[10px] font-mono font-bold">
        <WifiOff className="w-3 h-3" /> OFFLINE
      </span>
    );
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        {/* Floating Capsule Header Trigger */}
        <Button
          variant="outline"
          size="sm"
          className={uiButtonClass(syncEnabled, isAuthorized)}
        >
          <span className={uiPingClass(syncEnabled, isAuthorized)} />
          <RefreshCw className={uiSyncIconClass(syncEnabled, isConnected && !isAuthorized)} />
          <span className="hidden md:inline font-bold">
            {syncEnabled && isAuthorized && balance !== null
              ? `Deriv: $${balance.toFixed(2)}`
              : "Deriv Sync"}
          </span>
          <span className="md:hidden font-bold">
            {syncEnabled && isAuthorized && balance !== null
              ? `$${balance.toFixed(0)}`
              : "Sync"}
          </span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-[420px] bg-[#0c0d12]/95 backdrop-blur-2xl border-white/10 text-white rounded-[24px] overflow-hidden">
        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-teal-500/30 to-transparent" />
        
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-teal-400" />
              Deriv Live Balance
            </DialogTitle>
            {getStatusBadge()}
          </div>
          <DialogDescription className="text-zinc-500 text-xs text-left">
            Establish a direct client-side socket connection to your Deriv broker platform to automate balance tracking and journal compounding sheets.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Active Error Notice */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="font-semibold leading-normal">{error}</p>
            </div>
          )}

          {/* Connected Account Display Card */}
          <AnimatePresence mode="wait">
            {isAuthorized && accountInfo ? (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3"
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">Active Terminal</span>
                  <span className="font-mono text-emerald-400 font-black tracking-tight">{accountInfo.loginid}</span>
                </div>
                
                <div className="flex justify-between items-center text-xs border-t border-white/[0.04] pt-2.5">
                  <span className="text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">Email</span>
                  <span className="font-medium text-zinc-300 truncate max-w-[200px]">{accountInfo.email}</span>
                </div>

                <div className="flex justify-between items-center text-xs border-t border-white/[0.04] pt-2.5">
                  <span className="text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">Currency</span>
                  <span className="font-mono text-zinc-300 font-bold">{accountInfo.currency}</span>
                </div>

                <div className="flex justify-between items-center text-xs border-t border-white/[0.04] pt-2.5">
                  <span className="text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">Real Balance</span>
                  <span className="font-mono font-bold text-white flex items-center gap-1 text-sm">
                    <Coins className="w-4 h-4 text-amber-500" />
                    ${balance !== null ? balance.toLocaleString("en-US", { minimumFractionDigits: 2 }) : accountInfo.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 rounded-2xl bg-zinc-950/40 border border-zinc-900 flex flex-col items-center justify-center text-center py-6 text-xs text-zinc-500 space-y-2"
              >
                <RefreshCw className="w-8 h-8 text-zinc-800 animate-pulse" />
                <p className="font-medium max-w-[240px]">No active terminal connection. Provide your API Token and App ID below to sync.</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Secure API token input form */}
          {!isAuthorized ? (
            <form onSubmit={handleConnect} className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="token" className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-0.5">
                  Deriv API Token
                </Label>
                <div className="relative">
                  <Input
                    id="token"
                    type={showToken ? "text" : "password"}
                    value={inputToken}
                    onChange={(e) => setInputToken(e.target.value)}
                    placeholder="Pasted read-only API Token"
                    className="pr-10 h-10 bg-zinc-950 border-zinc-800 text-white rounded-xl text-xs placeholder:text-zinc-700 focus:border-teal-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="appId" className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-0.5">
                  Deriv App ID
                </Label>
                <Input
                  id="appId"
                  value={inputAppId}
                  onChange={(e) => setInputAppId(e.target.value)}
                  placeholder="App ID (default: 1089)"
                  className="h-10 bg-zinc-950 border-zinc-800 text-white rounded-xl text-xs placeholder:text-zinc-700 focus:border-teal-500/50"
                />
              </div>

              <Button
                type="submit"
                disabled={!inputToken || (syncEnabled && isConnected && !isAuthorized)}
                className="w-full h-10 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-bold tracking-wide rounded-xl shadow-lg shadow-teal-500/10 transition-all border border-teal-500/20"
              >
                {syncEnabled && isConnected ? "Verifying..." : "Authorize Sync"}
              </Button>
            </form>
          ) : (
            <div className="space-y-3">
              {/* Sync on/off toggle */}
              <div className="flex items-center justify-between p-3.5 bg-white/[0.02] border border-white/[0.04] rounded-2xl">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-white">Live Tracking</span>
                  <span className="text-[10px] text-zinc-500 font-medium">Keep account balance in sync in real-time</span>
                </div>
                <Switch
                  checked={syncEnabled}
                  onCheckedChange={handleToggleSync}
                  className="data-[state=checked]:bg-emerald-500"
                />
              </div>

              {/* Reset token button */}
              <Button
                onClick={removeToken}
                variant="outline"
                className="w-full h-10 border-rose-500/20 hover:border-rose-500/30 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all"
              >
                Disconnect API Sync
              </Button>
            </div>
          )}

          {/* Guide Scope */}
          <div className="border-t border-white/[0.05] pt-4 mt-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" /> Setup Guide & Redirect URLs
            </span>
            <ol className="list-decimal list-inside text-[11px] text-zinc-500 mt-2 space-y-1.5 pl-0.5 font-medium leading-relaxed font-body">
              <li>Log in at <a href="https://deriv.com" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">deriv.com</a> &rarr; settings &rarr; API Token &rarr; create a <span className="text-emerald-400 font-bold">"Read"</span> token.</li>
              <li>Since your app is running here, register your App ID at <a href="https://api.deriv.com" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">api.deriv.com</a> with:
                <ul className="list-disc list-inside pl-4 mt-1 text-zinc-500 space-y-0.5 font-mono text-[10px]">
                  <li>Redirect URL: <span className="text-zinc-400">{redirectUrl}</span></li>
                  <li>Verification URL: <span className="text-zinc-400">{redirectUrl}</span></li>
                </ul>
              </li>
              <li>Copy your generated <span className="text-white">App ID</span> and paste it above to establish the connection!</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Utility styling functions for trigger Button
function uiButtonClass(syncEnabled: boolean, isAuthorized: boolean) {
  return cn(
    "relative h-10 px-4 gap-2 rounded-2xl transition-all shadow-sm ring-1 ring-white/5",
    syncEnabled && isAuthorized
      ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:bg-emerald-500/10"
      : "bg-card/40 backdrop-blur-md border-border hover:bg-white/5"
  );
}

function uiPingClass(syncEnabled: boolean, isAuthorized: boolean) {
  return cn(
    "w-2 h-2 rounded-full absolute -top-0.5 -right-0.5 shrink-0",
    syncEnabled && isAuthorized ? "bg-emerald-400 animate-ping" : "hidden"
  );
}

function uiSyncIconClass(syncEnabled: boolean, animateSpin: boolean) {
  return cn(
    "w-3.5 h-3.5 shrink-0",
    animateSpin ? "animate-spin text-amber-400" : syncEnabled ? "text-emerald-400" : "text-muted-foreground/40"
  );
}
