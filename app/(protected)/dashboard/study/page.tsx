"use client"
import PageTitle from "@/components/page-title"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/convex/_generated/api"
import { useMutation, useQuery } from "convex/react"
import { useQueryState } from "nuqs"
import { useCallback, useEffect } from "react"
import { toast } from "sonner"
import confetti from "canvas-confetti"
import RecentSessions from "./_components/recent-sessions"
import StudySettings from "./_components/study-settings"
import StudyStats from "./_components/study-stats"
import StudyTimer from "./_components/study-timer"
import NotificationPermission from "./_components/notification-permission"
import { formatTimeTimer } from "@/lib/utils"
import SpotifyPlayer from "@/components/spotify-player"
import { useSpotifyStore } from "@/store/use-spotify-store"

const STUDY_TYPE_OPTIONS = [
  { value: "study", label: "Study" },
  { value: "review", label: "Review" },
  { value: "practice", label: "Practice" },
  { value: "reading", label: "Reading" },
]

const triggerNotification = (title: string, body: string) => {
  if (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    new Notification(title, {
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: "study-notification",
    })
  }
}

const triggerConfettiSideCannons = () => {
  const end = Date.now() + 3 * 1000 // 3 seconds
  const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"]

  const frame = () => {
    if (Date.now() > end) return

    confetti({
      particleCount: 2,
      angle: 60,
      spread: 55,
      startVelocity: 60,
      origin: { x: 0, y: 0.5 },
      colors: colors,
    })
    confetti({
      particleCount: 2,
      angle: 120,
      spread: 55,
      startVelocity: 60,
      origin: { x: 1, y: 0.5 },
      colors: colors,
    })

    requestAnimationFrame(frame)
  }

  frame()
}

export default function StudyPage() {
  const [studyTime, setStudyTime] = useQueryState("studyTime", {
    defaultValue: 0,
    parse: (value) => Number(value),
  })
  const [isStudying, setIsStudying] = useQueryState("isStudying", {
    defaultValue: false,
    parse: (value) => value === "true",
  })
  const [studyDuration, setStudyDuration] = useQueryState("studyDuration", {
    defaultValue: 25 * 60,
    parse: (value) => Number(value),
  })
  const [dailyGoal, setDailyGoal] = useQueryState("dailyGoal", {
    defaultValue: 120 * 60,
    parse: (value) => Number(value),
  })
  const [activeTab, setActiveTab] = useQueryState("tab", {
    defaultValue: "stats",
    parse: (value) => value as "stats" | "settings" | "history",
  })
  const [studyType, setStudyType] = useQueryState("studyType", {
    defaultValue: "study",
  })

  const { autoplayEnabled, selectedPlaylist } = useSpotifyStore()

  const updateSettings = useMutation(api.study.updateSettings)
  const completeSession = useMutation(api.study.completeSession)
  const stats = useQuery(api.study.getStats)
  const userSettings = useQuery(api.study.getSettings)

  const selectedStudyType = (
    STUDY_TYPE_OPTIONS.find((option) => option.value === studyType) ||
    STUDY_TYPE_OPTIONS[0]
  )
  const studyTypeLabel = selectedStudyType.label

  const handleStudyTypeChange = useCallback(
    (value: string) => {
      setStudyType(value)
    },
    [setStudyType],
  )

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      Notification.requestPermission()
    }
  }, [])

  // Sync user settings from Convex when loaded
  useEffect(() => {
    if (userSettings && userSettings.studyDuration && userSettings.dailyGoal) {
      setStudyDuration(userSettings.studyDuration)
      setDailyGoal(userSettings.dailyGoal)
    }
  }, [userSettings, setStudyDuration, setDailyGoal])

  const handleSessionComplete = useCallback(
    (time: number) => {
      setIsStudying(false)
      completeSession({
        duration: time,
        type: studyType,
        completed: true,
      })

      // Trigger celebration effects
      triggerConfettiSideCannons()
      
      triggerNotification(
        `${studyTypeLabel} Session Complete!`,
        `Great job! You logged ${formatTimeTimer(time)}.`,
      )

      toast.success(`Great job! ${studyTypeLabel} session complete.`)
    }, [completeSession, setIsStudying, studyType, studyTypeLabel])

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isStudying) {
      interval = setInterval(() => {
        setStudyTime((prevTime) => {
          const nextTime = prevTime + 1
          if (nextTime >= studyDuration) {
            handleSessionComplete(nextTime)
            return 0
          }
          return nextTime
        })
      }, 1000)
    }

    return () => clearInterval(interval)
  }, [handleSessionComplete, isStudying, setStudyTime, studyDuration])

  const handleDailyGoalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newGoal = Math.max(1, Number(e.target.value)) * 60
    setDailyGoal(newGoal)
    toast.success(`Daily goal set to ${e.target.value} minutes.`)
  }

  const handleStartStop = () => {
    if (isStudying) {
      completeSession({
        duration: studyTime,
        type: studyType,
        completed: false,
      })
      toast.success(`${studyTypeLabel} session paused at ${formatTimeTimer(studyTime)}.`)
    } else {
      toast.success(`${studyTypeLabel} session started.`)
    }
    setIsStudying(!isStudying)
  }

  const handleReset = () => {
    if (isStudying) {
      completeSession({
        duration: studyTime,
        type: studyType,
        completed: false,
      })
    }
    setStudyTime(0)
    setIsStudying(false)
    toast.success(`${studyTypeLabel} timer has been reset to 0.`)
  }

  const handleSaveSettings = async () => {
    try {
      await updateSettings({
        studyDuration,
        dailyGoal,
      })
      toast.success("Your study settings have been saved to your account.")
    } catch (error) {
      toast.error("Failed to save settings.")
    }
  }

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDuration = Math.max(1, Number(e.target.value)) * 60
    setStudyDuration(newDuration)
    toast.success(`Study duration set to ${e.target.value} minutes.`)
  }

  const progress = (studyTime / studyDuration) * 100

  return (
    <div className="">
      <PageTitle title="Study Dashboard" />
      <NotificationPermission />
      <div className="grid gap-6">
        <div className={`grid gap-6 ${autoplayEnabled && selectedPlaylist ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
          <StudyTimer
            studyTime={studyTime}
            studyDuration={studyDuration}
            studyType={studyType}
            studyTypeOptions={STUDY_TYPE_OPTIONS}
            onStudyTypeChange={handleStudyTypeChange}
            isStudying={isStudying}
            onStartStop={handleStartStop}
            onReset={handleReset}
          />
          {autoplayEnabled && selectedPlaylist && (
            <SpotifyPlayer autoStart={isStudying} />
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="stats">Statistics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="mt-6">
            <StudyStats
              studyTime={studyTime}
              progress={progress}
              totalStudyTime={stats?.totalStudyTime ?? 0}
              coinsBalance={stats?.coinsBalance ?? 0}
            />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <StudySettings
              studyDuration={studyDuration}
              dailyGoal={dailyGoal}
              onDurationChange={handleDurationChange}
              onDailyGoalChange={handleDailyGoalChange}
              onSave={handleSaveSettings}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            {stats?.recentSessions && stats.recentSessions.length > 0 ? (
              <RecentSessions sessions={stats.recentSessions} />
            ) : (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No study sessions recorded yet.
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
