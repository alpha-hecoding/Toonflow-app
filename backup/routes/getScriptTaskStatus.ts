import express from "express";
import u from "@/utils";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { z } from "zod";

const router = express.Router();

// 获取剧本生成任务状态
export default router.get(
  "/",
  validateFields({
    taskId: z.string(),
  }),
  async (req, res) => {
    const { taskId } = req.query as { taskId: string };

    try {
      const task = await u.db("t_taskList")
        .where("id", taskId)
        .select("*")
        .first();

      if (!task) {
        return res.status(404).send({ message: "任务不存在" });
      }

      // 如果任务已完成，返回结果
      if (task.state === "completed" && task.result) {
        return res.status(200).send(success({
          taskId: task.id,
          state: task.state,
          result: task.result,
          message: "任务完成"
        }));
      }

      // 如果任务失败，返回错误信息
      if (task.state === "failed") {
        return res.status(200).send(success({
          taskId: task.id,
          state: task.state,
          error: task.error,
          message: "任务失败"
        }));
      }

      // 任务进行中
      return res.status(200).send(success({
        taskId: task.id,
        state: task.state,
        message: task.state === "processing" ? "任务执行中" : "任务等待中"
      }));

    } catch (error: any) {
      console.error('[getScriptTaskStatus] 查询任务状态失败:', error?.message || error);
      res.status(500).send({ message: `查询任务状态失败: ${error?.message || '未知错误'}` });
    }
  }
);
