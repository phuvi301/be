import express from "express";
import AuthController from "../controllers/AuthController.js";
const router = express.Router();

router.post("/signin", AuthController.login);

router.post("/register", AuthController.register);

router.post("/signout", AuthController.logout);

router.post("/refresh", AuthController.getProfile);

export default router;
