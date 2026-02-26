import express from "express";
import expressWs, { Application } from "express-ws";
import u from "@/utils";
import { generateScript } from "@/utils/generateScript";

const router = express.Router();
expressWs(router as unknown as Application);

// 存储所有活跃的 WebSocket 连接 { taskId: ws }
const activeConnections = new Map<string, import("ws").WebSocket>();

// 发送消息给指定任务的 WebSocket 连接
function sendToTask(taskId: string, message: any) {
  const ws = activeConnections.get(taskId);
  if (ws && ws.readyState === 1) { // OPEN state
    ws.send(JSON.stringify(message));
  }
}

// 包装 generateScript 函数，添加进度回调
async function generateScriptWithProgress(
  episode: any,
  novelData: string,
  taskId: string,
  onProgress: (progress: { stage: string; message?: string }) => void
): Promise<string> {
  const episodePrompt = `第${episode.episodeIndex}集：${episode.title}\n\n` +
    `• 场景：${episode.scenes?.map((s: any) => s.name).join(", ") || ""}\n` +
    `• 角色：${episode.characters?.map((c: any) => c.name).join(", ") || ""}\n` +
    `• 核心矛盾：${episode.coreConflict || ""}\n` +
    `• 剧情主干：${episode.outline || ""}`;

  onProgress({ stage: "准备AI配置" });

  const prompts = await u.db("t_prompts").where("code", "script").first();
  const promptConfig = await u.getPromptAi("generateScript");
  const mainPrompts = prompts?.customValue || prompts?.defaultValue || "不论用户说什么，请直接输出AI配置异常";

  onProgress({ stage: "调用AI生成", message: "正在生成剧本，请稍候..." });

  const result = await u.ai.text.invoke(
    {
      messages: [
        { role: "system", content: mainPrompts },
        { role: "user", content: `请根据以下大纲生成剧本：\n${episodePrompt}\n\n原文参考：${novelData.substring(0, 500)}...` },
      ],
    },
    promptConfig,
  );

  onProgress({ stage: "处理结果" });

  return result.text ?? "";
}

router.ws("/", async (ws, req) => {
  const outlineId = req.query.outlineId;
  const scriptId = req.query.scriptId;
  const taskId = req.query.taskId || "0";

  console.log("[WebSocket] script/generateScript 连接", { outlineId, scriptId, taskId });

  if (!outlineId || typeof outlineId !== "string" || !scriptId || typeof scriptId !== "string") {
    ws.send(JSON.stringify({ type: "error", data: { message: "大纲ID或剧本ID缺失" } }));
    ws.close(400, "参数缺失");
    return;
  }

  // 保存连接
  activeConnections.set(String(taskId), ws);

  // 发送连接成功消息
  ws.send(JSON.stringify({
    type: "connected",
    data: { taskId, message: "连接成功" }
  }));

  try {
    // 获取大纲数据
    sendToTask(String(taskId), { type: "progress", data: { stage: "查询大纲" } });

    const outlineData = await u.db("t_outline").where("id", Number(outlineId)).select("*").first();
    if (!outlineData) {
      throw new Error("大纲为空");
    }

    const parameter = JSON.parse(outlineData.data!);

    // 获取小说数据
    sendToTask(String(taskId), { type: "progress", data: { stage: "查询小说" } });

    const novelData = await u
      .db("t_novel")
      .whereIn("chapterIndex", parameter.chapterRange)
      .where("projectId", outlineData.projectId)
      .select("*");

    if (novelData.length == 0) {
      throw new Error("原文为空");
    }

    // 合并小说文本
    sendToTask(String(taskId), { type: "progress", data: { stage: "处理数据" } });

    const result = novelData
      .map((chap: any) => {
        return `${chap.chapter.trim()}\n\n${chap.chapterData.trim().replace(/\r?\n/g, "\n")}\n`;
      })
      .join("\n");

    console.log("[WebSocket] 开始生成剧本", { taskId, title: parameter.title });

    // 生成剧本
    const scriptContent = await generateScriptWithProgress(
      parameter,
      result,
      String(taskId),
      (progress) => {
        sendToTask(String(taskId), { type: "progress", data: progress });
      }
    );

    if (!scriptContent) {
      throw new Error("生成剧本失败");
    }

    // 保存剧本
    sendToTask(String(taskId), { type: "progress", data: { stage: "保存剧本" } });

    await u.db("t_script").where("id", Number(scriptId)).update({
      content: scriptContent,
    });

    // 更新任务状态
    await u.db("t_taskList").where("id", Number(taskId)).update({
      state: "completed",
      endTime: new Date().toISOString(),
    });

    // 发送完成消息
    ws.send(JSON.stringify({
      type: "completed",
      data: {
        taskId,
        result: scriptContent,
        message: "剧本生成完成"
      }
    }));

    console.log("[WebSocket] 剧本生成完成", taskId);

  } catch (error: any) {
    console.error("[WebSocket] 剧本生成失败:", error);

    // 更新任务状态为失败
    await u.db("t_taskList").where("id", Number(taskId)).update({
      state: "failed",
      endTime: new Date().toISOString(),
    });

    // 发送错误消息
    ws.send(JSON.stringify({
      type: "error",
      data: {
        taskId,
        error: error?.message || '未知错误',
        message: "剧本生成失败"
      }
    }));

    ws.close(500, "生成失败");

  } finally {
    // 清理连接 - 移除错误的 set，应该由 close 事件处理
  }

  // 连接关闭时清理
  ws.on("close", () => {
    console.log("[WebSocket] script/generateScript 连接关闭", taskId);
    activeConnections.delete(String(taskId));
  });

  ws.on("error", (error) => {
    console.error("[WebSocket] script/generateScript 连接错误", taskId, error);
  });
});

export default router;
