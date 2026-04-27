import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { Groq } from "groq-sdk/client.js";

dotenv.config({ path: './config.env' })

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// health check
app.get("/", (req, res) => {
    res.send("AI server running 🚀");
});

// AI route
app.post("/api/ai/googleGemini", async (req, res) => {
    const { messages } = req.body;
    try {
        const ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
        });

        const result = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: messages,
        });
        const responseText = result.text;

        if (!responseText) throw new Error("No response from API");


        res.json(responseText);
    } catch (error) {
        console.error("Error:", error.response?.data || error.message);

        res.status(500).json({
            error: "google AI request failed",
            details: error.response?.data || error.message,
        });
    }
});
app.post("/api/ai/groq", async (req, res) => {
    try {
        const { messages } = req.body;
        const client = new Groq({
            apiKey: process.env.GROQ_API_KEY,
            dangerouslyAllowBrowser: true,
        });

        const params = {
            messages,
            model: "openai/gpt-oss-20b",
        };
        const chatCompletion = await client.chat.completions.create(params);
        res.json(chatCompletion)
    } catch (error) {
        console.error("Error:", error.response?.data || error.message);

        res.status(500).json({
            error: "groq AI request failed",
            details: error.response?.data || error.message,
        });
    }
});
app.post("/api/ai/cloudFlare", async (req, res) => {
    try {
        const { messages } = req.body;

        if (!messages) {
            return res.status(400).json({ error: "messages are required" });
        }

        const response = await axios.post(
            `https://api.cloudflare.com/client/v4/accounts/${process.env.ACCOUNT_ID}/ai/run/${process.env.MODEL}`,
            {
                messages,
                max_tokens: 1000,
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.CF_API_TOKEN}`,
                    "Content-Type": "application/json",
                },
            }
        );

        res.json(response.data);
    } catch (error) {
        console.error("Error:", error.response?.data || error.message);

        res.status(500).json({
            error: "Cloudflare AI request failed",
            details: error.response?.data || error.message,
        });
    }
});



// start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});