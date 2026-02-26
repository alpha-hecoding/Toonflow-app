import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

// 保存分镜图
export default router.post(
  "/",
  validateFields({
    results: z.array(
      z.object({
        videoPrompt: z.string(),
        prompt: z.string(),
        duration: z.string(),
        projectId: z.number(),
        filePath: z.string(),
        type: z.string(),
        name: z.string(),
        scriptId: z.number(),
        segmentId: z.number(),
        shotIndex: z.number(),
      })
    ),
  }),
  async (req, res) => {
    const { results } = req.body;
    // const assetsIds = await u.db("t_assets").where("scriptId", results[0].scriptId).andWhere("type", "分镜").select("id").pluck("id");
    const list = results.map((item: any) => {
      let filePath = item.filePath;
      // 如果是完整的 URL，提取 pathname 部分；如果是相对路径，直接使用
      if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        try {
          filePath = new URL(filePath).pathname;
        } catch (err) {
          // URL 解析失败时使用原始值
          console.warn('URL 解析失败:', err);
        }
      }
      return {
        ...item,
        filePath,
      };
    });
    // 按 base64Data 原始顺序过滤、插库
    await u.db("t_assets").insert(list);
    // // 完成后删除旧分镜资源
    // if (assetsIds && assetsIds.length > 0) {
    //   await u.db("t_assets").whereIn("id", assetsIds).delete();
    // }
    res.status(200).send({ message: "保存分镜图成功" });
  },
);
