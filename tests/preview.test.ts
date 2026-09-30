import { describe, expect, test } from "bun:test";
import { reducePreview } from "../src/lib/db";
import { emptySnapshot } from "../src/lib/types";

describe("preview state transitions", () => {
  test("starts empty without production-like sample data", () => {
    expect(emptySnapshot().sessions).toEqual([]);
  });
  test("start, edit, stop saves exactly one session", () => {
    const started = reducePreview(emptySnapshot(), { kind: "start", note: "work" }, 1000);
    const edited = reducePreview(started, { kind: "note", note: "updated", startedAt: 1000 }, 2000);
    const stopped = reducePreview(edited, { kind: "stop", startedAt: 1000 }, 3456);
    expect(stopped.sessions).toHaveLength(1);
    expect(stopped.sessions[0].durationMs).toBe(2456);
    expect(stopped.sessions[0].note).toBe("updated");
    expect(stopped.running).toBe(false);
    expect(stopped.note).toBe("");
    expect(stopped.revision).toBe(3);
    expect(() => reducePreview(stopped, { kind: "stop", startedAt: 1000 }, 4000)).toThrow();
  });
  test("duplicate starts and stale notes are rejected", () => {
    const started = reducePreview(emptySnapshot(), { kind: "start", note: "work" }, 1000);
    expect(() => reducePreview(started, { kind: "start", note: "other" }, 2000)).toThrow();
    expect(() => reducePreview(started, { kind: "note", note: "stale", startedAt: null }, 2000)).toThrow();
  });
  test("notes validate whitespace, length and Unicode consistently with native", () => {
    expect(() => reducePreview(emptySnapshot(), { kind: "start", note: "  " }, 1000)).toThrow();
    expect(() => reducePreview(emptySnapshot(), { kind: "start", note: "a".repeat(121) }, 1000)).toThrow();
    expect(() => reducePreview(emptySnapshot(), { kind: "start", note: "😀".repeat(61) }, 1000)).toThrow();
    expect(reducePreview(emptySnapshot(), { kind: "note", note: "", startedAt: null }, 1000).note).toBe("");
  });
  test("clock rollback clamps duration without mutating previous state", () => {
    const started = reducePreview(emptySnapshot(), { kind: "start", note: "work" }, 1000);
    expect(reducePreview(started, { kind: "stop", startedAt: 1000 }, 500).sessions[0].durationMs).toBe(0);
    expect(started.running).toBe(true);
  });
});
