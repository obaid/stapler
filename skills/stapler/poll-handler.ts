import { poll, checkoutTask, completeTask, failTask, reportProgress } from "./stapler-client.js";

const POLL_INTERVAL = Number(process.env.STAPLER_POLL_INTERVAL) || 30;

let polling = false;
let nextPollSec = POLL_INTERVAL;

export async function startPolling(onTask: (task: any) => Promise<void>) {
  if (polling) return;
  polling = true;

  while (polling) {
    try {
      const response = await poll();
      nextPollSec = response.nextPollSec || POLL_INTERVAL;

      for (const task of response.tasks) {
        if (task.status !== "in_progress") {
          try {
            await checkoutTask(task.id);
          } catch {
            continue; // Another agent may have claimed it
          }
        }

        try {
          await onTask(task);
          await completeTask(task.id);
        } catch (err: any) {
          await failTask(task.id, err.message || "Unknown error");
        }
      }
    } catch (err) {
      console.error("[stapler] Poll failed:", err);
    }

    await new Promise((resolve) => setTimeout(resolve, nextPollSec * 1000));
  }
}

export function stopPolling() {
  polling = false;
}
