import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

const SearchPage = () => {
    const [username, setUsername] = useState("");
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!username.trim()) {
            toast.error("Please enter a Chess.com Username");
            return;
        }
        navigate(`/profile/${encodeURIComponent(username.trim())}`);
    };

    return (
        <div className="flex flex-col items-center mt-20">
            <h1 className="text-3xl font-bold mb-6">
                Find a Chess.com Profile
            </h1>
            <form onSubmit={handleSubmit} className="flex space-x-2">
                <input
                    type="text"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="p-2 border rounded w-64"
                />
                <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                    Search
                </button>
            </form>
        </div>
    );
};

export default SearchPage;
