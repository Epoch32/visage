import { mutation, query, RPCError, v } from "visage/api";
import { todosDb } from "./index";

export const get = query({
  resolve: ({ params }: any) => {
    const item = todosDb.find((t) => t.id === params.id);
    if (!item) throw new RPCError(404, `Todo with id ${params.id} not found`);
    return item;
  }
});

export const patch = mutation({
  input: v.object({
    completed: v.boolean()
  }),
  resolve: ({ input, params }: any) => {
    const item = todosDb.find((t) => t.id === params.id);
    if (!item) throw new RPCError(404, `Todo with id ${params.id} not found`);
    item.completed = input.completed;
    return item;
  }
});

export const del = mutation({
  resolve: ({ params }: any) => {
    const idx = todosDb.findIndex((t) => t.id === params.id);
    if (idx === -1) throw new RPCError(404, `Todo with id ${params.id} not found`);
    const [deleted] = todosDb.splice(idx, 1);
    return { deletedId: deleted?.id };
  }
});
