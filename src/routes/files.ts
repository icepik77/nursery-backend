// import { Router } from "express";
// import multer from "multer";
// import path from "path";
// import { authMiddleware } from "../middleware/authMiddleware";

// const router = Router();
// const upload = multer({ dest: "uploads/" });

// router.post("/:petId/documents", authMiddleware, upload.single("file"), (req, res) => {
//   const fileUrl = `/uploads/${req.file.filename}`;
//   res.json({ url: fileUrl, name: req.file.originalname });
// });

// export default router;
