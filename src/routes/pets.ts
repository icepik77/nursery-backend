import express, { Router, Request, Response } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import { auth } from "../middleware/authMiddleware";

const router = Router();

export type Pet = {
  id: string;
  user_id: string;   // ✅ owner of the pet
  name?: string;
  gender?: string;
  birthdate?: string;
  chip?: string;
  breed?: string;
  weight?: string;
  height?: string;
  color?: string;
  note?: string;
  imageUri?: string;
  bigNote?: string;
  category?: string;
  pasportName?: string;
};

let pets: Pet[] = [];

router.get("/", auth, (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "userId is required" });

  const userPets = pets.filter((p) => p.user_id === userId);
  res.json(userPets);
});

router.post("/", auth, (req, res) => {
  const { user_id, ...petData } = req.body;

  if (!user_id || !petData.name) {
    return res.status(400).json({ error: "user_id and name are required" });
  }

  const newPet = {
    ...petData,
    id: uuidv4(),
    user_id,
  };

  pets.push(newPet);
  res.status(201).json(newPet);
});

router.delete("/:id", auth, (req, res) => {
  const { id } = req.params;

  const index = pets.findIndex((p) => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Pet not found" });
  }

  const deleted = pets.splice(index, 1)[0];
  res.json(deleted);
});

router.put("/:id", auth, (req, res) => {
  const { id } = req.params;
  const index = pets.findIndex((p) => p.id === id);
  if (index === -1) return res.status(404).json({ error: "Pet not found" });

  pets[index] = { ...pets[index], ...req.body };
  res.json(pets[index]);
});

export default router;
