import { mutation, query, v } from "visage/api";

export interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
}

export const todosDb: TodoItem[] = [
  {
    id: "todo_1",
    title: "Explore Visage fine-grained signals",
    completed: true,
    createdAt: Date.now() - 3600000
  },
  {
    id: "todo_2",
    title: "Build full-stack file-based API with visage/api",
    completed: false,
    createdAt: Date.now() - 1800000
  }
];

export const get = query({
  resolve: () => [...todosDb]
});

export const post = mutation({
  input: v.object({
    title: v.string()
  }),
  resolve: ({ input, ctx }: any) => {
    const newTodo: TodoItem = {
      id: `todo_${Date.now().toString(36)}`,
      title: input.title.trim(),
      completed: false,
      createdAt: Date.now()
    };
    todosDb.push(newTodo);
    return { todo: newTodo, requestId: ctx.requestId };
  }
});
