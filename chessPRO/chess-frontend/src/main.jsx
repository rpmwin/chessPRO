// src/main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";

import Signup from "./components/Signup.jsx";
import Login from "./components/Login.jsx";
import OAuthSuccess from "./components/OAuthSuccess.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import SearchPage from "./components/SearchPage.jsx";
import ProfilePage from "./components/ProfilePage.jsx";
import GamesPage from "./components/GamesPage.jsx";
import "./index.css";
import EngineTest from "./components/EngineTest.jsx";
import AnalysisPage from "./components/Analysis.jsx";
import Home from "./components/Home.jsx";
("./components/Analysis.jsx");

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <Toaster position="top-right" />
                <Routes>
                    {/* Public routes */}
                    <Route path="/" element = {<Home />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/oauth-success" element={<OAuthSuccess />} />
                    <Route path="/analysis" element={<AnalysisPage />} />

                    {/* Protected routes */}
                    <Route element={<ProtectedRoute />}>
                        <Route element={<App />}>
                            <Route path="/search" element={<SearchPage />} />
                            <Route
                                path="/profile/:username"
                                element={<ProfilePage />}
                            />
                            <Route
                                path="/profile/:username/games"
                                element={<GamesPage />}
                            />
                        </Route>
                    </Route>

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    </StrictMode>
);
