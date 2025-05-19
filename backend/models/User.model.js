import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            trim: true,
            unique: true,
        },
        password: {
            type: String,
        },
        googleId: {
            type: String,
            unique: true,
            sparse: true,
        },
        avatarUrl: {
            type: String,
        },
        name: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

export const User = mongoose.model("User", UserSchema);
