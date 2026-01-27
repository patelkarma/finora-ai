import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./SetPassword.css";


const SetPassword = () => {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!token) {
            setError("Invalid or expired password setup link");
            return;
        }


        if (!password || password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        try {
            await axios.post(
                "https://finora-backend-rnd0.onrender.com/api/auth/set-password",
                { password },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            setSuccess("Password set successfully. Please login.");
            setError("");

            setTimeout(() => navigate("/login"), 1500);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || "Failed to set password");
        }
    };


    return (
        <div className="set-password-container">
            <div className="set-password-card">
                <h2>Set Your Password</h2>

                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        placeholder="Enter new password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    <button type="submit">Save Password</button>
                </form>

                {error && <p style={{ color: "red" }}>{error}</p>}
                {success && <p style={{ color: "green" }}>{success}</p>}
            </div>
        </div >
    );
};

export default SetPassword;
