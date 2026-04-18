require("dotenv").config();

const express = require("express");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk");
const {
    extractionRequestSchema,
    extractedProfileSchema,
    messageRequestSchema,
    chatRequestSchema,
} = require("./schema");

const app = express();
const port = Number(process.env.PORT || 4000);

const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
];

app.use(cors({
    origin(origin, cb) {
        if (!origin || allowedOrigins.includes(origin)) {
            cb(null, true);
            return;
        }
        cb(new Error("Origin not allowed by CORS"));
    },
}));
app.use(express.json({ limit: "2mb" }));

const anthropicApiKey = process.env.CLAUDE_API_KEY;
const anthropic = anthropicApiKey ? new Anthropic({ apiKey: anthropicApiKey }) : null;

function extractJsonBlock(text) {
    const fenced = text.match(/```json\s*([\s\S]*?)```/i);
    if (fenced && fenced[1]) return fenced[1].trim();
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first >= 0 && last > first) return text.slice(first, last + 1);
    return text.trim();
}

async function callClaude({ system, messages, maxTokens = 1000 }) {
    if (!anthropic) {
        throw new Error("Missing CLAUDE_API_KEY on backend.");
    }

    const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: maxTokens,
        system,
        messages,
    });

    return response.content?.[0]?.text || "";
}

app.get("/health", (_req, res) => {
    res.json({ ok: true });
});

app.post("/api/ai/chat", async (req, res) => {
    try {
        const parsed = chatRequestSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: "Invalid chat payload", details: parsed.error.flatten() });
        }

        const { system, messages, maxTokens } = parsed.data;
        const text = await callClaude({ system, messages, maxTokens });
        return res.json({ text });
    } catch (err) {
        return res.status(500).json({ error: err.message || "AI chat failed" });
    }
});

app.post("/api/profile/extract", async (req, res) => {
    try {
        const parsed = extractionRequestSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: "Invalid extraction payload", details: parsed.error.flatten() });
        }

        const p = parsed.data.profileInput;
        const profileText = [
            p.fullName ? `Preferred name: ${p.fullName}` : "",
            p.location ? `Current location: ${p.location}` : "",
            p.targetJobTitles ? `Target job titles: ${p.targetJobTitles}` : "",
            p.employmentTypes.length ? `Preferred employment types: ${p.employmentTypes.join(", ")}` : "",
            p.yearsOfExperience ? `Years of experience: ${p.yearsOfExperience}` : "",
            `Open to relocation: ${p.openToRelocation ? "yes" : "no"}`,
            p.targetCompanies.length ? `Target companies: ${p.targetCompanies.join(", ")}` : "",
            p.linkedInUrl ? `LinkedIn URL: ${p.linkedInUrl}` : "",
            p.portfolioUrl ? `Portfolio URL: ${p.portfolioUrl}` : "",
            p.githubUrl ? `GitHub URL: ${p.githubUrl}` : "",
            p.otherLink ? `Other link: ${p.otherLink}` : "",
            p.resumeFileName ? `Uploaded resume file name: ${p.resumeFileName}` : "",
            "",
            "Resume / background:",
            p.resume || "No pasted resume text provided.",
        ]
            .filter(Boolean)
            .join("\n");

        const system = [
            "You are a career profile extraction engine.",
            "Return ONLY valid JSON with this exact shape:",
            '{"name":"","title":"","skills":[],"experience":[{"role":"","company":"","duration":""}],"education":[{"school":"","degree":"","year":""}],"interests":[],"location":""}',
            "Do not include markdown fences.",
            "If data is missing, use empty strings/empty arrays.",
        ].join("\n");

        const raw = await callClaude({
            system,
            messages: [{ role: "user", content: profileText }],
            maxTokens: 1200,
        });

        const jsonText = extractJsonBlock(raw);
        const parsedJson = JSON.parse(jsonText);
        const validated = extractedProfileSchema.parse(parsedJson);
        return res.json({ profile: validated });
    } catch (err) {
        return res.status(500).json({ error: err.message || "Profile extraction failed" });
    }
});

app.post("/api/message/generate", async (req, res) => {
    try {
        const parsed = messageRequestSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: "Invalid message payload", details: parsed.error.flatten() });
        }

        const { profile, contact, platform, styleHint } = parsed.data;
        const limit = platform === "linkedin" ? "STRICTLY under 300 characters." : "Email format, 180-280 words.";

        const recipientType = (contact.type || "").toLowerCase();
        let recipientIntent = "Keep the message conversational, specific, and respectful.";
        if (recipientType === "alumni") {
            recipientIntent = "Use a warm and personal tone. Find shared background/common ground, show genuine admiration, and ask for one practical piece of advice.";
        } else if (recipientType === "recent hire") {
            recipientIntent = "Ask about interview and onboarding experience, what helped most in the first 90 days, and one preparation tip.";
        } else if (recipientType === "recruiter") {
            recipientIntent = "Use a professional and direct tone. Highlight fit signals, role alignment, and ask the clearest next step for formal consideration.";
        } else if (recipientType === "team lead" || recipientType === "hiring manager") {
            recipientIntent = "Use a professional tone. Focus on learning from their leadership perspective, show relevance to their team, and ask for a short 15-20 minute conversation.";
        }

        const system = [
            "You are an expert networking outreach writer.",
            `Write a ${styleHint} ${platform} message.`,
            "Be specific, natural, and personalized. No em dashes.",
            "Do not invent facts not present in sender or recipient context.",
            `Recipient-type strategy: ${recipientIntent}`,
            platform === "email"
                ? "For email, make it compelling and relatable for busy professionals: (1) warm context opener, (2) concise credibility signal with one concrete impact/skill, (3) clear reason this recipient is relevant, (4) a specific and low-friction ask (15-20 minute coffee chat or one practical suggestion), (5) polite close. Keep confident but humble."
                : "",
            platform === "email"
                ? "The email should feel human and useful, not generic. Favor concrete details over buzzwords."
                : "",
            "Personalization rule: reference at least one recipient-profile detail from their role, bio, school, or tenure when available.",
            limit,
        ].join("\n");

        const user = [
            `SENDER: ${profile.name}, ${profile.title}.`,
            `Skills: ${(profile.skills || []).join(", ")}.`,
            `Education: ${(profile.education || []).map((e) => `${e.degree}, ${e.school}`).join("; ")}.`,
            `Location: ${profile.location}.`,
            `RECIPIENT: ${contact.name}, ${contact.role} at ${contact.company}.`,
            `Recipient type: ${contact.type}. School: ${contact.school}.`,
            `Bio: ${contact.bio}.`,
            `Platform: ${platform}.`,
        ].join("\n");

        const text = await callClaude({
            system,
            messages: [{ role: "user", content: user }],
            maxTokens: platform === "linkedin" ? 200 : 450,
        });

        return res.json({ text: text.trim() });
    } catch (err) {
        return res.status(500).json({ error: err.message || "Message generation failed" });
    }
});

app.listen(port, () => {
    console.log(`CareerCompass API listening on http://localhost:${port}`);
});
