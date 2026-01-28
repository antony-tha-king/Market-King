"use client";

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Play, Square, RotateCcw, Calendar, Zap } from 'lucide-react';
import { cn, getLocalStorageItem, setLocalStorageItem } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

function Digit({ value }: { value: string }) {
    return (
        <div className="relative h-[20px] w-[0.72em] flex justify-center overflow-hidden">
            <AnimatePresence mode="popLayout">
                <motion.span
                    key={value}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 35,
                    }}
                    className="absolute"
                >
                    {value}
                </motion.span>
            </AnimatePresence>
            {/* Hidden spacer to maintain width */}
            <span className="invisible">{value}</span>
        </div>
    );
}

export function ClockWidget() {
    const [time, setTime] = useState<Date | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        setTime(new Date());
        const interval = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    if (!mounted || !time) return <div className="h-10 w-[120px]" />; // Placeholder to prevent layout shift

    const dateStr = time.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });

    const timeStr = time.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });

    // Split time string into individual characters for animation
    const chars = timeStr.split('');

    return (
        <div className="flex items-center h-10 px-2 group">
            <div className="flex flex-col justify-center leading-none gap-1">
                <div className="flex items-center text-[15px] font-black tracking-normal text-cyan-400 tabular-nums drop-shadow-[0_2px_10px_rgba(34,211,238,0.2)]">
                    {chars.map((char: string, i: number) => (
                        /\d/.test(char) ? (
                            <Digit key={i} value={char} />
                        ) : (
                            <span
                                key={i}
                                className={cn(
                                    "flex items-center justify-center h-[20px]",
                                    char === ':' ? "w-[0.4em] translate-y-[-1px]" :
                                        char === ' ' ? "w-[0.3em]" :
                                            "px-[0.5px]"
                                )}
                            >
                                {char}
                            </span>
                        )
                    ))}
                </div>
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em] leading-none drop-shadow-sm">
                    {dateStr}
                </span>
            </div>
        </div>
    );
}

