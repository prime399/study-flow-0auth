"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { format, formatDistance } from "date-fns";
import { Id } from "@/convex/_generated/dataModel";

export default function RecommendationsPage() {
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const recommendations = useQuery(api.scheduling.getPendingRecommendations);
  const stats = useQuery(api.scheduling.getRecommendationStats);
  const acceptRecommendation = useMutation(api.scheduling.acceptRecommendation);
  const rejectRecommendation = useMutation(api.scheduling.rejectRecommendation);

  const isLoading = recommendations === undefined || stats === undefined;

  const handleGenerateRecommendations = async () => {
    try {
      setGenerating(true);
      const response = await fetch("/api/adaptive-calendar/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: `Created ${data.recommendations?.length || 0} new schedule recommendations`
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || "Failed to generate recommendations"
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleAccept = async (recommendationId: Id<"adaptiveSchedule">) => {
    try {
      await acceptRecommendation({
        recommendationId,
        createCalendarEvent: true,
      });

      setMessage({
        type: 'success',
        text: "This time slot has been added to your schedule"
      });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || "Failed to accept recommendation"
      });
    }
  };

  const handleReject = async (recommendationId: Id<"adaptiveSchedule">) => {
    try {
      await rejectRecommendation({ recommendationId });

      setMessage({
        type: 'success',
        text: "This suggestion has been dismissed"
      });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || "Failed to reject recommendation"
      });
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80)
      return <Badge className="bg-green-500">High Confidence</Badge>;
    if (confidence >= 60)
      return <Badge className="bg-yellow-500">Medium Confidence</Badge>;
    return <Badge variant="secondary">Low Confidence</Badge>;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Message */}
      {message && (
        <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-900 dark:bg-green-900/10 dark:text-green-400' : 'bg-red-50 text-red-900 dark:bg-red-900/10 dark:text-red-400'}`}>
          {message.text}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            AI Schedule Recommendations
          </h1>
          <p className="text-muted-foreground">
            Personalized study session suggestions based on your performance patterns
          </p>
        </div>
        <Button
          onClick={handleGenerateRecommendations}
          disabled={generating}
          size="lg"
        >
          {generating ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate New
            </>
          )}
        </Button>
      </div>

      {/* Statistics */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Generated</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.accepted}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {stats.pending}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Acceptance Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.acceptanceRate}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Pending Recommendations
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {recommendations.map((rec) => (
              <Card key={rec._id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        {rec.sessionType}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(rec.recommendedTime), "MMM d, h:mm a")}
                      </CardDescription>
                    </div>
                    {getConfidenceBadge(rec.confidence)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="font-medium">
                        {Math.round(rec.duration / 60)} minutes
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Starts in:</span>
                      <span className="font-medium">
                        {formatDistance(new Date(rec.recommendedTime), new Date(), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm flex items-start gap-2">
                      <TrendingUp className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                      <span>{rec.reason}</span>
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleAccept(rec._id)}
                      className="flex-1"
                      size="sm"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Accept
                    </Button>
                    <Button
                      onClick={() => handleReject(rec._id)}
                      variant="outline"
                      className="flex-1"
                      size="sm"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Recommendations Yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Click &quot;Generate New&quot; to get AI-powered schedule recommendations based on your
              performance patterns.
            </p>
            <Button onClick={handleGenerateRecommendations} disabled={generating}>
              {generating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Recommendations
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
