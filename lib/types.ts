export type StudySession = {
  startTime: string
  endTime: string | null
  duration: number
  type: string
  completed: boolean
}

export type StudyStats = {
  totalStudyTime: number
  studyDuration: number
  coinsBalance: number
  recentSessions: StudySession[]
  stats: {
    totalSessions: number
    completedSessions: number
    completionRate: string
  }
}

export type AIRequestBody = {
  messages: any[]
  userName: string | undefined
  studyStats: StudyStats | undefined
  groupInfo: any[]
  mcpToolId?: string
}

export interface CalendarEvent {
  title: string
  start: Date
  end: Date
  allDay: boolean
  resource: StudySession
}
