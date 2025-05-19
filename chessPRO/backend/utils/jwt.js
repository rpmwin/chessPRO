import jwt from "jsonwebtoken";

const { JWT_ACCESS_SESCRET, JWT_REFRESH_SECRET } = process.env;

export const generateAccessToken = (user) => {
    const payload = {
        sub: user._id,
        email: user.email,
    };

    return jwt.sign(payload, JWT_ACCESS_SESCRET, {
        expiresIn: "15m",
    });
};

export const generateRefreshToken = (user) => {
    return jwt.sign(
        {
            sub: user._id,
        },
        JWT_REFRESH_SECRET,
        {
            expiresIn: "7d",
        }
    );
};

export const verifyAccessToken = (token) => {
    return jwt.verify(token, JWT_ACCESS_SESCRET);
};

export const verifyRefreshToken = (token) => {
    return jwt.verify(token, JWT_REFRESH_SECRET);
};
