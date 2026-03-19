export interface PlanTodo {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
}

export interface PlanMeta {
  repo?: string;
  branch?: string;
  sharedBy?: string;
}

export interface ParsedPlan {
  name: string;
  overview: string;
  todos: PlanTodo[];
  isProject: boolean;
  body: string;
  filePath: string;
  meta?: PlanMeta;
}
