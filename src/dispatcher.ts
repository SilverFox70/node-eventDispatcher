import { createDispatcherLog } from './dispatcher/log.js';

/** A dynamic event boundary; callbacks may declare their own positional arguments. */
export type EventListener = (...args: never[]) => unknown;
export type DispatcherOptions = { logLimit?: number };
type Registration = { callback: EventListener; once: boolean; fired: boolean };

function validateEvent(name: string): void {
  if (typeof name !== 'string' || name.length === 0) {
    throw new TypeError('Event name must be a nonempty string');
  }
}

function validateListener(callback: EventListener): void {
  if (typeof callback !== 'function') throw new TypeError('Listener must be a function');
}

/** Independent synchronous dispatcher. Async callback results are ignored. */
export function createDispatcher(options: DispatcherOptions = {}) {
  if (typeof options !== 'object' || options === null || Array.isArray(options)) {
    throw new TypeError('Dispatcher options must be an object');
  }
  const limit = options.logLimit === undefined ? 1000 : options.logLimit;
  if (!Number.isInteger(limit) || limit < 0 || limit > 10000) {
    throw new TypeError('logLimit must be an integer between 0 and 10000');
  }
  const subscribers = new Map<string, Registration[]>();
  const log = createDispatcherLog(limit);

  function register(name: string, callback: EventListener, once: boolean): void {
    validateEvent(name);
    validateListener(callback);
    let registrations = subscribers.get(name);
    if (!registrations) {
      registrations = [];
      subscribers.set(name, registrations);
    }
    registrations.push({ callback, once, fired: false });
    log.record(once ? 'once' : 'on', name, callback.name);
  }

  function removeRegistration(name: string, registration: Registration): void {
    const registrations = subscribers.get(name);
    const index = registrations?.indexOf(registration) ?? -1;
    if (registrations && index >= 0) registrations.splice(index, 1);
  }

  return {
    on(name: string, callback: EventListener): void { register(name, callback, false); },
    once(name: string, callback: EventListener): void { register(name, callback, true); },

    /** Membership is fixed for this emit; a once registration can fire only once. */
    emit(name: string, data?: unknown, context?: unknown): void {
      validateEvent(name);
      const snapshot = [...(subscribers.get(name) ?? [])];
      const args = Array.isArray(data) ? data : [data];
      log.record('emit', name);
      for (const registration of snapshot) {
        if (registration.once) {
          if (registration.fired) continue;
          registration.fired = true;
          removeRegistration(name, registration);
        }
        Reflect.apply(registration.callback, context, args);
      }
    },

    off(name: string, callback: EventListener): void {
      validateEvent(name);
      validateListener(callback);
      const registration = subscribers.get(name)?.find(item => item.callback === callback);
      if (registration) removeRegistration(name, registration);
      log.record('off', name, callback.name);
    },

    unsubscribeAll(name: string): boolean {
      validateEvent(name);
      const removed = subscribers.delete(name);
      log.record('unsubscribeAll', name);
      return removed;
    },

    getSubscriberFunctionsByEventName(name: string): EventListener[] | undefined {
      validateEvent(name);
      return subscribers.get(name)?.map(item => item.callback);
    },
    getEventNames(): string[] { return [...subscribers.keys()]; },
    getAllSubscribedFunctions(): Record<string, EventListener[]> {
      return Object.fromEntries([...subscribers].map(([name, registrations]) => [
        name, registrations.map(item => item.callback)
      ]));
    },
    isValidEvent(name: string): boolean {
      validateEvent(name);
      return subscribers.has(name);
    },
    hasListenersOnEvent(name: string): boolean {
      validateEvent(name);
      return (subscribers.get(name)?.length ?? 0) > 0;
    },
    eventLog: log.snapshot,
    eventLoggerOn: log.enable,
    eventLoggerOff: log.disable,
    eventLoggerIsOn: log.isEnabled
  };
}

export type Dispatcher = ReturnType<typeof createDispatcher>;
export const eventDispatcher = createDispatcher();
