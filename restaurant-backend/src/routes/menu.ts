import { Router } from "express";
import { getCategories, getMenu } from "../controllers/menu.ts";

const menuRouter = Router();
menuRouter.get("/menu", getMenu);
menuRouter.get("/categories", getCategories);

export default menuRouter;
