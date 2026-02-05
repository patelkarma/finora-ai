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

        loginWithToken(token).then((user) => {

            // 🚨 GOOGLE USER WITHOUT PASSWORD → GO SET PASSWORD
            if (user.oauthUser && !user.passwordSet) {
                navigate(`/set-password?token=${token}`);
                return;
            }

            // salary check
            if (!user.salary) {
                navigate("/salary");
                return;
            }

            navigate("/dashboard");

        }).catch(() => {
            navigate("/login?oauth_error=true");
        });

    }, [loginWithToken, navigate]);

    return <div>Logging you in...</div>;
}
