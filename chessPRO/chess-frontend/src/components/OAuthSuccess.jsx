import React, { useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/axios.js";

function OAuthSuccess() {
    const { setUser } = useAuth();

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get("access_token");
        if (token) {
            localStorage.setItem("accessToken", token);
            api.get("/auth/me").then((res) => setUser(res.data));
            window.location.href = "/search";
        }
    }, []);

    return <p className="text-center mt-16">Logging you in...</p>;
}

export default OAuthSuccess;
