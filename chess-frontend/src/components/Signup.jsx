import { useAuth } from "../context/AuthContext.jsx";
import AuthForm from "./AuthForm.jsx";

export default function Signup() {
    const { signup } = useAuth();

    return (
        <>
            <AuthForm submitLabel="Sign Up" onSubmit={signup} />
        </>
    );
}
