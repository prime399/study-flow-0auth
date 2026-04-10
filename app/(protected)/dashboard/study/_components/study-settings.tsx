import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Settings, Save, Clock, Target, Info, CheckCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useState, useEffect } from "react"

export default function StudySettings({
  studyDuration,
  dailyGoal,
  onDurationChange,
  onDailyGoalChange,
  onSave,
}: {
  studyDuration: number
  dailyGoal: number
  onDurationChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDailyGoalChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSave: () => void
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  
  const durationMinutes = studyDuration / 60
  const dailyGoalMinutes = dailyGoal / 60
  const dailyGoalHours = Math.floor(dailyGoalMinutes / 60)
  const remainingMinutes = dailyGoalMinutes % 60

  // Common duration presets
  const durationPresets = [15, 25, 30, 45, 60, 90]
  const goalPresets = [60, 120, 180, 240, 300] // in minutes

  const handleSave = async () => {
    setIsLoading(true)
    setSaveStatus('idle')
    
    try {
      await onSave()
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (error) {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDurationSlider = (value: number[]) => {
    const event = {
      target: { value: value[0].toString() }
    } as React.ChangeEvent<HTMLInputElement>
    onDurationChange(event)
  }

  const handleGoalSlider = (value: number[]) => {
    const event = {
      target: { value: value[0].toString() }
    } as React.ChangeEvent<HTMLInputElement>
    onDailyGoalChange(event)
  }

  const getDurationRecommendation = () => {
    if (durationMinutes <= 15) return { text: "Good for quick focus sessions", color: "bg-blue-50 text-blue-700 border-blue-200" }
    if (durationMinutes <= 30) return { text: "Recommended for most people", color: "bg-emerald-50 text-emerald-700 border-emerald-200" }
    if (durationMinutes <= 60) return { text: "Great for deep work", color: "bg-purple-50 text-purple-700 border-purple-200" }
    return { text: "For advanced practitioners", color: "bg-orange-50 text-orange-700 border-orange-200" }
  }

  const getGoalRecommendation = () => {
    if (dailyGoalMinutes <= 60) return { text: "Getting started", color: "bg-blue-50 text-blue-700 border-blue-200" }
    if (dailyGoalMinutes <= 120) return { text: "Good daily habit", color: "bg-emerald-50 text-emerald-700 border-emerald-200" }
    if (dailyGoalMinutes <= 240) return { text: "Ambitious goal", color: "bg-purple-50 text-purple-700 border-purple-200" }
    return { text: "Intensive study", color: "bg-orange-50 text-orange-700 border-orange-200" }
  }

  const durationRec = getDurationRecommendation()
  const goalRec = getGoalRecommendation()

  return (
    <div className="space-y-6">
      {/* Study Duration Settings */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center text-lg">
            <Clock className="mr-2 h-5 w-5" />
            Study Session Duration
          </CardTitle>
          <CardDescription>
            Set your preferred study session length for focused work periods
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="study-duration" className="text-sm font-medium">
                Duration (minutes)
              </Label>
              <Badge variant="outline" className={durationRec.color}>
                {durationRec.text}
              </Badge>
            </div>
            
            <div className="space-y-4">
              <div className="px-3">
                <Slider
                  value={[durationMinutes]}
                  onValueChange={handleDurationSlider}
                  max={120}
                  min={5}
                  step={5}
                  className="w-full"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Input
                  id="study-duration"
                  type="number"
                  value={durationMinutes}
                  onChange={onDurationChange}
                  min={5}
                  max={120}
                  className="text-lg font-medium w-24"
                />
                <span className="text-sm text-muted-foreground">minutes</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Quick presets:</p>
              <div className="flex flex-wrap gap-2">
                {durationPresets.map((preset) => (
                  <Button
                    key={preset}
                    variant={durationMinutes === preset ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleDurationSlider([preset])}
                    className="text-xs"
                  >
                    {preset}m
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Goal Settings */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center text-lg">
            <Target className="mr-2 h-5 w-5" />
            Daily Study Goal
          </CardTitle>
          <CardDescription>
            Set your target daily study time to track progress and build consistency
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="daily-goal" className="text-sm font-medium">
                Daily Goal
              </Label>
              <Badge variant="outline" className={goalRec.color}>
                {goalRec.text}
              </Badge>
            </div>

            <div className="space-y-4">
              <div className="px-3">
                <Slider
                  value={[dailyGoalMinutes]}
                  onValueChange={handleGoalSlider}
                  max={480}
                  min={15}
                  step={15}
                  className="w-full"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Input
                  id="daily-goal"
                  type="number"
                  value={dailyGoalMinutes}
                  onChange={onDailyGoalChange}
                  min={15}
                  max={480}
                  className="text-lg font-medium w-24"
                />
                <span className="text-sm text-muted-foreground">
                  minutes ({dailyGoalHours}h {remainingMinutes}m)
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Popular goals:</p>
              <div className="flex flex-wrap gap-2">
                {goalPresets.map((preset) => (
                  <Button
                    key={preset}
                    variant={dailyGoalMinutes === preset ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleGoalSlider([preset])}
                    className="text-xs"
                  >
                    {preset >= 60 ? `${preset/60}h` : `${preset}m`}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Summary & Save */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center text-lg">
            <Settings className="mr-2 h-5 w-5" />
            Settings Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">Session Duration</p>
              <p className="font-medium">{durationMinutes} minutes</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Daily Goal</p>
              <p className="font-medium">{dailyGoalHours}h {remainingMinutes}m</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Sessions per day</p>
              <p className="font-medium">~{Math.ceil(dailyGoalMinutes / durationMinutes)} sessions</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Weekly goal</p>
              <p className="font-medium">{Math.round((dailyGoalMinutes * 7) / 60 * 10) / 10}h</p>
            </div>
          </div>

          <Separator />
          
          <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Settings will be saved to your account and synced across all devices. Changes take effect immediately.
            </p>
          </div>

          <Button 
            className="w-full" 
            onClick={handleSave} 
            disabled={isLoading}
            variant={saveStatus === 'success' ? 'default' : 'outline'}
          >
            {isLoading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                Saving Settings...
              </>
            ) : saveStatus === 'success' ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Settings Saved!
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
