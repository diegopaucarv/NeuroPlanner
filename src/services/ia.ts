/**
 * ia
 *
 * Local AI helpers.  Calls an LLM served either by LM Studio (local) or a
 * remote API, depending on configuration.  Used for task decomposition and
 * cognitive-load-aware break recommendations.
 */

/** Decompose a task summary into a list of concrete sub-tasks. */
export async function decomposeTask(summary: string): Promise<string[]> {
  // TODO(phase 3): call LM Studio / remote LLM to split the task.
  void summary;
  return [];
}

/** Recommend a work/rest split (minutes) for a given cognitive load. */
export async function recommendBreak(
  cognitiveLoad: number,
): Promise<{ work: number; rest: number }> {
  // TODO(phase 3): derive work/rest split from cognitive load via LLM/heuristics.
  void cognitiveLoad;
  return { work: 0, rest: 0 };
}
