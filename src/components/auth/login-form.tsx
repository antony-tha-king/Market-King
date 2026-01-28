"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import dynamic from "next/dynamic";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, TrendingUp, Coins, KeyRound, User, ArrowRight } from "lucide-react";

// Lazy load ClockWidget to prevent hydration blocking and improve initial paint
const ClockWidget = dynamic(() => import("@/components/dashboard/common/dashboard-meta").then(mod => mod.ClockWidget), {
  ssr: false,
  loading: () => <div className="h-10 w-[120px] bg-white/5 rounded-xl animate-pulse" />
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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Navigate regardless of credentials for demo purposes, or keep check if user prefers
    if (values.username === "admin" && values.password === "profits") {
      setIsLoading(true);
      setTimeout(() => {
        router.push(`/dashboard/${values.instrument}`);
      }, 1500);
    } else {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Invalid credentials provided.",
      });
    }
  }

  return (
    <div className="relative flex items-center justify-center min-h-screen w-full bg-[#0a0a0f] overflow-hidden selection:bg-cyan-500/30">
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-3xl"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-cyan-500/10 p-8 rounded-full ring-1 ring-cyan-500/50 shadow-[0_0_100px_rgba(34,211,238,0.2)]"
            >
              <Crown className="w-16 h-16 text-cyan-400 animate-pulse" />
            </motion.div>
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-8 text-2xl font-black text-white tracking-widest uppercase font-mono"
            >
              Access Granted
            </motion.h2>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 200 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="h-1 bg-gradient-to-r from-cyan-500 to-blue-600 mt-4 rounded-full"
            />
          </motion.div>
        )}
      </AnimatePresence>
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-[#0a0a0f] to-[#0a0a0f]" />
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

      {/* Top Left Clock Widget */}
      <div className="absolute top-6 left-6 z-50 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="bg-card/40 backdrop-blur-md border border-white/5 rounded-2xl p-1 shadow-2xl">
          <ClockWidget />
        </div>
      </div>

      <Card className="w-full max-w-[420px] bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_0_50px_-12px_rgba(34,211,238,0.2)]">
        <CardHeader className="text-center pb-2 pt-8">
          <div className="mx-auto bg-cyan-500 text-white rounded-full p-3 w-fit mb-6 shadow-lg shadow-cyan-500/20">
             <TrendingUp size={32} />
          </div>
          <h1 className="text-3xl font-headline font-bold text-white mb-2">
            Trade Hub Accelerator
          </h1>
          <p className="text-muted-foreground">
            Access your personalized trading dashboard.
          </p>
        </CardHeader>
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-bold text-muted-foreground/50 uppercase tracking-widest pl-1">ID</FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-hover:text-cyan-400 transition-colors" />
                        <Input
                          disabled={isLoading}
                          placeholder="Enter Identity"
                          {...field}
                          className="pl-10 h-11 bg-white/5 border-white/5 rounded-xl text-white placeholder:text-muted-foreground/20 focus:bg-white/10 focus:border-cyan-500/50 transition-all font-medium"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-bold text-muted-foreground/50 uppercase tracking-widest pl-1">Key</FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-hover:text-cyan-400 transition-colors" />
                        <Input
                          disabled={isLoading}
                          type="password"
                          placeholder="Enter Access Key"
                          {...field}
                          className="pl-10 h-11 bg-white/5 border-white/5 rounded-xl text-white placeholder:text-muted-foreground/20 focus:bg-white/10 focus:border-cyan-500/50 transition-all font-medium"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="instrument"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-bold text-muted-foreground/50 uppercase tracking-widest pl-1">Protocol</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                      <FormControl>
                        <SelectTrigger className="w-full h-11 bg-white/5 border-white/5 rounded-xl text-white focus:ring-1 focus:ring-cyan-500/50 hover:bg-white/10 transition-all">
                          <SelectValue placeholder="Select Protocol" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#0a0a0f] border-white/10 text-white">
                        <SelectItem value="volatility75" className="focus:bg-cyan-500/20 focus:text-cyan-400 cursor-pointer">
                          <div className="flex items-center text-sm font-bold">
                            <TrendingUp className="mr-2 h-4 w-4 text-cyan-400" />
                            Volatility 75
                          </div>
                        </SelectItem>
                        <SelectItem value="gold" className="focus:bg-amber-500/20 focus:text-amber-400 cursor-pointer">
                          <div className="flex items-center text-sm font-bold">
                            <Coins className="mr-2 h-4 w-4 text-amber-400" />
                            Gold (XAUUSD)
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isLoading} className="w-full h-12 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold tracking-wide rounded-xl shadow-lg shadow-cyan-500/25 active:scale-[0.98] transition-all mt-2 group">
                {isLoading ? (
                  <span className="animate-pulse">Initializing Protocol...</span>
                ) : (
                  <>
                    Initialize Session
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Footer / Copyright */}
      <div className="absolute bottom-6 text-[10px] text-white/20 font-mono">
        Powered by Antony
      </div>
    </div>
  );
}
