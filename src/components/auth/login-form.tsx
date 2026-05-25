"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import dynamic from "next/dynamic";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, 
  Coins, 
  KeyRound, 
  User, 
  Loader2,
  Lock
} from "lucide-react";

// Lazy load ClockWidget to prevent hydration blocking
const ClockWidget = dynamic(() => import("@/components/dashboard/common/dashboard-meta").then(mod => mod.ClockWidget), {
  ssr: false,
  loading: () => <div className="h-6 w-[100px] bg-white/5 rounded-lg animate-pulse" />
});

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  username: z.string().min(1, { message: "Username is required." }),
  password: z.string().min(1, { message: "Password is required." }),
  instrument: z.enum(["volatility75", "gold"], {
    required_error: "Please select an instrument.",
  }),
});

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
      instrument: "volatility75",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (values.username === "admin" && values.password === "profits") {
      setIsLoading(true);
      setTimeout(() => {
        router.push(`/dashboard/${values.instrument}`);
      }, 1500);
    } else {
      toast({
        variant: "destructive",
        title: "Authentication Failed",
        description: "Invalid credentials provided.",
      });
    }
  }

  return (
    <div className="relative flex items-center justify-center min-h-screen w-full bg-[#07080d] text-white overflow-hidden font-body selection:bg-emerald-500/30">
      
      {/* Stylesheet for custom slow morphing aurora animation */}
      <style jsx global>{`
        @keyframes aurora-mesh {
          0% {
            border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
            transform: translate(0px, 0px) rotate(0deg) scale(1);
          }
          33% {
            border-radius: 30% 60% 70% 30% / 50% 60% 30% 60%;
            transform: translate(30px, -50px) rotate(120deg) scale(1.1);
          }
          66% {
            border-radius: 50% 40% 30% 60% / 60% 40% 60% 40%;
            transform: translate(-20px, 40px) rotate(240deg) scale(0.95);
          }
          100% {
            border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
            transform: translate(0px, 0px) rotate(360deg) scale(1);
          }
        }
        .aurora-blob-1 {
          animation: aurora-mesh 20s infinite ease-in-out;
        }
        .aurora-blob-2 {
          animation: aurora-mesh 24s infinite ease-in-out reverse;
        }
        .aurora-blob-3 {
          animation: aurora-mesh 28s infinite ease-in-out;
        }
      `}</style>

      {/* ANIMATED DEEP AURORA BACKGROUND */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-radial-gradient">
        {/* Soft Indigo Blob */}
        <div className="absolute top-[-10%] left-[-10%] w-[70vw] h-[70vw] bg-indigo-900/15 rounded-full blur-[140px]" />
        
        {/* Shifting Teal Aurora Blob */}
        <div className="aurora-blob-1 absolute top-[10%] right-[10%] w-[55vw] h-[55vw] bg-emerald-500/10 rounded-full blur-[130px] opacity-70" />
        
        {/* Shifting Amber Aurora Blob */}
        <div className="aurora-blob-2 absolute bottom-[-10%] left-[10%] w-[50vw] h-[50vw] bg-amber-500/8 rounded-full blur-[120px] opacity-60" />
        
        {/* Shifting Cyan/Teal Center Glow */}
        <div className="aurora-blob-3 absolute top-[30%] left-[25%] w-[45vw] h-[45vw] bg-teal-500/8 rounded-full blur-[140px] opacity-65" />
        
        {/* Elegant modern overlay texture */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.015)_1.5px,transparent_1.5px)] bg-[size:32px_32px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07080d] via-transparent to-[#07080d]/40" />
      </div>

      {/* MAIN CONTAINER */}
      <div className="relative z-10 w-full max-w-[420px] px-4 animate-in fade-in slide-in-from-bottom-5 duration-700">
        
        {/* CLEAN GLASSMORPHIC CARD */}
        <motion.div 
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100, damping: 18 }}
          className="bg-[#0b0c13]/55 backdrop-blur-3xl border border-white/[0.07] rounded-[28px] p-8 shadow-[0_24px_80px_-15px_rgba(0,0,0,0.6)] relative overflow-hidden"
        >
          {/* Edge Highlighting reflection border effect */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          
          {/* Card Header Section */}
          <div className="flex flex-col items-center text-center mb-8">
            
            {/* Minimal Logo Graphic */}
            <div className="bg-gradient-to-tr from-emerald-500 to-teal-600 p-2.5 rounded-2xl shadow-xl shadow-emerald-500/10 ring-1 ring-white/10 mb-4">
              <TrendingUp size={24} className="text-white" />
            </div>

            {/* Title & Brand */}
            <h1 className="text-xl font-bold tracking-tight text-white font-headline">
              Market King
            </h1>
            <p className="text-zinc-500 text-xs font-semibold tracking-wider uppercase font-mono mt-0.5">
              Secure Trading Hub
            </p>

            {/* DYNAMIC TIME WIDGET DIRECTLY ON THE FORM HEADER */}
            <div className="mt-4 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] backdrop-blur-md shadow-inner flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <div className="text-[10px] font-mono font-bold text-zinc-400 tracking-wider">
                <ClockWidget />
              </div>
            </div>

          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              
              {/* Username Field */}
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-0.5">
                      Username / ID
                    </FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
                        <Input
                          disabled={isLoading}
                          placeholder="Enter your identity ID"
                          {...field}
                          className="pl-10 h-11 bg-white/[0.03] border-white/[0.07] rounded-xl text-white placeholder:text-zinc-600 focus:bg-white/[0.05] focus:border-emerald-500/50 transition-all font-medium ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-emerald-500/50"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs text-rose-400/90 pl-0.5 font-semibold" />
                  </FormItem>
                )}
              />

              {/* Password Field */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <div className="flex items-center justify-between pl-0.5">
                      <FormLabel className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                        Password
                      </FormLabel>
                      <span className="text-[10px] font-semibold text-zinc-500 hover:text-emerald-400 transition-colors cursor-pointer">
                        Forgot Key?
                      </span>
                    </div>
                    <FormControl>
                      <div className="relative group">
                        <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
                        <Input
                          disabled={isLoading}
                          type="password"
                          placeholder="Enter your cryptokey"
                          {...field}
                          className="pl-10 h-11 bg-white/[0.03] border-white/[0.07] rounded-xl text-white placeholder:text-zinc-600 focus:bg-white/[0.05] focus:border-emerald-500/50 transition-all font-medium ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-emerald-500/50"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs text-rose-400/90 pl-0.5 font-semibold" />
                  </FormItem>
                )}
              />

              {/* Instrument Select */}
              <FormField
                control={form.control}
                name="instrument"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-0.5">
                      Trading Route
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                      <FormControl>
                        <SelectTrigger className="w-full h-11 bg-white/[0.03] border-white/[0.07] rounded-xl text-white focus:border-emerald-500/50 hover:bg-white/[0.05] transition-all ring-0 focus:ring-0 focus:ring-offset-0">
                          <SelectValue placeholder="Select instrument route" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#0b0c13] border-white/10 text-white rounded-xl">
                        <SelectItem value="volatility75" className="focus:bg-emerald-500/10 focus:text-emerald-400 cursor-pointer rounded-lg m-1 py-2 font-bold text-xs">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-emerald-400" />
                            <span>Volatility 75 Index</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="gold" className="focus:bg-amber-500/10 focus:text-amber-400 cursor-pointer rounded-lg m-1 py-2 font-bold text-xs">
                          <div className="flex items-center gap-2">
                            <Coins className="h-4 w-4 text-amber-400" />
                            <span>Gold Spot (XAUUSD)</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs text-rose-400/90 pl-0.5 font-semibold" />
                  </FormItem>
                )}
              />

              {/* Submit Button (NO ARROW INDICATOR, CLEAN CENTER TEXT) */}
              <Button 
                type="submit" 
                disabled={isLoading} 
                className="w-full h-11 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold tracking-wide rounded-xl shadow-lg shadow-emerald-500/10 active:scale-[0.98] transition-all mt-4 border border-white/10"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0 text-white" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <span>Sign In</span>
                )}
              </Button>
            </form>
          </Form>
        </motion.div>

        {/* Dynamic Transition Feedback Overlay */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#07080d]/95 backdrop-blur-md rounded-[28px] flex flex-col items-center justify-center border border-white/[0.08] p-8 shadow-2xl z-20"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 120, delay: 0.1 }}
                className="bg-emerald-500/10 p-4 rounded-full border border-emerald-500/30 mb-4 shadow-[0_0_30px_rgba(16,185,129,0.15)]"
              >
                <Lock className="w-8 h-8 text-emerald-400 animate-pulse" />
              </motion.div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Link Authorized
              </h3>
              <p className="text-zinc-500 text-[9px] font-mono mt-1 uppercase tracking-widest animate-pulse">
                Synchronizing secure routes...
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SaaS Footer branding */}
        <div className="flex flex-col items-center mt-6 text-[10px] font-mono text-zinc-600">
          <span className="uppercase tracking-widest">
            POWERED BY ANTONY
          </span>
        </div>

      </div>

    </div>
  );
}
