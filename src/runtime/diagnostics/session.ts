import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import type { Packet } from '../../packet.js';
import type { DiagnosticRecord, DiagnosticCapture } from '../../model/diagnostics/index.js';
import type { GraphDefinition } from '../../graph.js';
import { FlowError } from '../../errors.js';
import { createChanges } from '../../observation/changes.js';
import { createCapturePolicy, exact, bounded } from './policy.js';
import type { CaptureRule } from './policy.js';

export type SessionRequest = Readonly<{ rules: readonly CaptureRule[]; expiresInMs: number }>;
export type SessionUpdate = Readonly<{ expectedEpoch: number; rules: readonly CaptureRule[] }>;
export type SessionSnapshot = Readonly<{ sessionId: string; epoch: number; status: 'active' | 'expired' | 'disposed' | 'terminated';
  expiresAtMs: number; rules: readonly CaptureRule[]; effectiveRules: readonly CaptureRule[]; events: readonly DiagnosticRecord[] }>;
export type DiagnosticsSession = Readonly<{ snapshot(): SessionSnapshot; update(request: SessionUpdate): SessionSnapshot;
  subscribe(listener: () => void): () => void; dispose(): void }>;

/** One active permission lease, backed only by the existing run ring. */
export function createCaptureSessions(definition: GraphDefinition, policyValue: unknown, events: () => readonly DiagnosticRecord[]) {
  const resolver = createCapturePolicy(definition, policyValue);
  type Owner = { session: DiagnosticsSession; capture(kind: string, nodeId: string, port: string, packet: Packet): ReturnType<typeof captured> | undefined;
    close(status: 'expired' | 'disposed' | 'terminated'): void; check(): boolean; changed(): void };
  let active: Owner | undefined, terminated = false;
  function captured(packet: Packet, sessionId: string, captureEpoch: number) {
    const json = JSON.stringify(packet.value), bytes = Buffer.byteLength(json, 'utf8'), ceiling = resolver.policy.maxPayloadBytes;
    let capture: DiagnosticCapture;
    if (bytes <= ceiling) capture = Object.freeze({ state: 'captured', value: packet.value, bytes });
    else {
      let preview = '', used = 0;
      for (const character of json) { const size = Buffer.byteLength(character, 'utf8'); if (used + size > ceiling) break; preview += character; used += size; }
      capture = Object.freeze({ state: 'truncated', preview, bytes });
    }
    return { capture, captureSessionId: sessionId, captureEpoch };
  }
  function open(request: SessionRequest): DiagnosticsSession {
    if (terminated) throw new FlowError('RUN_TERMINATED');
    if (active?.check()) throw new FlowError('SESSION_ACTIVE');
    const fields = exact(request, ['rules', 'expiresInMs']);
    let rules = resolver.rules(fields.rules), effectiveRules = resolver.effective(rules), epoch = 1;
    const expiresAtMs = performance.now() + bounded(fields.expiresInMs, resolver.policy.maxSessionMs), sessionId = randomUUID();
    let status: SessionSnapshot['status'] = 'active';
    const subscriptions = new Set<() => void>(), changes = createChanges();
    function retire(): void { for (const off of subscriptions) off(); subscriptions.clear(); }
    function close(next: 'expired' | 'disposed' | 'terminated'): void {
      if (status !== 'active') return;
      status = next; clearTimeout(timer); retire(); active = undefined;
    }
    function check(): boolean { if (status === 'active' && performance.now() >= expiresAtMs) close('expired'); return status === 'active'; }
    function snapshot(): SessionSnapshot {
      check();
      return Object.freeze({ sessionId, epoch, status, expiresAtMs, rules, effectiveRules,
        events: Object.freeze(events().filter(event => 'captureSessionId' in event && event.captureSessionId === sessionId && event.captureEpoch === epoch)) });
    }
    const timer = setTimeout(() => close('expired'), expiresAtMs - performance.now()); timer.unref();
    const session: DiagnosticsSession = Object.freeze({ snapshot,
      update(request: SessionUpdate) {
        if (!check()) throw new FlowError('SESSION_CLOSED');
        const fields = exact(request, ['expectedEpoch', 'rules']);
        bounded(fields.expectedEpoch, Number.MAX_SAFE_INTEGER);
        if (fields.expectedEpoch !== epoch) throw new FlowError('CAPTURE_CONFLICT');
        const next = resolver.rules(fields.rules);
        rules = next; effectiveRules = resolver.effective(next); epoch++; retire();
        return snapshot();
      },
      subscribe(listener: () => void) {
        if (!check()) throw new FlowError('SESSION_CLOSED');
        if (typeof listener !== 'function') throw new TypeError('Session observer must be a function');
        const subscribedEpoch = epoch;
        const off = changes.subscribe(() => {
          if (!check() || epoch !== subscribedEpoch) return;
          try { listener(); } catch { off(); subscriptions.delete(off); }
        });
        subscriptions.add(off);
        return () => { off(); subscriptions.delete(off); };
      },
      dispose: () => close('disposed'),
    });
    active = { session, check, close, changed: changes.changed,
      capture(kind, nodeId, port, packet) {
        if (!check()) return;
        const direction = kind === 'sent' ? 'outputs' : 'inputs';
        if (effectiveRules.some(rule => rule.nodeId === nodeId && rule[direction] &&
          (rule.ports === undefined || rule.ports.includes(port)) && (rule.jobIds === undefined || rule.jobIds.includes(packet.jobId)))) return captured(packet, sessionId, epoch);
      } };
    return session;
  }
  return { open,
    capture(kind: string, nodeId: string, port: string, packet: Packet) { return active?.capture(kind, nodeId, port, packet); },
    changed() { active?.changed(); },
    terminate() { terminated = true; active?.close('terminated'); },
  };
}
