// import { useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import { useContext } from "react";
// import { AuthContext } from "../../context/AuthContext";

// export default function OAuthSuccess() {
//     const navigate = useNavigate();
//     const { loginWithToken } = useContext(AuthContext);

//     useEffect(() => {
//         const params = new URLSearchParams(window.location.search);
//         const token = params.get("token");
//         const email = params.get("email");

//         if (email) {
//             localStorage.setItem("oauth_email", email);
//         }

//         if (token) {
//             loginWithToken(token);
//             navigate("/dashboard", { replace: true });
//         } else {
//             navigate("/login");
//         }
//     }, []);


//     return <div>Logging you in...</div>;
// }

// import { useEffect, useContext } from "react";
// import { useNavigate } from "react-router-dom";
// import { AuthContext } from "../../context/AuthContext";

// export default function OAuthSuccess() {
//     const navigate = useNavigate();
//     const { loginWithToken } = useContext(AuthContext);

//     useEffect(() => {
//         (async () => {
//             const params = new URLSearchParams(window.location.search);
//             const token = params.get("token");
//             const email = params.get("email");

//             if (!token) {
//                 navigate("/login?oauth_error=true");
//                 return;
//             }

//             // Save email temporarily only for UI autofill (optional)
//             if (email) localStorage.setItem("oauth_email", email);

//             try {
//                 // IMPORTANT: wait for loginWithToken to complete
//                 await loginWithToken(token);
//                 // Now redirect to dashboard (or any post-login page)
//                 navigate("/dashboard");
//             } catch (e) {
//                 console.error("OAuth login failed:", e);
//                 // If something failed, go to login with an error flag
//                 navigate("/login?oauth_error=true");
//             }
//         })();
//     }, [loginWithToken, navigate]);

//     return <div>Logging you in...</div>;
// }
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
