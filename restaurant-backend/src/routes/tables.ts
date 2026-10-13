import { Router } from "express";
import { getTable } from "../controllers/tables.ts";

const tablesRouter = Router();
tablesRouter.get("/:tableId", getTable);

export default tablesRouter;
