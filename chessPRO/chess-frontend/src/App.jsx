import { useState } from "react";
import "./App.css";
import { Outlet } from "react-router-dom";
import NavBar from "./components/NavBar";

function App() {
    const [count, setCount] = useState(0);

    return (
        <>
            <div className="min-h-screen bg-gray-800 text-gray-100 w-screen" >
                <NavBar />
                <main className="py-6">
                    <Outlet />
                </main>
            </div>
        </>
    );
}

export default App;
