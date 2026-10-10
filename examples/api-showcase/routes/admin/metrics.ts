import { query } from "visage/api";
import { todosDb } from "../todos/index";

export default query({
  resolve: ({ ctx }: any) => {
    const total = todosDb.length;
    const completed = todosDb.filter((t) => t.completed).length;
    const pending = total - completed;

    return {
      adminUser: ctx.admin.id,
      stats: {
        totalTodos: total,
        completedTodos: completed,
        pendingTodos: pending,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
      },
      memoryMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    };
  }
});
