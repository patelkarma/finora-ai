import React, { useEffect, useState, useContext, useRef } from "react";
import { AuthContext } from "../../context/AuthContext";
import aiService from "../../services/aiService";
import Loader from "../../components/Loader/Loader";
import Button from "../../components/Button/Button";
import "./AIInsights.css";

const POLL_MS = 60 * 1000; // poll every 60s

const AIInsights = () => {
    const { user } = useContext(AuthContext);
    const [insights, setInsights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const prevIds = useRef(new Set());

    const fetchInsights = async (showLoader = true) => {
        if (!user) return;
        if (showLoader) setLoading(true);
        try {
            const data = await aiService.fetchInsights(user.id);
            console.log("🔍 Insights from backend:", data);
            const list = Array.isArray(data) ? data : [data].filter(Boolean);
            setInsights(list);

            // Notify for new insights
            const newOnes = list.filter((i) => !prevIds.current.has(i.id));
            if (newOnes.length > 0) newOnes.forEach((i) => notifyUser(i));
            prevIds.current = new Set(list.map((d) => d.id));
        } catch (e) {
            console.error("Error fetching insights:", e);
        } finally {
            if (showLoader) setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchInsights();
        const interval = setInterval(fetchInsights, POLL_MS);
        return () => clearInterval(interval);
    }, [user]);

    const generateNow = async () => {
        if (!user) return;
        setRefreshing(true);
        try {
            const res = await aiService.generateInsight(user.id);
            console.log("✅ New insight generated:", res);
            alert("✨ New insight generated successfully!");
            await fetchInsights(false); // refresh without full-page loader
        } catch (e) {
            console.error("Error generating insight:", e);
            alert("⚠️ Failed to generate insight. Check backend logs or your Hugging Face API key.");
        } finally {
            setRefreshing(false);
        }
    };

    const notifyUser = (insight) => {
        if (!("Notification" in window)) return;
        const text = insight?.message ?? insight?.content ?? "";
        const body = text.slice ? text.slice(0, 200) : String(text).substring(0, 200);
        if (Notification.permission === "granted") {
            new Notification("Finance Insight", { body });
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then((permission) => {
                if (permission === "granted") new Notification("Finance Insight", { body });
            });
        }
    };

    const createdText = (timestamp) => {
        if (!timestamp || isNaN(new Date(timestamp))) return "Unknown Date";
        return new Date(timestamp).toLocaleString();
    };

    return (
        <div className="ai-insights-page">
            <h1>AI Insights</h1>
            
            <p>Get automated spending & savings suggestions from AI.</p>

            <Button onClick={generateNow} variant="primary" disabled={refreshing}>
                {refreshing ? "Generating..." : "Generate Insight Now"}
            </Button>

            {loading ? (
                <Loader message="Loading insights..." />
            ) : (
                <div className="insights-list mt-3">
                    {insights.length === 0 ? (
                        <div className="insights-yet">
                        <p>No insights yet.</p>
                        </div>
                    ) : (
                        insights.map((i) => (
                            <div key={i.id} className={`insight-card ${i.isRead || i.read ? "read" : "unread"}`}>
                                <div className="insight-header">
                                    <small>{createdText(i.createdAt)}</small>
                                </div>
                                <div className="insight-body">
                                    <pre style={{ whiteSpace: "pre-wrap" }}>{i.message ?? i.content ?? ""}</pre>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default AIInsights;