export function TimerWidget() {
    const STORAGE_KEY = 'market_king_trade_timer';

    // Core state
    const [timerActive, setTimerActive] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [mounted, setMounted] = useState(false);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const accumulatedTimeRef = useRef<number>(0);

    // Initial Load
    useEffect(() => {
        setMounted(true);
        const saved = getLocalStorageItem<{
            active: boolean;
            startTime: number | null;
            accumulated: number;
        }>(STORAGE_KEY, { active: false, startTime: null, accumulated: 0 });

        setTimerActive(saved.active);
        accumulatedTimeRef.current = saved.accumulated;
        startTimeRef.current = saved.startTime;

        if (saved.active && saved.startTime) {
            const currentElapsed = saved.accumulated + Math.floor((Date.now() - saved.startTime) / 1000);
            setElapsedTime(currentElapsed);
        } else {
            setElapsedTime(saved.accumulated);
        }
    }, []);

    // Save state helper
    const saveState = (active: boolean, start: number | null, acc: number) => {
        setLocalStorageItem(STORAGE_KEY, { active, startTime: start, accumulated: acc });
    };

    useEffect(() => {
        if (!mounted) return;

        if (timerActive) {
            // If we just started, or resumed from storage
            if (!startTimeRef.current) {
                startTimeRef.current = Date.now();
                saveState(true, startTimeRef.current, accumulatedTimeRef.current);
            }

            timerRef.current = setInterval(() => {
                const now = Date.now();
                const total = accumulatedTimeRef.current + Math.floor((now - (startTimeRef.current || now)) / 1000);
                setElapsedTime(total);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [timerActive, mounted]);

    const formatTimer = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleStart = () => {
        setTimerActive(true);
    };

    const handleStop = () => {
        setTimerActive(false);
        const now = Date.now();
        const sessionDuration = startTimeRef.current ? Math.floor((now - startTimeRef.current) / 1000) : 0;
        accumulatedTimeRef.current += sessionDuration;
        startTimeRef.current = null;
        saveState(false, null, accumulatedTimeRef.current);
    };

    const handleReset = () => {
        setTimerActive(false);
        setElapsedTime(0);
        startTimeRef.current = null;
        accumulatedTimeRef.current = 0;
        saveState(false, null, 0);
        if (timerRef.current) clearInterval(timerRef.current);
    };

    if (!mounted) return <div className="h-10 w-[180px]" />;

    return (
        <div className={cn(
            "flex items-center gap-4 bg-card/40 backdrop-blur-xl border h-10 pl-4 pr-1.5 rounded-2xl shadow-sm ring-1 ring-white/5 transition-all",
            timerActive ? "border-orange-500/30 bg-orange-500/5 shadow-[0_0_15px_rgba(249,115,22,0.1)]" : "border-border"
        )}>
            <div className="flex items-center gap-2.5">
                <Zap className={cn("w-3.5 h-3.5 transition-colors", timerActive ? "text-orange-400 animate-pulse" : "text-muted-foreground/30")} />
                <div className="flex flex-col justify-center leading-none gap-0.5">
                    <span className={cn(
                        "text-xs font-black tracking-tight tabular-nums transition-all",
                        timerActive ? "text-orange-400" : "text-white/90"
                    )}>
                        {formatTimer(elapsedTime)}
                    </span>
                    <span className="text-[7px] font-black text-amber-500/50 uppercase tracking-[0.2em] leading-none">Duration</span>
                </div>
            </div>

            <div className="flex items-center gap-1 ml-1">
                {!timerActive ? (
                    <Button
                        size="icon"
                        onClick={handleStart}
                        className="w-7 h-7 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
                    >
                        <Play className="w-3 h-3 fill-current" />
                    </Button>
                ) : (
                    <Button
                        size="icon"
                        onClick={handleStop}
                        className="w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                    >
                        <Square className="w-3 h-3 fill-current" />
                    </Button>
                )}

                <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleReset}
                    className="w-7 h-7 rounded-lg hover:bg-muted text-muted-foreground/40 hover:text-muted-foreground active:scale-95 transition-all"
                >
                    <RotateCcw className="w-3 h-3" />
                </Button>
            </div>
        </div>
    );
}

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Info, BarChart3 } from "lucide-react";
import { getMarketVolume, VolumeStatus } from "@/lib/utils";

export function VolumeWidget() {
    const [volume, setVolume] = useState<VolumeStatus>('LOW');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const updateVolume = () => {
            const utcHour = new Date().getUTCHours();
            setVolume(getMarketVolume(utcHour));
        };
        updateVolume();
        const interval = setInterval(updateVolume, 60000); // Check every minute
        return () => clearInterval(interval);
    }, []);

    if (!mounted) return null;

    const getColor = (v: VolumeStatus) => {
        switch (v) {
            case 'VERY HIGH': return 'text-purple-400 bg-purple-500/20 border-purple-500/30';
            case 'HIGH': return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
            case 'MEDIUM': return 'text-amber-400 bg-amber-500/20 border-amber-500/30';
            case 'LOW': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
        }
    };

    const getBars = (v: VolumeStatus) => {
        switch (v) {
            case 'VERY HIGH': return 4;
            case 'HIGH': return 3;
            case 'MEDIUM': return 2;
            case 'LOW': return 1;
        }
    };

    const colorClass = getColor(volume);
    const activeBars = getBars(volume);

    return (
        <div className={cn(
            "flex items-center gap-3 h-10 px-3 rounded-2xl border transition-all backdrop-blur-md",
            colorClass
        )}>
            <div className="flex items-end gap-[2px] h-3.5 pb-0.5">
                {[1, 2, 3, 4].map(i => (
                    <div
                        key={i}
                        className={cn(
                            "w-1 rounded-sm transition-all duration-500",
                            i <= activeBars ? "bg-current opacity-100" : "bg-current opacity-20",
                            i === 1 ? "h-1.5" : i === 2 ? "h-2" : i === 3 ? "h-3" : "h-3.5"
                        )}
                    />
                ))}
            </div>
            <div className="flex flex-col justify-center leading-none">
                <span className="text-[10px] font-bold opacity-60 uppercase tracking-wider">Volume</span>
                <span className="text-xs font-black tracking-tight">{volume}</span>
            </div>
        </div>
    );
}

export function MarketFAQ() {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground/50 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-xl transition-all">
                    <Info className="h-5 w-5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-[#0a0a0f]/95 backdrop-blur-xl border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-headline font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
                        Forex Market Standard Hours
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground text-sm uppercase tracking-widest font-bold">
                        Source: Standard Market Protocols / BabyPips
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 mt-4">
                    <div className="space-y-2 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-cyan-500/30 transition-colors">
                        <h3 className="font-bold text-cyan-400 flex items-center gap-2">
                            <Clock className="w-4 h-4" /> Market Availability
                        </h3>
                        <p className="text-sm text-gray-300 leading-relaxed">
                            The forex market technically never closes, but retail traders can only trade between <span className="text-white font-bold">Sunday at 5:00 pm ET</span> and <span className="text-white font-bold">Friday at 5:00 pm ET</span>.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2 p-4 rounded-2xl bg-white/5 border border-white/5">
                            <h3 className="font-bold text-emerald-400">Opening Time</h3>
                            <p className="text-sm text-gray-300">Sunday 5:00 pm ET</p>
                        </div>
                        <div className="space-y-2 p-4 rounded-2xl bg-white/5 border border-white/5">
                            <h3 className="font-bold text-red-400">Closing Time</h3>
                            <p className="text-sm text-gray-300">Friday 5:00 pm ET</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground px-1">Active Sessions (UTC)</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                <span className="text-amber-400 font-bold">Sydney</span>
                                <span className="font-mono text-xs">9:00 PM - 6:00 AM</span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                                <span className="text-orange-400 font-bold">Tokyo</span>
                                <span className="font-mono text-xs">12:00 AM - 9:00 AM</span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                <span className="text-blue-400 font-bold">London</span>
                                <span className="font-mono text-xs">7:00 AM - 4:00 PM</span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                                <span className="text-green-400 font-bold">New York</span>
                                <span className="font-mono text-xs">1:00 PM - 10:00 PM</span>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
