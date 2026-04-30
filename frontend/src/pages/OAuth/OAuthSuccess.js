import { useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

export default function OAuthSuccess() {
    const navigate = useNavigate();
    const { loginWithToken } = useContext(AuthContext);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");

        if (!token) {
            navigate("/login?oauth_error=true");
            return;
        }

        loginWithToken(token).then(() => {
            // Always land on /dashboard. The dashboard's own welcome
            // flow handles users who haven't entered any income yet —
            // routing OAuth users to /salary while email-login users
            // go to /dashboard was an inconsistency that made it look
            // like login was broken ("why am I on profile?").
            navigate("/dashboard");
        }).catch(() => {
            navigate("/login?oauth_error=true");
        });

    }, [loginWithToken, navigate]);

    return <div>Logging you in...</div>;
}
