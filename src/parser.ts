import { readFileSync } from "fs";
import type { ParsedPlan, PlanTodo } from "./types.js";

function parseFrontmatter(content: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const [, yamlBlock, body] = match;
  const frontmatter: Record<string, unknown> = {};

  let currentKey = "";
  let inTodos = false;
  const todos: PlanTodo[] = [];
  let currentTodo: Partial<PlanTodo> | null = null;

  for (const line of (yamlBlock ?? "").split("\n")) {
    const todoItemMatch = line.match(/^ {2}- id:\s*(.+)$/);
    const todoFieldMatch = line.match(/^ {4}(\w+):\s*(.+)$/);
    const topLevelMatch = line.match(/^(\w+):\s*(.*)$/);
    const todosKeyMatch = line.match(/^todos:$/);

    if (todosKeyMatch) {
      inTodos = true;
      currentKey = "todos";
      continue;
    }

    if (inTodos && todoItemMatch) {
      if (currentTodo) todos.push(currentTodo as PlanTodo);
      const todoId = todoItemMatch[1]?.trim() ?? "";
      currentTodo = { id: todoId };
      continue;
    }

    if (inTodos && todoFieldMatch && currentTodo) {
      const [, field, value] = todoFieldMatch;
      const cleanValue = (value ?? "").replace(/^["']|["']$/g, "");
      if (field === "content") currentTodo.content = cleanValue;
      if (field === "status")
        currentTodo.status = cleanValue as PlanTodo["status"];
      continue;
    }

    if (topLevelMatch && !inTodos) {
      const [, key, value] = topLevelMatch;
      currentKey = key ?? "";
      const cleanValue = (value ?? "").replace(/^["']|["']$/g, "");
      if (cleanValue === "true") frontmatter[currentKey] = true;
      else if (cleanValue === "false") frontmatter[currentKey] = false;
      else if (cleanValue === "") frontmatter[currentKey] = "";
      else frontmatter[currentKey] = cleanValue;
      continue;
    }

    if (inTodos && topLevelMatch) {
      if (currentTodo) todos.push(currentTodo as PlanTodo);
      currentTodo = null;
      inTodos = false;
      const [, key, value] = topLevelMatch;
      currentKey = key ?? "";
      const cleanValue = (value ?? "").replace(/^["']|["']$/g, "");
      if (cleanValue === "true") frontmatter[currentKey] = true;
      else if (cleanValue === "false") frontmatter[currentKey] = false;
      else frontmatter[currentKey] = cleanValue;
    }
  }

  if (currentTodo) todos.push(currentTodo as PlanTodo);
  if (todos.length > 0) frontmatter["todos"] = todos;

  void currentKey;

  return { frontmatter, body: (body ?? "").trim() };
}

export function parsePlanFile(filePath: string): ParsedPlan {
  const content = readFileSync(filePath, "utf-8");
  const { frontmatter, body } = parseFrontmatter(content);

  return {
    name: String(frontmatter["name"] ?? "Untitled Plan"),
    overview: String(frontmatter["overview"] ?? ""),
    todos: Array.isArray(frontmatter["todos"])
      ? (frontmatter["todos"] as PlanTodo[])
      : [],
    isProject: Boolean(frontmatter["isProject"]),
    body,
    filePath,
  };
}

export function isPlanFile(filePath: string): boolean {
  return filePath.endsWith(".plan.md");
}
