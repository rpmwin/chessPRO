import jwt from "jsonwebtoken";
import { User } from "../models/User.model.js";


export default async function authMiddleware(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Missing token" });
    }

    const token = auth.split(" ")[1];
    try {
        const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        const user = await User.findById(payload.sub);
        if (!user) throw new Error();
        req.user = user;
        next();
    } catch {
        res.status(401).json({ message: "Invalid or expired token" });
    }
}