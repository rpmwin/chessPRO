import { useState } from "react";

export default function AuthForm({ onSubmit, submitLabel }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({ email, password, name });
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-4 p-4 max-w-md mx-auto"
        >
            {submitLabel === "Sign Up" && (
                <input
                    type="text"
                    placeholder="Name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2 border rounded"
                />
            )}
            <input
                type="email"
                placeholder="Email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border rounded"
            />
            <input
                type="password"
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border rounded"
            />
            <button
                type="submit"
                className="w-full p-2 bg-blue-600 text-white rounded"
            >
                {submitLabel}
            </button>
        </form>
    );
}
