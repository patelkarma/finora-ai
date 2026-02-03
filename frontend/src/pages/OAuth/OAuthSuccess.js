import { useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

export default function OAuthSuccess() {
    const navigate = useNavigate();
    const { loginWithToken } = useContext(AuthContext);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);

        const token = params.get("token");
        const email = params.get("email");

        if (!token) {
            navigate("/login?oauth_error=true");
            return;
        }

        // save token
        localStorage.setItem("token", token);
        if (email) localStorage.setItem("oauth_email", decodeURIComponent(email));

        // fetch /auth/me to load user & salary
        loginWithToken(token)
            .then((user) => {

                // If salary is missing → redirect to salary form
                if (!user.salary) {
                    navigate("/salary");
                    return;
                }

                // Otherwise → go to dashboard
                navigate("/dashboard");
            })
            .catch((err) => {
                console.error("OAuth login failed:", err);
                navigate("/login?oauth_error=true");
            });

    }, [loginWithToken, navigate]);

    return <div>Logging you in...</div>;
}
