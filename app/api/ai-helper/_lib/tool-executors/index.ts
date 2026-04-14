/**
 * Barrel file — imports executors in registration order.
 * Calendar registers first (specific match), Heroku last (catch-all).
 */

// Order matters: calendar-specific before heroku catch-all
import './calendar-executor'
import './heroku-executor'

export { configureCalendarExecutor } from './calendar-executor'
export { configureHerokuExecutor } from './heroku-executor'
export { findExecutor, executeWithRegistry, clearExecutors } from './registry'
