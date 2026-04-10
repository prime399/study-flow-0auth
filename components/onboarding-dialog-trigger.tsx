"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Slider } from "@/components/ui/slider"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "convex/react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import * as z from "zod"
import { Card, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Skeleton } from "./ui/skeleton"
import { ScrollArea } from "./ui/scroll-area"
import { Loader2 } from "lucide-react"

const formSchema = z.object({
  dailyGoal: z.number().min(1).max(1440),
  studyDuration: z.number().min(1),
  selectedGroups: z
    .array(z.string())
    .transform((val) => val.map((id) => id as Id<"groups">)),
})

export default function OnboardingDialogTrigger() {
  const isOnboardingDone = useQuery(api.onboarding.isOnboardingComplete)

  if (isOnboardingDone === undefined || isOnboardingDone === true) {
    return null
  }

  return <OnboardingDialog />
}

function OnboardingDialog() {
  const [open, setOpen] = useState(true)
  const [isImportingSample, setIsImportingSample] = useState(false)
  const [hasImportedSample, setHasImportedSample] = useState(false)

  const suggestedGroups = useQuery(api.onboarding.getSuggestedGroups, {
    limit: 4,
  })
  const completeOnboarding = useMutation(api.onboarding.completeOnboarding)
  const importSampleSessions = useMutation(api.onboarding.importSampleStudySessions)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dailyGoal: 120,
      studyDuration: 25,
      selectedGroups: [],
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await completeOnboarding({
        dailyGoal: values.dailyGoal * 60,
        studyDuration: values.studyDuration * 60,
        selectedGroupIds: values.selectedGroups,
      })
      setOpen(false)
      toast.success("Welcome aboard! 🎉", {
        description: "Your study preferences have been saved.",
      })
    } catch (error) {
      toast.error("Failed to save preferences. Please try again.")
    }
  }

  async function handleImportSampleData() {
    if (isImportingSample || hasImportedSample) {
      return
    }

    try {
      setIsImportingSample(true)
      const result = await importSampleSessions()
      setHasImportedSample(true)

      if (result?.inserted > 0) {
        toast.success("Sample study week ready!", {
          description: `Added ${result.inserted} sessions to help you explore the dashboard.`,
        })
      } else {
        toast.success("Sample sessions already loaded", {
          description: "You're ready to explore with the demo data in place.",
        })
      }
    } catch (error) {
      setHasImportedSample(false)
      toast.error("Unable to import sample sessions. Please try again.")
    } finally {
      setIsImportingSample(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="h-[calc(100svh-100px)] max-w-xl p-0 md:h-min">
        <ScrollArea className="h-full p-4">
          <DialogHeader>
            <DialogTitle>Welcome to StudyFlow!</DialogTitle>
            <DialogDescription>
              Let&apos;s set up your study preferences to help you achieve your
              goals.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="dailyGoal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Daily Study Goal (minutes)</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Slider
                          min={1}
                          max={1440}
                          step={1}
                          value={[field.value]}
                          onValueChange={([value]) => field.onChange(value)}
                        />
                        <div className="text-sm text-muted-foreground">
                          {field.value} minutes ({(field.value / 60).toFixed(1)}{" "}
                          hours)
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Set a realistic daily study goal
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="studyDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Study Session Duration (minutes)</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Slider
                          min={1}
                          max={1440}
                          step={1}
                          value={[field.value]}
                          onValueChange={([value]) => field.onChange(value)}
                        />
                        <div className="text-sm text-muted-foreground">
                          {field.value} minutes
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      How long should each study session be?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {suggestedGroups === undefined ? (
                <FormItem className="space-y-4">
                  <FormLabel>Join Study Groups</FormLabel>
                  <FormControl>
                    <GroupsSkeleton />
                  </FormControl>
                  <FormDescription>
                    Join study groups to collaborate with others
                  </FormDescription>
                </FormItem>
              ) : suggestedGroups.length > 0 ? (
                <FormField
                  control={form.control}
                  name="selectedGroups"
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <FormLabel>Join Study Groups</FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-2 gap-4">
                          {suggestedGroups.map((group) => (
                            <Card
                              key={group._id}
                              className={`cursor-pointer transition-all hover:bg-accent ${
                                field.value.includes(group._id)
                                  ? "border-primary bg-accent"
                                  : "border-border"
                              }`}
                              onClick={() => {
                                if (field.value.includes(group._id)) {
                                  field.onChange(
                                    field.value.filter(
                                      (id) => id !== group._id,
                                    ),
                                  )
                                } else {
                                  field.onChange([...field.value, group._id])
                                }
                              }}
                            >
                              <CardHeader className="p-4">
                                <div className="flex items-start justify-between space-x-4">
                                  <div className="space-y-1">
                                    <CardTitle className="text-base">
                                      {group.name}
                                    </CardTitle>
                                    {group.description && (
                                      <CardDescription className="line-clamp-2 text-xs">
                                        {group.description}
                                      </CardDescription>
                                    )}
                                  </div>
                                  <div
                                    className={`h-4 w-4 rounded-full border-2 ${
                                      field.value.includes(group._id)
                                        ? "border-primary bg-primary"
                                        : "border-muted"
                                    }`}
                                  >
                                    {field.value.includes(group._id) && (
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="text-background"
                                      >
                                        <polyline points="20 6 9 17 4 12" />
                                      </svg>
                                    )}
                                  </div>
                                </div>
                              </CardHeader>
                            </Card>
                          ))}
                        </div>
                      </FormControl>
                      <FormDescription>
                        Join study groups to collaborate with others
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
              <div className="space-y-2">
                <Button type="submit" className="w-full">
                  Start Studying
                </Button>
                <Button
                  type="button"
                  variant={hasImportedSample ? "secondary" : "outline"}
                  className="w-full justify-center gap-2"
                  onClick={handleImportSampleData}
                  disabled={isImportingSample || hasImportedSample}
                >
                  {isImportingSample ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Importing sample week...
                    </>
                  ) : hasImportedSample ? (
                    "Sample week ready"
                  ) : (
                    "Add sample study week"
                  )}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Populate your dashboard with a week of varied study sessions to explore the insights.
                </p>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

function GroupsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-10" />
      ))}
    </div>
  )
}

