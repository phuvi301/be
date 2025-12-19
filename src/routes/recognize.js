import express from "express";
import RecognizeController from "../controllers/RecognizeController.js";
import multer from "multer";
const upload = multer();

const router = express.Router();

router.post('/', upload.single("file"), RecognizeController.recognize);

export default router;
