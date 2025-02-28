// bot-detection-pow.mjs
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import crypto from "crypto";

const app = express();
const PORT = 3000;
app.use(cors());
app.use(express.json());

const HARD_TIMEOUT = 3000; // 3 seconds
const botScoreThreshold = 70;

const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // Allow 100 requests per minute per IP
    message: { error: "Too many requests, please try again later." },
});

app.use(limiter);

function generateEasyChallenge() {
    const rand = Math.floor(Math.random() * 3);
    switch (rand) {
        case 0:
            let add1 = Math.floor(Math.random() * 10) + 1;
            let add2 = Math.floor(Math.random() * 10) + 1;
            return {
                challenge: `What is ${add1} + ${add2}?`,
                solution: add1 + add2,
            };
        case 1:
            let sub1 = Math.floor(Math.random() * 10) + 1;
            let sub2 = Math.floor(Math.random() * 10) + 1;
            return {
                challenge: `What is ${sub1} - ${sub2}?`,
                solution: sub1 - sub2,
            };
        case 2:
            let mul1 = Math.floor(Math.random() * 10) + 1;
            let mul2 = Math.floor(Math.random() * 10) + 1;
            return {
                challenge: `What is ${mul1} x ${mul2}?`,
                solution: mul1 * mul2,
            };
    }
}

function generateHardChallenge() {
    const challengeString = crypto.randomBytes(4).toString("hex");
    const targetHash = crypto.createHash("sha256").update(challengeString).digest("hex");
    let maskedPrefix = targetHash.substring(0, 4).split("");
    const maskCount = Math.floor(Math.random() * 3) + 1;
    const maskedPositions = new Set();

    while (maskedPositions.size < maskCount) {
        maskedPositions.add(Math.floor(Math.random() * 4));
    }

    maskedPositions.forEach((pos) => (maskedPrefix[pos] = "?"));
    maskedPrefix = maskedPrefix.join("");

    return {
        challenge: `Find an input X such that SHA-256(X) starts with '${maskedPrefix}'`,
        original: challengeString,
        maskedPrefix: maskedPrefix,
        timestamp: Date.now(),
    };
}

function calculateBotScore(behaviorData) {
    let score = 0;
    if ((behaviorData.mouseMovements?.length || 0) < 10) score += 20;
    if (behaviorData.honeypotTriggered) score += 50;
    if ((behaviorData.typingSpeed || 0) > 300) score += 20;
    if (behaviorData.isHeadless) score += 40;
    return score;
}

app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.post("/api/detect", (req, res) => {
    const behaviorData = req.body || {};
    console.log(behaviorData);
    let botScore = calculateBotScore(behaviorData);
    console.log("Final Bot Score:", botScore);
    const isBot = botScore >= botScoreThreshold;
    res.json({ botScore, isBot });
});

app.post("/generate-challenge", (req, res) => {
    const { botScore } = req.body;
    if (40 <= botScore && botScore < 70) {
        const challenge = generateEasyChallenge();
        res.json({ type: "easy", question: challenge.challenge, answer: challenge.solution });
    } else if (botScore > 70) {
        const challenge = generateHardChallenge();
        res.json({
            type: "hard",
            challenge: challenge.challenge,
            original: challenge.original,
            targetPrefix: challenge.maskedPrefix,
            timestamp: challenge.timestamp,
        });
    }
});

app.post("/verify-challenge", (req, res) => {
    const { type, response, targetPrefix, timestamp } = req.body;
    const currentTime = Date.now();

    if (type === "easy" && parseInt(response) === original) {
        return res.json({ success: true, message: "Human verified!" });
    }

    if (type === "hard" && currentTime - timestamp <= HARD_TIMEOUT) {
        const hash = crypto.createHash("sha256").update(response).digest("hex");

        const filledPrefix = targetPrefix
            .split("")
            .map((ch, idx) => (ch === "?" ? hash[idx] : ch))
            .join("");

        console.log("HASH 🔥:", hash);
        console.log("PREFIX 🔥:", targetPrefix);
        console.log("FILLED 🔥:", filledPrefix);

        if (hash.startsWith(filledPrefix)) {
            return res.json({ success: true, message: "PoW validated within time limit!" });
        }
    }

    res.json({ success: false, message: "Challenge failed!" });
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
