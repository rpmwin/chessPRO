import dotenv from "dotenv";
dotenv.config(); // Load environment variables first, at the very top

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectdb from "./db/connectDB.js";
import authRoutes from "./routes/userAuth.route.js";
import chesscomRoutes from "./routes/chesscom.routes.js";

// // Now you can access process.env variables because dotenv is configured at the top
// console.log(process.env.JWT_ACCESS_SECRET); // Accessing env vars here should work now
// console.log(process.env.JWT_REFRESH_SECRET);

const app = express();

connectdb();

app.use(express.json());
app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true,
    })
);
app.use(cookieParser());

app.use("/auth", authRoutes);
app.use("/chesscom", chesscomRoutes);

// Catch-all for 404s
app.use((req, res, next) => {
    res.status(404).json({ error: true, message: "Not Found" });
});

// Error-handling middleware — **This goes last**!
app.use((err, req, res, next) => {
    // Log the full error for your diagnostics
    console.error(err);

    // Send a clean JSON response
    const status = err.status || 500;
    res.status(status).json({
        error: true,
        message: err.message || "Internal Server Error",
    });
});

// Basic testing
app.get("/", (req, res) => {
    res.send("chess backend is running");
});

app.listen(process.env.PORT || 5000, () => {
    console.log(`server is running on port ${process.env.PORT}`);
});
