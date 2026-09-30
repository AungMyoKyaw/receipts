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
  test("saved sessions can be corrected and deleted without accepting stale rows", () => {
    const stopped = reducePreview(
      reducePreview(emptySnapshot(), { kind: "start", note: "work" }, 1000),
      { kind: "stop", startedAt: 1000 }, 5000,
    );
    const original = stopped.sessions[0];
    const edited = reducePreview(stopped, {
      kind: "updateSession", expected: original, startedAt: 2000, endedAt: 7000, note: "revised work",
    }, 7000);
    expect(edited.sessions[0]).toMatchObject({ id: original.id, startedAt: 2000, endedAt: 7000, durationMs: 5000, note: "revised work" });
    expect(() => reducePreview(edited, { kind: "deleteSession", expected: original }, 8000)).toThrow("changed in another window");
    const deleted = reducePreview(edited, { kind: "deleteSession", expected: edited.sessions[0] }, 8000);
    expect(deleted.sessions).toEqual([]);
    const restarted = reducePreview(deleted, { kind: "start", note: "next" }, 9000);
    const nextSession = reducePreview(restarted, { kind: "stop", startedAt: 9000 }, 10_000, original.id + 1);
    expect(nextSession.sessions[0].id).toBe(original.id + 1);
    expect(() => reducePreview(stopped, {
      kind: "updateSession", expected: original, startedAt: 7000, endedAt: 6000, note: "work",
    }, 8000)).toThrow("End time must not be earlier than start time");
    expect(() => reducePreview(stopped, {
      kind: "updateSession", expected: original, startedAt: 1000, endedAt: 5000, note: "  ",
    }, 8000)).toThrow("Add a note before saving");
  });
  test("clock rollback clamps duration without mutating previous state", () => {
    const started = reducePreview(emptySnapshot(), { kind: "start", note: "work" }, 1000);
    expect(reducePreview(started, { kind: "stop", startedAt: 1000 }, 500).sessions[0].durationMs).toBe(0);
    expect(started.running).toBe(true);
  });
});
