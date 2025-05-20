import React from "react";
import AuthForm from "./AuthForm.jsx";
import { useAuth } from "../context/AuthContext.jsx";

function Login() {
    const { login } = useAuth();

    const googleAuth = () => {
        window.location.href = "http://localhost:5000/auth/google";
    };

    return (
        <div>
            <AuthForm submitLabel="Log IN" onSubmit={login} />
            <div className="text-center">
                <button
                    onClick={googleAuth}
                    className="mt-4 p-2 border rounded-xl"
                >
                    Log in with Google
                </button>
            </div>
        </div>
    );
}

export default Login;
