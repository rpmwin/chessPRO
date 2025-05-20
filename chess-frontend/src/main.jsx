import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import Signup from "./components/Signup.jsx";
import Login from "./components/Login.jsx";
import OAuthSuccess from "./components/OAuthSuccess.jsx";

const AppRoutes = () => {
    const { user } = useAuth();
    return (
        <Routes>
            <Route path="/" element={<App />}>
                <Route path="signup" element={<Signup />} />
                <Route path="login" element={<Login />} />
                <Route path="oauth-success" element={<OAuthSuccess />} />
            </Route>
        </Routes>
    );
};

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <Toaster position="top-right" />
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    </StrictMode>
);
