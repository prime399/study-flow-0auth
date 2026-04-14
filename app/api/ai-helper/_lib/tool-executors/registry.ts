/**
 * Executor registry — ordered list of { match, execute } entries.
 * First matching executor wins. Calendar registers first, Heroku catch-all last.
 */

import type { ToolExecutor, ToolExecutionRequest, ToolExecutionResult } from '../mcp-types'

const executors: ToolExecutor[] = []

export function registerExecutor(executor: ToolExecutor): void {
  executors.push(executor)
}

export function findExecutor(
  namespace: string,
  toolName: string
): ToolExecutor | undefined {
  return executors.find((e) => e.match(namespace, toolName))
}

export async function executeWithRegistry(
  request: ToolExecutionRequest
): Promise<ToolExecutionResult> {
  const executor = findExecutor(request.namespace, request.toolName)

  if (!executor) {
    return {
      success: false,
      error: `No executor found for ${request.namespace}/${request.toolName}`,
    }
  }

  return executor.execute(request)
}

export function clearExecutors(): void {
  executors.length = 0
}
