import React from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { Navigate, Outlet } from "react-router-dom";

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                Loading…
            </div>
        );
    }
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    // When we have a user, render whatever child routes are nested
    return <Outlet />;
}

export default ProtectedRoute;
