import bcrypt from "bcrypt";
import axios from "axios";
import { User } from "../models/User.model.js";
import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
} from "../utils/jwt.js";
import googleClient from "../config/googleClient.js";
import mongoose from "mongoose";
import { OAuth2Client } from "google-auth-library";

export const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/refresh",
};

export const signup = async (req, res, next) => {
    try {
        console.log(process.env.PORT);
        const { email, password, name } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Please provide all the fields",
            });
        }

        if (await User.findOne({ email })) {
            return res.status(409).json({
                message: "Email aldready in use",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await User.create({
            email,
            password: hashedPassword,
            name,
        });

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        res.cookie("jid", refreshToken, COOKIE_OPTIONS).json({
            user,
            accessToken,
        });
    } catch (err) {
        next(err);
    }
};

export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                message: "Please provide all the fields",
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ message: "Invalid Credentials" });
        }

        const valid = await bcrypt.compare(password, user.password);

        if (!valid) {
            return res.status(401).json({
                message: "Invalid credentials",
            });
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        res.cookie("jid", refreshToken, COOKIE_OPTIONS).json({
            user,
            accessToken,
        });
    } catch (err) {
        next(err);
    }
};

// google oauth redirect

export const googleRedirect = (req, res) => {
    const oauth2Client = new OAuth2Client({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: process.env.GOOGLE_REDIRECT_URI,
    });

    const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: ["profile", "email"],
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    });

    res.redirect(url);
};

// google Oauth : callback

export const googleCallback = async (req, res, next) => {
    try {
        const { code } = req.query;

        const oauth2Client = new OAuth2Client({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            redirectUri: process.env.GOOGLE_REDIRECT_URI,
        });

        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        const { data } = await axios.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            {
                headers: {
                    Authorization: `Bearer ${tokens.access_token}`,
                },
            }
        );

        let user = await User.findOne({ googleId: data.id });

        if (!user) {
            user = await User.create({
                googleId: data.id, // not data.Id — watch case!
                email: data.email,
                name: data.name,
                avatarUrl: data.picture,
            });
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        res.cookie("jid", refreshToken, COOKIE_OPTIONS).redirect(
            `${process.env.CLIENT_HOME_URL}/oauth-success?accessToken=${accessToken}`
        );
    } catch (err) {
        console.error("Google OAuth error:", err.response?.data || err.message);
        res.status(500).json({ message: "Google authentication failed" });
    }
};

// refresh access token
export const refreshToken = async (req, res, next) => {
    try {
        const token = req.cookies.jid;

        if (!token) {
            return res.status(401).json({
                message: "No token provided",
            });
        }

        const payload = verifyRefreshToken(token);
        const user = await User.findById(payload.sub);

        if (!user) {
            throw new Error("User not found");
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // res.json({ accessToken });
        res.cookie("jid", refreshToken, COOKIE_OPTIONS).json({
            accessToken,
        });
    } catch (error) {
        res.status(401).json({
            message: "Invalid refresh token",
        });
    }
};

// logout

export const logout = (req, res) => {
    res.clearCookie("jid", { path: "/refresh" }).json({
        message: "Logged Out",
    });
};
