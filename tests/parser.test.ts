import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { parsePlanFile, isPlanFile } from "../src/parser.js";

const SAMPLE_PLAN = `---
name: Test Plan
overview: A test plan for unit testing
todos:
  - id: task-1
    content: Do the first thing
    status: pending
  - id: task-2
    content: Do the second thing
    status: completed
isProject: false
---

# Test Plan

## Overview

This is the plan body with **markdown** content.

- Item one
- Item two

\`\`\`typescript
const x = 1;
\`\`\`
`;

describe("parsePlanFile", () => {
  let tmpFile: string;

  beforeEach(() => {
    tmpFile = join(tmpdir(), `test-${Date.now()}.plan.md`);
    writeFileSync(tmpFile, SAMPLE_PLAN, "utf-8");
  });

  afterEach(() => {
    unlinkSync(tmpFile);
  });

  it("parses name and overview from frontmatter", () => {
    const plan = parsePlanFile(tmpFile);
    expect(plan.name).toBe("Test Plan");
    expect(plan.overview).toBe("A test plan for unit testing");
  });

  it("parses todos correctly", () => {
    const plan = parsePlanFile(tmpFile);
    expect(plan.todos).toHaveLength(2);
    expect(plan.todos[0]).toMatchObject({
      id: "task-1",
      content: "Do the first thing",
      status: "pending",
    });
    expect(plan.todos[1]).toMatchObject({
      id: "task-2",
      content: "Do the second thing",
      status: "completed",
    });
  });

  it("parses isProject as boolean", () => {
    const plan = parsePlanFile(tmpFile);
    expect(plan.isProject).toBe(false);
  });

  it("extracts markdown body", () => {
    const plan = parsePlanFile(tmpFile);
    expect(plan.body).toContain("# Test Plan");
    expect(plan.body).toContain("**markdown**");
  });

  it("includes filePath", () => {
    const plan = parsePlanFile(tmpFile);
    expect(plan.filePath).toBe(tmpFile);
  });
});

describe("isPlanFile", () => {
  it("returns true for .plan.md files", () => {
    expect(isPlanFile("/home/user/.cursor/plans/my-plan_abc123.plan.md")).toBe(
      true,
    );
  });

  it("returns false for regular .md files", () => {
    expect(isPlanFile("/home/user/project/README.md")).toBe(false);
  });

  it("returns false for other file types", () => {
    expect(isPlanFile("/home/user/project/index.ts")).toBe(false);
  });
});
