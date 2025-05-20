import {
    Children,
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";
import api from "../api/axios.js";
import { toast } from "react-hot-toast";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);

    useEffect(() => {
        api.get("/auth/profile")
            .then((res) => {
                setUser(res.data);
            })
            .catch(() => setUser(null));
    }, []);

    const signup = async ({ email, password, name }) => {
        const { data } = await api.post("/auth/signup", {
            email,
            password,
            name,
        });
        localStorage.setItem("accessToken", data.accessToken);
        setUser(data.user);
        toast.success("Signed up successfully!");
    };

    const login = async ({ email, password }) => {
        const { data } = await api.post("/auth/login", { email, password });
        localStorage.setItem("accessToken", data.accessToken);
        setUser(data.user);
        toast.success("Logged in successfully!");
    };

    const logout = () => {
        localStorage.removeItem("accessToken");
        api.post("/logout");
        setUser(null);
        toast("Logged out");
    };

    return (
        <AuthContext.Provider value={{ user, setUser, signup, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
