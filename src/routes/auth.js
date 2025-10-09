import express from "express";
import AuthController from "../controllers/AuthController.js";
const router = express.Router();

router.post("/login", AuthController.login);

router.post("/register", AuthController.register);

router.post("/logout", AuthController.logout);

router.get("/me", AuthController.getProfile);

export default router;
