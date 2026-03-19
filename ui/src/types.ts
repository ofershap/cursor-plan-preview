export interface PlanTodo {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
}

export interface ParsedPlan {
  name: string;
  overview: string;
  todos: PlanTodo[];
  isProject: boolean;
  body: string;
  filePath: string;
}

export type AnnotationType =
  | "DELETION"
  | "INSERTION"
  | "REPLACEMENT"
  | "COMMENT"
  | "GLOBAL_COMMENT";

export interface Annotation {
  id: string;
  type: AnnotationType;
  originalText: string;
  text?: string;
  createdAt: number;
  author?: string;
  blockIndex?: number;
  startOffset?: number;
  endOffset?: number;
}

export interface SharePayload {
  p: string;
  n: string;
  o: string;
  a: SerializedAnnotation[];
}

export type SerializedAnnotation = [string, ...string[]];
