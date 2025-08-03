import { Router } from "express";

const MilestoneRouter = Router();
import { addMilestone, createMilestones, deleteMilestone, getAllMilestones, getAllMilestonesDirect, updateMilestone } 
from "../controller/milestoneController.js";
MilestoneRouter.get("/clients/get-client-milestones/:clientId", getAllMilestones);
MilestoneRouter.post("/milestones/create-milestones/:clientId", createMilestones);
MilestoneRouter.put("/milestones/achieve-milestone/:id", updateMilestone);
MilestoneRouter.delete("/clients/delete-milestone/:id", deleteMilestone);
MilestoneRouter.get("/milestones/get-client-milestones", getAllMilestonesDirect);
export { MilestoneRouter };