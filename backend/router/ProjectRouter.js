import { Router
 } from "express";
 const ProjectRouter = Router();

import { addProject, deleteProject, getAllProjects, updateProject } from "../controller/projectController.js";
ProjectRouter.get("/clients/get-client-projects/:clientId", getAllProjects);
ProjectRouter.post("/clients/create-project/:clientId", addProject);  
ProjectRouter.put("/update-project/:id", updateProject);
ProjectRouter.delete("/clients/delete-project/:id", deleteProject);
export { ProjectRouter };
