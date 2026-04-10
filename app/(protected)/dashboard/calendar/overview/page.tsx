"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import {
  Calendar,
  Sparkles,
  CheckCircle2,
  BarChart3,
  ArrowRight,
  BookOpen,
  CalendarCheck,
} from "lucide-react";

export default function CalendarOverviewPage() {
  const syncStats = useQuery(api.googleCalendar.getSyncStats);
  const recommendationStats = useQuery(api.scheduling.getRecommendationStats);
  const optimalTimes = useQuery(api.adaptiveCalendar.getOptimalStudyTimes);

  const isLoading =
    syncStats === undefined ||
    recommendationStats === undefined ||
    optimalTimes === undefined;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-10 w-96" />
          <Skeleton className="h-4 w-[500px]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  const hasEnoughData = (syncStats?.totalCompletedSessions || 0) >= 5;

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Calendar className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Smart Calendar</h1>
            <p className="text-muted-foreground text-lg">
              AI-powered scheduling and performance analytics
            </p>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-2 hover:border-primary/30 transition-all hover:shadow-lg">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Sessions Completed</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  {syncStats?.totalCompletedSessions || 0}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2 hover:border-green-500/30 transition-all hover:shadow-lg">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Synced to Calendar</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-green-600 to-green-400 bg-clip-text text-transparent">
                  {syncStats?.syncedCount || 0}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2 hover:border-blue-500/30 transition-all hover:shadow-lg">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">AI Recommendations</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                  {recommendationStats?.pending || 0}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Features Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Features</h2>
          <p className="text-sm text-muted-foreground">Explore your smart calendar tools</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Google Calendar Sync */}
          <Card className="group relative overflow-hidden border-2 hover:border-green-500/50 transition-all hover:shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/10 to-transparent rounded-full blur-2xl -mr-16 -mt-16 group-hover:from-green-500/20 transition-all" />
            <CardHeader className="relative">
              <div className="flex items-start justify-between">
                <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg">
                  <CalendarCheck className="h-6 w-6 text-white" />
                </div>
                <Badge variant="secondary" className="font-semibold">{syncStats?.syncPercentage}% synced</Badge>
              </div>
              <CardTitle className="text-xl font-bold mt-4">Google Calendar Sync</CardTitle>
              <CardDescription className="text-sm">
                Sync your study sessions to Google Calendar automatically
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{syncStats?.syncPercentage}%</span>
                </div>
                <Progress value={syncStats?.syncPercentage} className="h-2" />
              </div>

              {syncStats && syncStats.unsyncedCount > 0 && (
                <div className="p-3 bg-orange-50 dark:bg-orange-900/10 rounded-md">
                  <p className="text-sm text-orange-800 dark:text-orange-300">
                    {syncStats.unsyncedCount} session{syncStats.unsyncedCount !== 1 ? "s" : ""}{" "}
                    pending sync
                  </p>
                </div>
              )}

              <Link href="/dashboard/settings/google-calendar">
                <Button className="w-full font-semibold shadow-sm hover:shadow-md transition-all" variant="outline">
                  Manage Sync
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* AI Recommendations */}
          <Card className="group relative overflow-hidden border-2 hover:border-blue-500/50 transition-all hover:shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-2xl -mr-16 -mt-16 group-hover:from-blue-500/20 transition-all" />
            <CardHeader className="relative">
              <div className="flex items-start justify-between">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                {recommendationStats && recommendationStats.pending > 0 && (
                  <Badge className="bg-blue-600 font-semibold">{recommendationStats.pending} new</Badge>
                )}
              </div>
              <CardTitle className="text-xl font-bold mt-4">AI Schedule Recommendations</CardTitle>
              <CardDescription className="text-sm">
                Get personalized study time suggestions based on your performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recommendationStats && recommendationStats.total > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Acceptance Rate</span>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {recommendationStats.acceptanceRate}%
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <p className="font-semibold text-green-600">{recommendationStats.accepted}</p>
                      <p className="text-muted-foreground">Accepted</p>
                    </div>
                    <div>
                      <p className="font-semibold text-orange-600">{recommendationStats.pending}</p>
                      <p className="text-muted-foreground">Pending</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-600">{recommendationStats.rejected}</p>
                      <p className="text-muted-foreground">Rejected</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">
                    Complete more sessions to get AI recommendations
                  </p>
                </div>
              )}

              <Link href="/dashboard/calendar/recommendations">
                <Button className="w-full font-semibold shadow-sm hover:shadow-md transition-all" variant="outline">
                  View Recommendations
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Performance Analytics */}
          <Card className="group relative overflow-hidden border-2 hover:border-purple-500/50 transition-all hover:shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-2xl -mr-16 -mt-16 group-hover:from-purple-500/20 transition-all" />
            <CardHeader className="relative">
              <div className="flex items-start justify-between">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                {hasEnoughData && <Badge variant="secondary" className="font-semibold">Data available</Badge>}
              </div>
              <CardTitle className="text-xl font-bold mt-4">Performance Analytics</CardTitle>
              <CardDescription className="text-sm">
                Analyze your study patterns with charts and heatmaps
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasEnoughData && optimalTimes && optimalTimes.length > 0 ? (
                <div className="space-y-3">
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/10 rounded-md">
                    <p className="text-sm font-medium text-purple-900 dark:text-purple-300">
                      Your Best Times:
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {optimalTimes.slice(0, 3).map((time) => (
                        <Badge key={time.hour} variant="outline" className="text-xs">
                          {time.hour}:00 ({time.avgProductivity}%)
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {optimalTimes[0] && (
                      <p>
                        Peak performance at {optimalTimes[0].hour}:00 with{" "}
                        {optimalTimes[0].avgProductivity}% productivity
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">
                    Complete {5 - (syncStats?.totalCompletedSessions || 0)} more session
                    {5 - (syncStats?.totalCompletedSessions || 0) !== 1 ? "s" : ""} to unlock analytics
                  </p>
                </div>
              )}

              <Link href="/dashboard/calendar/analytics">
                <Button className="w-full font-semibold shadow-sm hover:shadow-md transition-all" variant="outline">
                  View Analytics
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Get Started Guide (only shown if not enough data) */}
      {!hasEnoughData && (
        <Card className="border-2 border-primary/50 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl -mr-32 -mt-32" />
          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <BookOpen className="h-5 w-5 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">Getting Started with Smart Calendar</CardTitle>
            </div>
            <CardDescription className="text-base">
              Complete these steps to unlock all calendar features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-primary/10 rounded-full mt-0.5">
                  {syncStats && syncStats.totalCompletedSessions > 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium">Complete your first study session</p>
                  <p className="text-sm text-muted-foreground">
                    Start tracking your study patterns
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-primary/10 rounded-full mt-0.5">
                  {syncStats && syncStats.syncedCount > 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium">Connect Google Calendar</p>
                  <p className="text-sm text-muted-foreground">
                    Sync sessions to your calendar automatically
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-primary/10 rounded-full mt-0.5">
                  {hasEnoughData ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium">
                    Complete 5+ sessions ({syncStats?.totalCompletedSessions || 0}/5)
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Unlock AI recommendations and analytics
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 relative">
              <Link href="/dashboard/study" className="flex-1">
                <Button className="w-full font-semibold shadow-md hover:shadow-lg transition-all">
                  Start Studying
                </Button>
              </Link>
              <Link href="/dashboard/settings/google-calendar" className="flex-1">
                <Button variant="outline" className="w-full font-semibold shadow-sm hover:shadow-md transition-all">
                  Connect Calendar
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
