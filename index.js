import express from "express";
import cors from "cors";

const app = express();
const PORT = 3000;
app.use(cors());
app.use(express.json());

const botScoreThreshold = 70;

const analyzeMouseMovement = (movements = []) => {
    let score = 0;
    let totalDeviation = 0;

    for (let i = 1; i < movements.length; i++) {
        let dx = Math.abs(movements[i].x - movements[i - 1].x);
        let dy = Math.abs(movements[i].y - movements[i - 1].y);
        let distance = Math.sqrt(dx ** 2 + dy ** 2);
        totalDeviation += distance;
    }

    if (totalDeviation < 50) score += 30;
    return score;
};

const calculateBotScore = (behaviorData) => {
    let score = 0;

    if ((behaviorData.mouseMovements?.length || 0) < 10) score += 20;
    if (behaviorData.honeypotTriggered) score += 50;
    if ((behaviorData.typingSpeed || 0) > 300) score += 20;
    if (behaviorData.isHeadless) score += 40;

    return score;
};

const analyzeTypingPattern = (keyIntervals = []) => {
    let score = 0;
    if (keyIntervals.length === 0) return score;

    let maxDiff = Math.max(...keyIntervals) - Math.min(...keyIntervals);
    if (maxDiff < 30) score += 25;

    return score;
};

const detectHeadlessBrowser = (userAgent = "", webdriver = false) => {
    let score = 0;
    if (webdriver || userAgent.includes("HeadlessChrome")) {
        score += 40;
    }
    return score;
};

app.post("/api/detect", (req, res) => {
    const behaviorData = req.body || {};
    let botScore = 0;

    botScore += calculateBotScore(behaviorData);
    botScore += analyzeMouseMovement(behaviorData.mouseMovements || []);
    botScore += analyzeTypingPattern(behaviorData.typingIntervals || []);
    botScore += detectHeadlessBrowser(req.headers["user-agent"] || "", behaviorData.webdriver || false);

    if (behaviorData.honeypotFilled) botScore += 50;

    const isBot = botScore >= botScoreThreshold;
    res.json({ botScore, isBot });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
