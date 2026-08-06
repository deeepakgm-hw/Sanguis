import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRole, requireOwnership } from "../middlewares/rbac";
import * as userController from "../controllers/user.controller";
import { User } from "../models/User";

const router = Router();

router.get("/", requireAuth, requireRole("admin", "moderator"), userController.listUsers);

router.get(
  "/:id",
  requireAuth,
  requireOwnership(async (req) => {
    const user = await User.findById(req.params.id).select("_id");
    return user?._id.toString() ?? "";
  }),
  userController.getUser
);

router.patch(
  "/:id",
  requireAuth,
  requireOwnership(async (req) => req.params.id),
  userController.updateUser
);

router.delete("/:id", requireAuth, requireRole("admin"), userController.deleteUser);
router.patch("/:id/role", requireAuth, requireRole("admin"), userController.changeUserRole);

export default router;
