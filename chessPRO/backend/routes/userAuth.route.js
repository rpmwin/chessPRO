import express from "express";
import {
    googleCallback,
    googleRedirect,
    login,
    logout,
    refreshToken,
    signup,
} from "../controllers/authController.controllers.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);

// google oauth

router.get("/google", googleRedirect);
router.get("/google/callback", googleCallback);

// token management

router.get("/refresh", refreshToken);
router.post("/logout", logout);

router.get("/profile", authMiddleware, (req, res) => {
    res.json(req.user);
});

export default router;
