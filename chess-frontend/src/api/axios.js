import axios, { mergeConfig } from "axios";
import { toast } from "react-hot-toast";

const api = axios.create({
    baseURL: "https://chessproapi.rishikpuneetm.xyz",
    withCredentials: true,
});

// attach access token to every request

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("accessToken");
    if (token) config.headers["Authorization"] = `Bearer ${token}`;
    return config;
});

// on 401, try refreshing and retry the ewquest once and get new access token from the backend

api.interceptors.response.use(
    (res) => res,
    async (error) => {
        const { response, config } = error;

        // 1) If it’s not a 401, just pass it on:
        if (!response || response.status !== 401) {
            return Promise.reject(error);
        }

        // 2) If we've already retried, or if this is the refresh endpoint
        //    OR if it’s the initial profile fetch, bail out:
        const url = config.url || "";
        if (
            config._retry ||
            url.includes("/auth/refresh") ||
            url.includes("/auth/profile")
        ) {
            // If the refresh call itself or profile call 401’d, force logout
            toast.error("Session expired. Please log in again.");
            window.location.href = "/login";
            return Promise.reject(error);
        }

        // 3) Mark and attempt one refresh
        config._retry = true;
        try {
            const { data } = await axios.post(
                "https://chessproapi.rishikpuneetm.xyz/auth/refresh",
                {},
                { withCredentials: true }
            );
            const newToken = data.accessToken;
            if (!newToken) throw new Error("No token in refresh response");

            localStorage.setItem("accessToken", newToken);
            api.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;

            config.headers["Authorization"] = `Bearer ${newToken}`;
            return api(config);
        } catch (refreshError) {
            toast.error("Session expired. Please log in again.");
            window.location.href = "/login";
            return Promise.reject(refreshError);
        }
    }
);
  

export default api;
