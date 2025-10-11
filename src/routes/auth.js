import express from "express";
import AuthController from "../controllers/AuthController.js";
const router = express.Router();

router.post("/signin", AuthController.signin);

router.post("/register", AuthController.register);

router.post("/signout", AuthController.signout);

router.post("/refresh", AuthController.refresh);

export default router;
