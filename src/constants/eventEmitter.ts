type Listener = () => void;
const listeners: Record<string, Listener[]> = {};

export const emit = (event: string) => {
  (listeners[event] ?? []).forEach(fn => fn());
};

export const on = (event: string, fn: Listener) => {
  listeners[event] = [...(listeners[event] ?? []), fn];
  return () => {
    listeners[event] = (listeners[event] ?? []).filter(f => f !== fn);
  };
};
