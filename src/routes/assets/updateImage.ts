import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    id: z.number(),
    state: z.string(),
  }),
  async (req, res) => {
    const { id, state } = req.body;

    await u.db("t_image").where("id", id).update({ state });

    res.status(200).send(success({ message: "更新图片状态成功" }));
  }
);
