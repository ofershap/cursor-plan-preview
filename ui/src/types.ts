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
  m?: { r?: string; b?: string; s?: string };
}

export type SerializedAnnotation = [string, ...string[]];
