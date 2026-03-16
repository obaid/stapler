export type LiveEvent = {
  type: string;
  data: unknown;
  timestamp: string;
};

type Listener = (event: LiveEvent) => void;

const companyListeners = new Map<string, Set<Listener>>();

export function publishCompanyEvent(companyId: string, type: string, data: unknown) {
  const listeners = companyListeners.get(companyId);
  if (!listeners || listeners.size === 0) return;

  const event: LiveEvent = {
    type,
    data,
    timestamp: new Date().toISOString(),
  };

  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // Ignore listener errors
    }
  }
}

export function subscribeCompanyLiveEvents(companyId: string, listener: Listener): () => void {
  let listeners = companyListeners.get(companyId);
  if (!listeners) {
    listeners = new Set();
    companyListeners.set(companyId, listeners);
  }
  listeners.add(listener);

  return () => {
    listeners!.delete(listener);
    if (listeners!.size === 0) {
      companyListeners.delete(companyId);
    }
  };
}
