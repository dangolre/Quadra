const { z } = require("zod");

const contactSchema = z.object({
    name: z.string().min(1),
    role: z.string().optional().default(""),
    company: z.string().optional().default(""),
    type: z.string().optional().default(""),
    school: z.string().optional().default(""),
    bio: z.string().optional().default(""),
});

const profileInputSchema = z.object({
    resume: z.string().optional().default(""),
    resumeFileName: z.string().optional().default(""),
    linkedInUrl: z.string().optional().default(""),
    portfolioUrl: z.string().optional().default(""),
    githubUrl: z.string().optional().default(""),
    otherLink: z.string().optional().default(""),
    fullName: z.string().optional().default(""),
    location: z.string().optional().default(""),
    targetJobTitles: z.string().optional().default(""),
    employmentTypes: z.array(z.string()).optional().default([]),
    openToRelocation: z.boolean().optional().default(false),
    yearsOfExperience: z.string().optional().default(""),
    targetCompanies: z.array(z.string()).optional().default([]),
});

const extractionRequestSchema = z.object({
    profileInput: profileInputSchema,
});

const extractedProfileSchema = z.object({
    name: z.string(),
    title: z.string(),
    skills: z.array(z.string()),
    experience: z.array(z.object({
        role: z.string(),
        company: z.string(),
        duration: z.string(),
    })).default([]),
    education: z.array(z.object({
        school: z.string(),
        degree: z.string(),
        year: z.string(),
    })).default([]),
    interests: z.array(z.string()).default([]),
    location: z.string(),
});

const messageRequestSchema = z.object({
    profile: extractedProfileSchema,
    contact: contactSchema,
    platform: z.enum(["linkedin", "email"]),
    styleHint: z.string().optional().default("conversational"),
});

const chatRequestSchema = z.object({
    system: z.string().min(1),
    messages: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1),
    })).min(1),
    maxTokens: z.number().int().positive().max(2000).optional().default(1000),
});

module.exports = {
    extractionRequestSchema,
    extractedProfileSchema,
    messageRequestSchema,
    chatRequestSchema,
};
