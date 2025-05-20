import jwt from "jsonwebtoken";


export const generateAccessToken = (user) => {
    console.log(process.env.PORT);
    console.log(`here inside ${process.env.JWT_ACCESS_SECRET}`);
    const payload = {
        sub: user._id,
        email: user.email,
    };

    return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
        expiresIn: "15m",
    });
};

export const generateRefreshToken = (user) => {
    return jwt.sign(
        {
            sub: user._id,
        },
        process.env.JWT_REFRESH_SECRET,
        {
            expiresIn: "7d",
        }
    );
};

export const verifyAccessToken = (token) => {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
};

export const verifyRefreshToken = (token) => {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};
