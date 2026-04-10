"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { Calendar, Clock, TrendingUp, Zap, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function CalendarAnalyticsPage() {
  const hourlyPerformance = useQuery(api.adaptiveCalendar.getHourlyPerformance);
  const dailyPerformance = useQuery(api.adaptiveCalendar.getDailyPerformance);
  const eventImpact = useQuery(api.adaptiveCalendar.getEventImpactAnalysis);
  const optimalTimes = useQuery(api.adaptiveCalendar.getOptimalStudyTimes);
  const insights = useQuery(api.adaptiveCalendar.getPerformanceInsights);

  const isLoading =
    hourlyPerformance === undefined ||
    dailyPerformance === undefined ||
    eventImpact === undefined ||
    optimalTimes === undefined ||
    insights === undefined;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      </div>
    );
  }

  // Transform hourly data for charts
  const hourlyChartData = hourlyPerformance
    ? Object.entries(hourlyPerformance).map(([hour, data]: [string, any]) => ({
        hour: `${hour}:00`,
        hourNum: parseInt(hour),
        productivity: data.avgProductivity,
        focus: data.avgFocusQuality,
        sessions: data.totalSessions,
      }))
    : [];

  // Transform daily data for charts
  const dailyChartData = dailyPerformance
    ? Object.values(dailyPerformance).map((data: any) => ({
        day: data.dayName.substring(0, 3),
        productivity: data.avgProductivity,
        focus: data.avgFocusQuality,
        sessions: data.totalSessions,
      }))
    : [];

  // Transform event impact data
  const eventImpactData = eventImpact
    ? Object.entries(eventImpact).map(([event, data]: [string, any]) => ({
        event: event.length > 20 ? event.substring(0, 17) + "..." : event,
        productivity: data.avgProductivity,
        focus: data.avgFocusQuality,
        count: data.count,
      }))
    : [];

  // Create heatmap data (24 hours x 7 days)
  const heatmapData = [];
  for (let hour = 0; hour < 24; hour++) {
    const row: any = { hour: `${hour}:00` };
    for (let day = 0; day < 7; day++) {
      const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day];
      // Find productivity for this hour/day combination
      const productivity = hourlyPerformance?.[hour]?.avgProductivity || 0;
      row[dayName] = productivity;
    }
    heatmapData.push(row);
  }

  // Helper function to get heatmap color
  const getHeatmapColor = (value: number) => {
    if (value === 0) return "bg-gray-100 dark:bg-gray-800";
    if (value < 40) return "bg-red-200 dark:bg-red-900/30";
    if (value < 60) return "bg-orange-200 dark:bg-orange-900/30";
    if (value < 80) return "bg-yellow-200 dark:bg-yellow-900/30";
    return "bg-green-300 dark:bg-green-900/50";
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Calendar className="h-8 w-8" />
          Calendar Analytics
        </h1>
        <p className="text-muted-foreground">
          Analyze your study patterns and optimize your schedule based on performance data
        </p>
      </div>

      {/* Insights */}
      {insights && (insights.insights.length > 0 || insights.recommendations.length > 0) && (
        <div className="space-y-4">
          {insights.insights.length > 0 && (
            <Alert>
              <TrendingUp className="h-4 w-4" />
              <AlertTitle>Performance Insights</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 space-y-1">
                  {insights.insights.map((insight, i) => (
                    <li key={i} className="text-sm">• {insight}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          {insights.recommendations.length > 0 && (
            <Alert>
              <Zap className="h-4 w-4" />
              <AlertTitle>Optimization Recommendations</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 space-y-1">
                  {insights.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm">• {rec}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Optimal Study Times */}
      {optimalTimes && optimalTimes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Your Best Study Times
            </CardTitle>
            <CardDescription>
              Top performing time slots based on historical data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {optimalTimes.map((time, i) => (
                <div
                  key={i}
                  className="border rounded-lg p-4 space-y-2 hover:border-primary transition-colors"
                >
                  <div className="text-2xl font-bold text-primary">
                    {time.hour}:00
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Score:</span>
                      <span className="font-medium">{time.score}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Productivity:</span>
                      <span className="font-medium">{time.avgProductivity}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sessions:</span>
                      <span className="font-medium">{time.sessionCount}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Hourly Performance</CardTitle>
            <CardDescription>
              Productivity and focus quality by hour of day
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={hourlyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="productivity"
                  stroke="hsl(var(--primary))"
                  name="Productivity"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="focus"
                  stroke="hsl(var(--chart-2))"
                  name="Focus Quality"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Daily Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Performance</CardTitle>
            <CardDescription>
              Average productivity by day of week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="productivity" fill="hsl(var(--primary))" name="Productivity" />
                <Bar dataKey="focus" fill="hsl(var(--chart-2))" name="Focus Quality" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Event Impact Analysis */}
        {eventImpactData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Event Impact on Performance</CardTitle>
              <CardDescription>
                How different calendar events affect your study quality
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={eventImpactData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="event" type="category" width={100} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="productivity" fill="hsl(var(--primary))" name="Productivity" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Performance Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Heatmap</CardTitle>
            <CardDescription>
              Study intensity by time of day (darker = better performance)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="inline-grid grid-cols-8 gap-1 text-xs">
                {/* Header row */}
                <div></div>
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="text-center font-medium p-1">
                    {day}
                  </div>
                ))}
                {/* Data rows */}
                {heatmapData.slice(6, 24).map((row: any) => (
                  <>
                    <div key={row.hour} className="text-right pr-2 font-medium flex items-center">
                      {row.hour}
                    </div>
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <div
                        key={`${row.hour}-${day}`}
                        className={`h-8 rounded ${getHeatmapColor(row[day])} flex items-center justify-center`}
                        title={`${day} ${row.hour}: ${row[day]}% productivity`}
                      >
                        {row[day] > 0 && (
                          <span className="text-[10px] font-medium">{row[day]}</span>
                        )}
                      </div>
                    ))}
                  </>
                ))}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-gray-100 dark:bg-gray-800 rounded"></div>
                <span>No data</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-red-200 dark:bg-red-900/30 rounded"></div>
                <span>&lt;40%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-yellow-200 dark:bg-yellow-900/30 rounded"></div>
                <span>40-80%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-green-300 dark:bg-green-900/50 rounded"></div>
                <span>&gt;80%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* No Data Message */}
      {hourlyChartData.filter(d => d.sessions > 0).length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Data Available</AlertTitle>
          <AlertDescription>
            Complete more study sessions to see detailed analytics and personalized insights.
            The more you study, the better the recommendations become!
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
