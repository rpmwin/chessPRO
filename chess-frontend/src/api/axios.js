import axios, { mergeConfig } from "axios";
import { toast } from "react-hot-toast";

const api = axios.create({
    baseURL: "http://localhost:5000",
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
    async (err) => {
        const originalReq = err.config;

        if (err.response?.status === 401 && !originalReq._retry) {
            originalReq._retry = true;
            try {
            } catch (_err) {
                toast.error("Session expired. Please log in again");
                window.location.href = "/login";
            }
        }
        return Promise.reject(err);
    }
);

export default api;
