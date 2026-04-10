"use client"
import PageTitle from "@/components/page-title"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { api } from "@/convex/_generated/api"
import { CalendarEvent, StudySession } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useQuery } from "convex/react"
import { format, getDay, parse, startOfWeek } from "date-fns"
import { enUS } from "date-fns/locale"
import { useState, useEffect } from "react"
import { Calendar, dateFnsLocalizer, View, Views } from "react-big-calendar"
import "react-big-calendar/lib/css/react-big-calendar.css"
import { CalendarHeader } from "./_components/calendar-header"
import { CalendarToolbar } from "./_components/calendar-toolbar"
import { SessionDialog } from "./_components/session-dialog"
import "./styles.css"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { AlertCircle } from "lucide-react"

const locales = {
  "en-US": enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

export default function CalendarPage() {
  const stats = useQuery(api.study.getFullStats)
  const [selectedSession, setSelectedSession] = useState<StudySession | null>(
    null,
  )
  const [view, setView] = useState<View>(Views.MONTH)
  const [date, setDate] = useState(new Date())
  const [googleCalendarEvents, setGoogleCalendarEvents] = useState<CalendarEvent[]>([])
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false)
  const [loadingGoogleEvents, setLoadingGoogleEvents] = useState(false)

  // Fetch Google Calendar connection status and events
  useEffect(() => {
    const fetchGoogleCalendarEvents = async () => {
      try {
        setLoadingGoogleEvents(true)
        const response = await fetch('/api/google-calendar/status')
        const status = await response.json()

        setGoogleCalendarConnected(status.connected)

        if (status.connected) {
          // Fetch events from Google Calendar
          // This would require a new API endpoint to fetch events
          // For now, we'll just show the connection status
        }
      } catch (error) {
        console.error('Error fetching Google Calendar events:', error)
      } finally {
        setLoadingGoogleEvents(false)
      }
    }

    fetchGoogleCalendarEvents()
  }, [])

  if (!stats) {
    return <LoadingSkeleton />
  }

  const events: CalendarEvent[] = stats.recentSessions.map((session) => {
    const startTime = new Date(session.startTime)
    const endTime = session.endTime ? new Date(session.endTime) : new Date(session.startTime + 1000 * 60 * 30) // Default 30min if no end time
    const timeString = format(startTime, 'HH:mm')

    return {
      title: `${timeString} - ${session.type}`,
      start: startTime,
      end: endTime,
      allDay: false,
      resource: session,
    }
  }).concat(googleCalendarEvents)

  const eventStyleGetter = (event: CalendarEvent) => {
    // Check if this is a Google Calendar event (has a different structure)
    const isGoogleEvent = !event.resource?.completed
    const isCompleted = event.resource?.completed

    if (isGoogleEvent && event.title?.includes('Google')) {
      // Google Calendar event styling
      return {
        className: cn(
          "border rounded-md px-1 py-0.5 text-xs font-medium transition-colors overflow-hidden",
          "bg-blue-100 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50"
        ),
        style: {
          border: 'none',
          borderRadius: '4px',
          fontSize: '11px',
          lineHeight: '1.2',
          height: 'auto',
          maxHeight: '100%',
          minHeight: '18px',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          overflow: 'hidden',
        }
      }
    }

    // Study session styling
    return {
      className: cn(
        "border rounded-md px-1 py-0.5 text-xs font-medium transition-colors overflow-hidden",
        isCompleted
          ? "bg-green-100 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50"
          : "bg-red-100 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50",
      ),
      style: {
        border: 'none',
        borderRadius: '4px',
        fontSize: '11px',
        lineHeight: '1.2',
        height: 'auto',
        maxHeight: '100%',
        minHeight: '18px',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        overflow: 'hidden',
      }
    }
  }

  const handleViewChange = (newView: View) => {
    setView(newView)
  }

  const handleNavigate = (newDate: Date) => {
    setDate(newDate)
  }

  return (
    <div className="">
      <PageTitle title="Study Calendar" />

      {!googleCalendarConnected && (
        <Alert className="mb-4 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <strong>Sync with Google Calendar:</strong> Connect your Google Calendar in{' '}
            <a href="/dashboard/settings/google-calendar" className="underline font-semibold hover:opacity-80">
              settings
            </a>
            {' '}to automatically sync your study sessions to your calendar.
          </AlertDescription>
        </Alert>
      )}

      {googleCalendarConnected && (
        <Alert className="mb-4 bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
          <AlertCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            <strong>Google Calendar connected:</strong> Your study sessions are being synced to your calendar.{' '}
            <a href="/dashboard/settings/google-calendar" className="underline font-semibold hover:opacity-80">
              Manage settings
            </a>
          </AlertDescription>
        </Alert>
      )}

      <Card className="w-[calc(100svw-50px)] p-4 md:w-full">
        <ScrollArea>
          <div className="h-[calc(100svh-150px)]">
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              view={view}
              onView={handleViewChange}
              date={date}
              onNavigate={handleNavigate}
              views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
              eventPropGetter={eventStyleGetter}
              onSelectEvent={(event) => setSelectedSession(event.resource)}
              components={{
                toolbar: CalendarToolbar,
                header: CalendarHeader,
              }}
              popup={true}
              popupOffset={5}
              selectable
              className="calendar bg-background text-foreground"
              dayPropGetter={(date) => ({
                className: "bg-background text-foreground hover:bg-accent/50 transition-colors",
              })}
              slotPropGetter={() => ({
                className: "bg-background text-foreground border-border",
              })}
              step={30}
              timeslots={2}
              min={new Date(2024, 0, 1, 6, 0, 0)}
              max={new Date(2024, 0, 1, 22, 0, 0)}
              scrollToTime={new Date(2024, 0, 1, 8, 0, 0)}
              showMultiDayTimes={true}
              rtl={false}
            />
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </Card>

      <SessionDialog
        session={selectedSession}
        isOpen={!!selectedSession}
        onClose={() => setSelectedSession(null)}
      />
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="">
      <PageTitle title="Study Calendar" />
      <Card>
        <div className="h-[calc(100svh-150px)] p-4">
          <Skeleton className="h-full w-full" />
        </div>
      </Card>
    </div>
  )
}
