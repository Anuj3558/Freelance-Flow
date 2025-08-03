import { client
 } from "../models/clientModel.js";
import Expense from "../models/ExpenseModel.js";
import Project from "../models/ProjectSchema.js";
import Revenue from "../models/revenueModel.js";
const getAllClients = async (req, res) => {
  const id = req.user.id;
  console.log(id)
  try {
    const clients = await client.find({ userId: id });
    if (!clients || clients.length === 0) {
      return res.status(404).send("No Clients Found");
    }
    res.status(200).json(clients);
  } catch (e) {
    res.status(500).send("Server Error");
  }
};
const addClient = async (req, res) => {
  const userId = req.user.id;
  console.log(req.body)
  const clientData = { ...req.body, userId };
  try {
    const newClient = await client.create(clientData);
    res.status(201).json(newClient);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};
const updateClient = async (req, res) => {
  const clientId = req.params.id;
  const userId = req.user.id;

  try {
    const updated = await client.findOneAndUpdate(
      { _id: clientId, userId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).send("Client not found");
    }

    res.status(200).json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};
const deleteClient = async (req, res) => {
  const clientId = req.params.id;
  const userId = req.user.id;

  try {
    const deleted = await client.findOneAndDelete({ _id: clientId, userId });
   await Project.deleteMany({ clientId, userId });
   await Revenue.deleteMany({ clientId, userId });
   await Expense.deleteMany({ clientId, userId });
    
    if (!deleted) {
      return res.status(404).send("Client not found");
    }

    res.status(200).json({ message: "Client deleted successfully" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
export {
  getAllClients,
  addClient,
  updateClient,
  deleteClient
};