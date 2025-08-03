import { Router } from "express";
import { addClient, deleteClient, getAllClients, updateClient } from "../controller/clientController.js";

const ClientRouter = Router();


ClientRouter.get("/get-all-clients",getAllClients);
ClientRouter.post("/create-client", addClient);
ClientRouter.put("/update-client/:id", updateClient);
ClientRouter.delete("/delete-client/:id", deleteClient);

export {ClientRouter};