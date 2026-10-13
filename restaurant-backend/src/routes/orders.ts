import { Router } from "express";
import { getOrder, getOrders, patchOrderStatus, postOrder } from "../controllers/orders.ts";
import { requireStaffKey } from "../middleware/staffAuth.ts";

const ordersRouter = Router();
ordersRouter.post("/", postOrder);
ordersRouter.get("/", requireStaffKey, getOrders);
ordersRouter.get("/:orderId", getOrder);
ordersRouter.patch("/:orderId/status", requireStaffKey, patchOrderStatus);

export default ordersRouter;
