// src/routes/note.ts
import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { auth } from "../middleware/authMiddleware";

const router = Router();

export type Note = {
  id: string;
  pet_id: string;     // ✅ link to pet
  user_id: string;    // ✅ owner
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

let notes: Note[] = [];

/**
 * GET /api/notes?userId=...&petId=...
 * Get all notes for a specific user (and optionally for a pet)
 */
router.get("/", auth, (req: Request, res: Response) => {
  const { userId, petId } = req.query;
  if (!userId) return res.status(400).json({ error: "userId is required" });

  let userNotes = notes.filter((n) => n.user_id === userId);

  if (petId) {
    userNotes = userNotes.filter((n) => n.pet_id === petId);
  }

  res.json(userNotes);
});

/**
 * POST /api/notes
 * Create a new note for a pet
 */
router.post("/", auth, (req: Request, res: Response) => {
  const { user_id, pet_id, title, content } = req.body;

  if (!user_id || !pet_id || !title) {
    return res.status(400).json({ error: "user_id, pet_id and title are required" });
  }

  const newNote: Note = {
    id: uuidv4(),
    user_id,
    pet_id,
    title,
    content: content || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  notes.push(newNote);
  res.status(201).json(newNote);
});

/**
 * PUT /api/notes/:id
 * Update a note
 */
router.put("/:id", auth, (req: Request, res: Response) => {
  const { id } = req.params;
  const index = notes.findIndex((n) => n.id === id);
  if (index === -1) return res.status(404).json({ error: "Note not found" });

  notes[index] = {
    ...notes[index],
    ...req.body,
    updatedAt: new Date().toISOString(),
  };

  res.json(notes[index]);
});

/**
 * DELETE /api/notes/:id
 * Delete a note
 */
router.delete("/:id", auth, (req: Request, res: Response) => {
  const { id } = req.params;
  const index = notes.findIndex((n) => n.id === id);
  if (index === -1) return res.status(404).json({ error: "Note not found" });

  const deleted = notes.splice(index, 1)[0];
  res.json(deleted);
});

export default router;
