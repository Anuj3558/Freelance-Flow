import { Router } from "express";
import { AddAllEstimate, GetAllEstimates, SelectEstimateById } from "../controller/EstimateController.js";

const EstimateRouter = Router();


EstimateRouter.post("/estimates/add-all-estimates/:id", AddAllEstimate);

// Get all estimates
EstimateRouter.get("/estimates/all-estimates/:id", GetAllEstimates);

// Get a specific estimate by ID
EstimateRouter.put("/estimates/select-estimate/:id", SelectEstimateById);

export default EstimateRouter;
