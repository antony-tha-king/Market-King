"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import {
    cn,
} from '@/lib/utils';
import { getTimezones, getSessionStatus, TRADING_SESSIONS, getSparklineData, getLocalStorageItem, setLocalStorageItem } from '@/lib/utils';
import {
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import {
    Card,
    CardContent
} from '@/components/ui/card';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Globe2, ChevronDown, Clock, Search } from 'lucide-react';

const SESSION_METRICS: Record<string, { vol: string; change: string; pairs: string }> = {
    'Sydney': { vol: '0.8M', change: '+0.32%', pairs: '110' },
    'Tokyo': { vol: '1.2M', change: '+0.45%', pairs: '125' },
    'London': { vol: '2.5M', change: '+0.68%', pairs: '142' },
    'New York': { vol: '2.1M', change: '+0.54%', pairs: '138' },
};

function Sparkline({ color, data }: { color: string; data: any[] }) {
    const safeColorId = color.replace('#', '');
    return (
        <div className="h-full w-full opacity-60">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id={`glow-${safeColorId}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={1.5}
                        fill={`url(#glow-${safeColorId})`}
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

interface TradingSessionsProps {
    variant?: 'card' | 'nav';
}

export function TradingSessions({ variant = 'card' }: TradingSessionsProps) {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [selectedTimezone, setSelectedTimezone] = useState<string>(() => {
        return getLocalStorageItem('market_king_timezone',
            typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC'
        );
    });
    const [is24Hour, setIs24Hour] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        setLocalStorageItem('market_king_timezone', selectedTimezone);

        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'market_king_timezone' && e.newValue) {
                setSelectedTimezone(e.newValue);
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [selectedTimezone]);

    const currentStatus = useMemo(() => getSessionStatus(currentTime.getUTCHours()), [currentTime]);
    const activeSessions = currentStatus.filter(s => s.isActive);
    const timezones = useMemo(() => getTimezones(), []);

    const filteredTimezones = useMemo(() => {
        if (!searchQuery) return timezones;
        return timezones.filter(tz => tz.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [timezones, searchQuery]);

    const getPosition = (hour: number) => (hour / 24) * 100;
    const getWidth = (start: number, end: number) => {
        if (start <= end) return ((end - start) / 24) * 100;
        return ((24 - start + end) / 24) * 100;
    };

    const sparklines = useMemo(() => ({
        Sydney: getSparklineData(),
        Tokyo: getSparklineData(),
        London: getSparklineData(),
        'New York': getSparklineData(),
    }), []);

    // Calculate current local time parts for the selected timezone
    const localInfo = useMemo(() => {
        const options: Intl.DateTimeFormatOptions = {
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: false,
            timeZone: selectedTimezone
        };
        const formatter = new Intl.DateTimeFormat('en-US', options);
        const parts = formatter.formatToParts(currentTime);
        const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
        const m = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
        const s = parseInt(parts.find(p => p.type === 'second')?.value || '0');

        const displayOptions: Intl.DateTimeFormatOptions = {
            hour: 'numeric',
            minute: '2-digit',
            hour12: !is24Hour,
            timeZone: selectedTimezone
        };
        const timePart = currentTime.toLocaleTimeString('en-US', displayOptions);
        const dayPart = currentTime.toLocaleDateString('en-US', { weekday: 'long', timeZone: selectedTimezone });

        return { hour: h, minute: m, second: s, time: timePart, day: dayPart };
    }, [currentTime, selectedTimezone, is24Hour]);

    // Calculate precise fractional offset to shift GMT sessions to the selected local timezone
    const offset = useMemo(() => {
        try {
            const now = new Date();
            const getZoneHourDecimal = (tz: string) => {
                const parts = new Intl.DateTimeFormat('en-US', {
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: false,
                    timeZone: tz
                }).formatToParts(now);
                const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
                const m = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
                return h + m / 60;
            };

            const localTime = getZoneHourDecimal(selectedTimezone);
            const utcTime = getZoneHourDecimal('UTC');
            return localTime - utcTime;
        } catch (e) {
            return 0;
        }
    }, [selectedTimezone]);

    const resolvedSessions = useMemo(() => {
        return TRADING_SESSIONS.map(session => {
            const startLocal = (((session.start + offset) % 24) + 24) % 24;
            const endLocal = (((session.end + offset) % 24) + 24) % 24;
            return { ...session, startLocal, endLocal };
        });
    }, [offset]);


    const MainContent = (
        <div className={cn(
            "relative w-full bg-card rounded-3xl border border-border overflow-hidden shadow-2xl transition-all duration-300",
            variant === 'nav' ? "p-4 w-[95vw] max-w-[920px]" : "p-8"
        )}>
            {/* Background Circuit Effect */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(currentColor 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }} />

            <div className={cn(
                "relative z-10 flex flex-col",
                variant === 'nav' ? "gap-4" : "gap-10"
            )}>
                {/* Header with Controls */}
                <div className="flex justify-between items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Globe2 className={cn(variant === 'nav' ? "w-5 h-5" : "w-6 h-6", "text-blue-400")} />
                        </div>
                        <div className="flex flex-col">
                            <h2 className={cn(variant === 'nav' ? "text-xl" : "text-2xl", "font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent leading-tight")}>Live Sessions</h2>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-black text-muted-foreground/30 tracking-widest uppercase">Global Market Status</span>
                                <div className="flex gap-1">
                                    <div className="w-1 h-3 bg-cyan-400/40 rounded-full animate-pulse" />
                                    <div className="w-1 h-3 bg-cyan-400/60 rounded-full animate-pulse delay-75" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Searchable Timezone Selector */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[8px] font-black tracking-widest text-muted-foreground/30 uppercase text-right">Timezone Search</span>
                            <div className="flex items-center gap-2">
                                <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
                                    <SelectTrigger className="w-40 h-8 bg-muted/50 border-border text-foreground text-[10px] font-bold rounded-xl hover:bg-muted transition-colors">
                                        <SelectValue placeholder="Search Timezone" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-popover border-border text-popover-foreground w-64 p-0">
                                        <div className="p-2 border-b border-border sticky top-0 bg-popover z-20">
                                            <div className="relative">
                                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/30" />
                                                <Input
                                                    placeholder="Type region..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="h-7 pl-7 bg-muted/50 border-border text-[10px] focus:ring-cyan-500/50"
                                                    onKeyDown={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                        </div>
                                        <ScrollArea className="h-48">
                                            {filteredTimezones.length > 0 ? (
                                                filteredTimezones.map(tz => (
                                                    <SelectItem key={tz} value={tz} className="text-[10px] font-bold focus:bg-cyan-500/10 focus:text-cyan-400 cursor-pointer">
                                                        {tz.replace('_', ' ')}
                                                    </SelectItem>
                                                ))
                                            ) : (
                                                <div className="p-4 text-[10px] text-muted-foreground/40 text-center">No matching regions</div>
                                            )}
                                        </ScrollArea>
                                    </SelectContent>
                                </Select>
                                <Button
                                    size="sm"
                                    onClick={() => setSelectedTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)}
                                    className="h-8 px-3 text-[10px] font-black text-white bg-gradient-to-b from-orange-400 to-orange-500 hover:from-orange-300 hover:to-orange-400 border-b-[3px] border-orange-700 active:border-b-0 active:translate-y-[3px] rounded-xl shadow-lg shadow-orange-500/20 transition-all"
                                >
                                    RESET
                                </Button>
                            </div>
                        </div>

                        {/* Format Toggle */}
                        <div className="flex flex-col gap-1 items-center">
                            <span className="text-[8px] font-black tracking-widest text-muted-foreground/30 uppercase">Format</span>
                            <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-xl border border-border h-8 px-2">
                                <span className={cn("text-[8px] font-black tracking-tighter", !is24Hour ? "text-cyan-400" : "text-muted-foreground/40")}>12H</span>
                                <Switch checked={is24Hour} onCheckedChange={setIs24Hour} className="data-[state=checked]:bg-cyan-500 scale-75" />
                                <span className={cn("text-[8px] font-black tracking-tighter", is24Hour ? "text-cyan-400" : "text-muted-foreground/40")}>24H</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Timeline Axis */}
                <div className={cn("relative w-full flex items-center mt-2", variant === 'nav' ? "h-10" : "h-12")}>
                    <div className="absolute inset-0 bg-muted/50 border border-border rounded-full backdrop-blur-sm" />

                    {/* Ticks and Labels (High-Precision Grid) */}
                    <div className="absolute inset-x-0 h-full">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((hourLabel, i) => {
                            const left = getPosition(i);
                            const isMainHour = i === 0 || i === 12 || i === 24;
                            const isSixHour = i === 6 || i === 18;
                            const label = i === 0 ? "12" : hourLabel.toString();

                            return (
                                <div
                                    key={i}
                                    className="absolute top-0 flex flex-col items-center gap-1.5"
                                    style={{ left: `${left}%`, transform: 'translateX(-50%)' }}
                                >
                                    <div className={cn(
                                        "w-[1px] transition-all duration-500",
                                        isMainHour ? "bg-cyan-400/80 h-3.5" : isSixHour ? "bg-muted-foreground/50 h-2.5" : "bg-muted-foreground/30 h-1.5"
                                    )} />
                                    <div className="flex flex-col items-center leading-none">
                                        <span className={cn(
                                            "text-[8px] font-black tracking-tighter transition-colors",
                                            isMainHour ? "text-foreground" : "text-muted-foreground/60"
                                        )}>
                                            {label}
                                        </span>
                                        {isMainHour && (
                                            <span className="text-[6px] font-bold text-cyan-400/60 uppercase -mt-0.5">
                                                {i === 12 ? 'pm' : 'am'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Progress Glow */}
                    <div
                        className="absolute h-3 bg-gradient-to-r from-transparent via-cyan-400/20 to-cyan-400/40 blur-md rounded-full transition-all duration-1000 ease-linear"
                        style={{ left: '0%', right: `${100 - getPosition(localInfo.hour + localInfo.minute / 60)}%` }}
                    />
                    <div
                        className="absolute h-0.5 bg-gradient-to-r from-transparent via-cyan-400/40 to-cyan-400/60 rounded-full transition-all duration-1000 ease-linear"
                        style={{ left: '0%', right: `${100 - getPosition(localInfo.hour + localInfo.minute / 60)}%` }}
                    />
                </div>

                {/* Session Rows */}
                <div className={cn("relative flex flex-col", variant === 'nav' ? "gap-4 mt-2" : "gap-8 mt-8")}>
                    {/* Grid Background */}
                    <div className="absolute inset-0 flex justify-between px-0 pointer-events-none opacity-25">
                        {Array.from({ length: 25 }).map((_, i) => (
                            <div key={i} className="w-[1px] h-full bg-border" />
                        ))}
                    </div>

                    {/* Vertical Time Marker with Floating Day/Time Label */}
                    <div
                        className="absolute top-0 bottom-0 w-[1.5px] bg-foreground/40 z-30 transition-all duration-1000 ease-linear"
                        style={{ left: `${getPosition(localInfo.hour + localInfo.minute / 60)}%` }}
                    >
                        {/* Dynamic Floating Label */}
                        <div className={cn(
                            "absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 group",
                            variant === 'nav' ? "-top-16" : "-top-20"
                        )}>
                            <div className={cn(
                                "bg-popover border border-cyan-500/50 rounded-2xl backdrop-blur-xl shadow-[0_0_40px_rgba(34,211,238,0.2)] whitespace-nowrap flex flex-col items-center animate-in fade-in slide-in-from-bottom-2 duration-500",
                                variant === 'nav' ? "px-3 py-1.5" : "px-5 py-2.5"
                            )}>
                                <div className="flex items-center gap-2 mb-0.5">
                                    <Clock className={cn(variant === 'nav' ? "w-2.5 h-2.5" : "w-3.5 h-3.5", "text-cyan-400")} />
                                    <span className={cn(variant === 'nav' ? "text-[13px]" : "text-[15px]", "font-black text-foreground tracking-tight leading-none")}>{localInfo.time}</span>
                                </div>
                                <span className="text-[8px] font-black text-cyan-400 uppercase tracking-[0.3em]">{localInfo.day}</span>
                                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-popover border-r border-b border-cyan-500/50 rotate-45" />
                            </div>
                            <div className={cn("w-[2px] bg-gradient-to-t from-cyan-400 to-transparent", variant === 'nav' ? "h-4" : "h-6")} />
                        </div>

                        <div className="absolute inset-0 w-[8px] -left-[3.5px] bg-cyan-400/20 blur-[6px]" />
                        <div className="absolute inset-0 w-[1.5px] bg-cyan-400 shadow-[0_0_20px_#22d3ee]" />
                        <div className="absolute bottom-[-8px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-cyan-400 rounded-full shadow-[0_0_15px_#22d3ee]" />
                    </div>

                    {resolvedSessions.map((session) => {
                        const status = currentStatus.find(s => s.name === session.name);
                        const left = getPosition(session.startLocal);
                        const width = getWidth(session.startLocal, session.endLocal);

                        return (
                            <div key={session.name} className={cn("relative w-full group", variant === 'nav' ? "h-14" : "h-24")}>
                                {/* Header Label */}
                                <div className="absolute -top-5 left-0 flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: session.color }}>
                                        {session.name} SESSION {status?.isActive ? 'OPEN' : 'CLOSED'}
                                    </span>
                                </div>

                                {/* Session Bar Container */}
                                <div className="absolute inset-0 flex items-center">
                                    {session.startLocal <= session.endLocal ? (
                                        <div
                                            className="absolute h-full flex items-center transition-all duration-500"
                                            style={{ left: `${left}%`, width: `${width}%` }}
                                        >
                                            <Card className={cn(
                                                "relative w-full border-none rounded-xl overflow-hidden backdrop-blur-sm transition-all duration-300 ring-1 ring-inset",
                                                variant === 'nav' ? "h-[36px]" : "h-[64px]",
                                                status?.isActive ? "" : "opacity-50 grayscale-[0.4]"
                                            )} style={{
                                                backgroundColor: `${session.color}20`,
                                                boxShadow: status?.isActive ? `0 0 30px ${session.color}30` : 'none',
                                                borderLeft: status?.isActive ? `4px solid ${session.color}` : `1px solid ${session.color}40`,
                                                borderTop: `1px solid ${session.color}40`,
                                                borderBottom: `1px solid ${session.color}40`,
                                                borderRight: `1px solid ${session.color}40`,
                                            }}>
                                                <div className="absolute inset-0" style={{ backgroundColor: session.color }} />
                                                <CardContent className="h-full flex px-4 items-center justify-between relative z-10 mix-blend-overlay">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-white font-black text-xs opacity-80">{session.name}</span>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    ) : (
                                        <>
                                            <div
                                                className="absolute h-full flex items-center transition-all duration-500"
                                                style={{ left: `${left}%`, width: `${100 - left}%` }}
                                            >
                                                <Card className={cn(
                                                    "relative w-full border-none rounded-xl rounded-r-none overflow-hidden backdrop-blur-sm ring-1 ring-inset",
                                                    variant === 'nav' ? "h-[50px]" : "h-[64px]",
                                                    status?.isActive ? "" : "opacity-50 grayscale-[0.4]"
                                                )} style={{
                                                    backgroundColor: session.color,
                                                    boxShadow: status?.isActive ? `0 0 30px ${session.color}30` : 'none',
                                                    borderLeft: status?.isActive ? `4px solid ${session.color}` : `1px solid ${session.color}40`,
                                                    borderTop: `1px solid ${session.color}40`,
                                                    borderBottom: `1px solid ${session.color}40`,
                                                }}>
                                                    <div className="absolute inset-0" style={{ backgroundColor: session.color }} />
                                                </Card>
                                            </div>
                                            <div
                                                className="absolute h-full flex items-center transition-all duration-500"
                                                style={{ left: `0%`, width: `${getPosition(session.endLocal)}%` }}
                                            >
                                                <Card className={cn(
                                                    "relative w-full border-none rounded-xl rounded-l-none overflow-hidden backdrop-blur-sm ring-1 ring-inset",
                                                    variant === 'nav' ? "h-[50px]" : "h-[64px]",
                                                    status?.isActive ? "" : "opacity-50 grayscale-[0.4]"
                                                )} style={{
                                                    backgroundColor: session.color,
                                                    boxShadow: status?.isActive ? `0 0 30px ${session.color}30` : 'none',
                                                    borderRight: status?.isActive ? `4px solid ${session.color}` : `1px solid ${session.color}40`,
                                                    borderTop: `1px solid ${session.color}40`,
                                                    borderBottom: `1px solid ${session.color}40`,
                                                }}>
                                                    <div className="absolute inset-0" style={{ backgroundColor: session.color }} />
                                                </Card>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer Info */}
                <div className={cn("flex justify-between items-center px-4 border-t border-border", variant === 'nav' ? "mt-2 pt-2" : "mt-8 pt-6")}>
                    <div className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity cursor-default group">
                        <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_#22d3ee]" />
                        <span className="text-[10px] font-black text-muted-foreground tracking-widest uppercase group-hover:text-foreground transition-colors">LIVE DATA ENGINE</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground/20 text-[9px] font-bold">
                        <span className="opacity-50">POWERED BY</span>
                        <span className="text-muted-foreground/40 font-black tracking-tighter">MARKET KING PRO</span>
                    </div>
                </div>
            </div>
        </div>
    );

    if (variant === 'nav') {
        return (
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "h-10 px-4 flex items-center gap-3 rounded-2xl border transition-all duration-300 font-headline group active:scale-95",
                            activeSessions.length > 0
                                ? "border-cyan-500/30 bg-cyan-500/5 shadow-[0_0_15px_rgba(34,211,238,0.1)] hover:bg-cyan-500/10 hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                                : "border-border hover:bg-muted/50 hover:border-foreground/20"
                        )}
                    >
                        <Globe2 className={cn("h-4.5 w-4.5 transition-transform duration-500 group-hover:rotate-180", activeSessions.length > 0 ? "text-cyan-400" : "text-muted-foreground/40")} />
                        <div className="flex flex-col items-start leading-none gap-0.5">
                            <span className="text-xs font-black tracking-tight text-foreground/90">Sessions</span>
                            {activeSessions.length > 0 ? (
                                <div className="flex items-center gap-1.5">
                                    <div className="flex -space-x-1">
                                        {activeSessions.slice(0, 3).map(s => (
                                            <div key={s.name} className="w-1.5 h-1.5 rounded-full border border-background shadow-[0_0_3px_rgba(255,255,255,0.2)]" style={{ backgroundColor: s.color }} />
                                        ))}
                                    </div>
                                    <span className="text-[9px] font-black text-cyan-400/80 uppercase tracking-tighter">{activeSessions[0].name}</span>
                                </div>
                            ) : (
                                <span className="text-[9px] font-black text-muted-foreground/20 uppercase tracking-tighter">Closed</span>
                            )}
                        </div>
                        <ChevronDown className="h-4 w-4 opacity-30 group-data-[state=open]:rotate-180 transition-transform" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-fit p-0 border-none bg-transparent shadow-[0_0_100px_rgba(0,0,0,0.5)] mr-4 mt-3 max-h-[90vh] overflow-y-auto scrollbar-hide"
                    align="end"
                    sideOffset={12}
                >
                    {MainContent}
                </PopoverContent>
            </Popover>
        );
    }

    return (
        <div className="w-full">
            {MainContent}
        </div>
    );
}
