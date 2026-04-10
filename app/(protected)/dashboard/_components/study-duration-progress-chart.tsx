"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { 
  CartesianGrid, 
  Line, 
  LineChart, 
  XAxis, 
  YAxis, 
  Area, 
  AreaChart,
  ResponsiveContainer 
} from "recharts";

const chartConfig = {
  duration: {
    label: "Study Duration",
    color: "oklch(var(--chart-1))",
  },
} satisfies ChartConfig;

export default function StudyDurationChart({
  recentSessions,
}: {
  recentSessions: {
    startTime: string;
    endTime: string | null;
    duration: number;
    type: string;
    completed: boolean;
  }[];
}) {
  const [periodOffset, setPeriodOffset] = React.useState(0); // 0 = current period, 1 = last period, etc.

  // Process all session data
  const allSessionData = React.useMemo(() => {
    if (!recentSessions.length) return [];
    
    return recentSessions
      .filter(session => session.completed) // Only completed sessions
      .map((session) => ({
        date: new Date(session.startTime).toISOString().split('T')[0], // Use YYYY-MM-DD format
        duration: Math.round(session.duration / 60), // Convert to minutes and round
        rawDate: new Date(session.startTime),
      }))
      .sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
  }, [recentSessions]);

  // Filter data for current period (10 sessions)
  const processedData = React.useMemo(() => {
    const sessionsPerPeriod = 10;
    const startIndex = Math.max(0, allSessionData.length - ((periodOffset + 1) * sessionsPerPeriod));
    const endIndex = allSessionData.length - (periodOffset * sessionsPerPeriod);
    
    return allSessionData.slice(startIndex, endIndex);
  }, [allSessionData, periodOffset]);

  // Calculate pagination availability
  const { hasPreviousPeriod, hasNextPeriod } = React.useMemo(() => {
    const sessionsPerPeriod = 10;
    return {
      hasPreviousPeriod: allSessionData.length > ((periodOffset + 1) * sessionsPerPeriod),
      hasNextPeriod: periodOffset > 0
    };
  }, [allSessionData.length, periodOffset]);

  // Get period display info
  const periodInfo = React.useMemo(() => {
    if (processedData.length === 0) return { label: "No Sessions", isRecent: true };
    
    const startDate = new Date(processedData[0].date);
    const endDate = new Date(processedData[processedData.length - 1].date);
    
    if (periodOffset === 0) {
      return { label: "Recent Sessions", isRecent: true };
    }
    
    return {
      label: `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
      isRecent: false
    };
  }, [processedData, periodOffset]);

  // Calculate trend and stats
  const { averageDuration, trend, totalHours } = React.useMemo(() => {
    if (processedData.length < 2) return { averageDuration: 0, trend: 0, totalHours: 0 };
    
    const avg = processedData.reduce((sum, item) => sum + item.duration, 0) / processedData.length;
    const recent = processedData.slice(-3);
    const earlier = processedData.slice(0, -3);
    
    const recentAvg = recent.reduce((sum, item) => sum + item.duration, 0) / recent.length;
    const earlierAvg = earlier.length > 0 ? earlier.reduce((sum, item) => sum + item.duration, 0) / earlier.length : recentAvg;
    
    const trendPercent = earlierAvg > 0 ? ((recentAvg - earlierAvg) / earlierAvg) * 100 : 0;
    const totalHrs = processedData.reduce((sum, item) => sum + item.duration, 0) / 60;
    
    return { 
      averageDuration: Math.round(avg), 
      trend: trendPercent, 
      totalHours: Math.round(totalHrs * 10) / 10 
    };
  }, [processedData]);

  const getTrendIcon = () => {
    if (trend > 5) return <TrendingUp className="h-4 w-4" />;
    if (trend < -5) return <TrendingDown className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  const getTrendColor = () => {
    if (trend > 5) return "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50";
    if (trend < -5) return "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/50";
    return "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/50";
  };

  if (!recentSessions.length || processedData.length === 0) {
    return (
      <Card className="h-[400px] overflow-hidden">
        <CardHeader className="text-center pb-4">
          <CardTitle className="flex items-center justify-center gap-2 text-lg font-semibold">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Study Duration Trend
          </CardTitle>
        </CardHeader>
        <CardContent className="flex h-full flex-col items-center justify-center gap-4 py-10">
          <div className="text-center space-y-2">
            <p className="text-balance text-muted-foreground">
              Complete your first study session to see your duration trends!
            </p>
            <p className="text-sm text-muted-foreground/70">
              Track your focus and productivity over time
            </p>
          </div>
          <Button asChild className="mt-4">
            <Link href="/dashboard/study">Start Studying</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Study Duration Trend
            </CardTitle>
            <Badge
              variant="outline"
              className={`${getTrendColor()} border-none font-medium px-2.5 py-1`}
            >
              {getTrendIcon()}
              <span className="ml-1">
                {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
              </span>
            </Badge>
          </div>
          
          {/* Pagination Controls */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setPeriodOffset(prev => prev + 1)}
              disabled={!hasPreviousPeriod}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="px-3 py-1 text-xs font-medium text-muted-foreground min-w-[120px] text-center">
              {periodInfo.label}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setPeriodOffset(prev => prev - 1)}
              disabled={!hasNextPeriod}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <CardDescription className="text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs">
              <span>Average: {averageDuration} min</span>
              <span>•</span>
              <span>Total: {totalHours}h</span>
              <span>•</span>
              <span>{processedData.length} sessions</span>
            </div>
            <span className="text-xs text-muted-foreground/70">
              {periodInfo.isRecent ? "Most recent data" : "Historical data"}
            </span>
          </div>
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0">
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <AreaChart
            data={processedData}
            margin={{ top: 20, right: 30, bottom: 20, left: 20 }}
          >
            <defs>
              <linearGradient id="durationGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(var(--chart-1))" stopOpacity={0.3} />
                <stop offset="50%" stopColor="oklch(var(--chart-1))" stopOpacity={0.1} />
                <stop offset="100%" stopColor="oklch(var(--chart-1))" stopOpacity={0} />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            <CartesianGrid 
              strokeDasharray="2 4" 
              stroke="oklch(var(--border))" 
              opacity={0.3}
              vertical={false} 
            />
            
            <XAxis
              dataKey="date"
              tickLine={false}
              tickMargin={12}
              axisLine={false}
              className="text-xs text-muted-foreground"
              tickFormatter={(value) =>
                new Date(value).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }
            />
            
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-xs text-muted-foreground"
              tickFormatter={(value) => `${value}m`}
              domain={['dataMin - 5', 'dataMax + 5']}
            />
            
            <ChartTooltip
              content={<ChartTooltipContent 
                indicator="line"
                labelClassName="font-medium"
                className="rounded-lg border bg-background/95 backdrop-blur-sm shadow-lg"
                labelFormatter={(value) => 
                  new Date(value).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short", 
                    day: "numeric"
                  })
                }
                formatter={(value) => [`${value} minutes`, "Duration"]}
              />}
            />
            
            {/* Area fill with gradient */}
            <Area
              type="monotone"
              dataKey="duration"
              stroke="oklch(var(--chart-1))"
              strokeWidth={3}
              fill="url(#durationGradient)"
              filter="url(#glow)"
            />
            
            {/* Line with enhanced styling */}
            <Line
              type="monotone"
              dataKey="duration"
              stroke="oklch(var(--chart-1))"
              strokeWidth={3}
              dot={{
                fill: "oklch(var(--chart-1))",
                strokeWidth: 2,
                stroke: "oklch(var(--background))",
                r: 4,
              }}
              activeDot={{
                r: 6,
                stroke: "oklch(var(--chart-1))",
                strokeWidth: 2,
                fill: "oklch(var(--background))",
              }}
            />
          </AreaChart>
        </ChartContainer>
        
        {/* Stats Footer */}
        <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border/50">
          <div className="text-center">
            <div className="text-lg font-semibold text-chart-1">{averageDuration}m</div>
            <div className="text-xs text-muted-foreground">Avg Duration</div>
          </div>
          <div className="w-px h-8 bg-border/50"></div>
          <div className="text-center">
            <div className="text-lg font-semibold text-chart-1">{totalHours}h</div>
            <div className="text-xs text-muted-foreground">Total Time</div>
          </div>
          <div className="w-px h-8 bg-border/50"></div>
          <div className="text-center">
            <div className="text-lg font-semibold text-chart-1">{processedData.length}</div>
            <div className="text-xs text-muted-foreground">Sessions</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
