const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const cron = require("node-cron");
const dotenv = require("dotenv");
const { google } = require("googleapis");

dotenv.config({ path: path.join(process.cwd(), ".env") });

const app = express();
const PORT = Number(process.env.PORT || 3001);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI || "http://localhost:3001/api/google/oauth/callback";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || "";
const ANTHROPIC_API_KEY =
  process.env.ANTHROPIC_API_KEY ||
  process.env.CLAUDE_API_KEY ||
  process.env.REACT_APP_CLAUDE_API_KEY ||
  "";
const HUNTER_API_KEY =
  process.env.HUNTER_API_KEY || process.env.REACT_APP_HUNTER_API_KEY || "";
const MAX_APPLICATIONS_PER_RUN = Number(process.env.MAX_APPLICATIONS_PER_RUN || 10);
const MAX_OUTREACH_PER_RUN = Number(process.env.MAX_OUTREACH_PER_RUN || 10);
const SESSION_STATE_TTL_MS = 10 * 60 * 1000;
const TIMEZONE = process.env.AUTOMATION_TIMEZONE || "America/Chicago";

const DATA_DIR = path.join(__dirname, "data");
const TOKENS_DIR = path.join(__dirname, "tokens");
const STATE_FILE = path.join(DATA_DIR, "automation-state.json");
const TOKEN_FILE = path.join(TOKENS_DIR, "google-oauth-token.json");

const APPLICATION_QUERY = [
  "newer_than:30d",
  "(",
  'subject:("thank you for applying" OR "application received" OR "application submitted" OR "your application" OR "thanks for applying")',
  "OR",
  "from:(greenhouse.io lever.co workday.com myworkday.com ashbyhq.com icims.com smartrecruiters.com)",
  ")",
  '-subject:("security code" OR "is incomplete" OR "complete your application" OR "finish your application" OR "verify your email" OR "reset your password")',
  "-from:jobs-noreply@linkedin.com",
  "-from:jobalerts-noreply@linkedin.com",
  "-from:noreply@linkedin.com",
  "-from:messaging-digest-noreply@linkedin.com",
].join(" ");

const SHARED_ATS_DOMAINS = new Set([
  "myworkday.com",
  "workday.com",
  "greenhouse.io",
  "us.greenhouse-mail.io",
  "greenhouse-mail.io",
  "lever.co",
  "hire.lever.co",
  "icims.com",
  "talent.icims.com",
  "ashbyhq.com",
  "smartrecruiters.com",
  "linkedin.com",
  "notifications.ukg.net",
  "ukg.net",
  "wizehire.com",
  "wizehiremail.com",
  "indeed.com",
  "indeedemail.com",
  "ziprecruiter.com",
  "glassdoor.com",
]);

function isSharedAtsDomain(domain) {
  if (!domain) return false;
  const lower = domain.toLowerCase();
  for (const shared of SHARED_ATS_DOMAINS) {
    if (lower === shared || lower.endsWith(`.${shared}`)) return true;
  }
  return false;
}

const COMPANY_NOISE_RE = /\b(has been received|have been received|has received|have received|is complete|is incomplete|application received|application submitted|received|incomplete|complete|application|submitted|thank you|thanks)\b\.?/gi;

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
];

const oauthState = new Map();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", FRONTEND_URL);
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: "1mb" }));

function nowIso() {
  return new Date().toISOString();
}

async function ensureDirs() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(TOKENS_DIR, { recursive: true });
}

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

async function getState() {
  return readJson(STATE_FILE, {
    profile: null,
    resumeText: "",
    applications: [],
    pendingOutreach: [],
    outreachLog: [],
    lastSyncAt: null,
    lastRunAt: null,
    lastRunSummary: null,
  });
}

async function updateState(updater) {
  const current = await getState();
  const next = typeof updater === "function" ? await updater(current) : updater;
  await writeJson(STATE_FILE, next);
  return next;
}

function createOAuthClient() {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

async function readToken() {
  return readJson(TOKEN_FILE, null);
}

async function writeToken(tokens) {
  await writeJson(TOKEN_FILE, tokens);
}

async function getAuthorizedClient() {
  const token = await readToken();
  if (!token) return null;
  const client = createOAuthClient();
  client.setCredentials(token);
  client.on("tokens", async (tokens) => {
    const merged = { ...token, ...tokens, refreshedAt: nowIso() };
    await writeToken(merged);
  });
  return client;
}

function gmailClient(auth) {
  return google.gmail({ version: "v1", auth });
}

function chunkBase64(value) {
  return value.match(/.{1,76}/g)?.join("\r\n") || value;
}

function encodeMessage({ to, subject, body, attachment }) {
  let raw;
  if (attachment?.filename && attachment?.content) {
    const boundary = `careercompass_${crypto.randomBytes(12).toString("hex")}`;
    const attachmentBase64 = chunkBase64(
      Buffer.from(attachment.content, "utf8").toString("base64")
    );
    raw = [
      `To: ${to}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: 7bit",
      "",
      body,
      "",
      `--${boundary}`,
      `Content-Type: ${attachment.contentType || "text/plain"}; name="${attachment.filename}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
      "",
      attachmentBase64,
      `--${boundary}--`,
    ].join("\r\n");
  } else {
    raw = [
      `To: ${to}`,
      "Content-Type: text/plain; charset=utf-8",
      "MIME-Version: 1.0",
      `Subject: ${subject}`,
      "",
      body,
    ].join("\r\n");
  }

  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function extractHeader(headers, name) {
  return headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value || "";
}

function normalizeCompanyName(value) {
  if (!value) return "";
  return value
    .replace(/[<>"'()]/g, " ")
    .replace(COMPANY_NOISE_RE, " ")
    .replace(/\b(inc|llc|ltd|corp|corporation|company|co)\b\.?/gi, "")
    .replace(/[.!?,:;]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function parseEmailAddress(value) {
  const match = value.match(/<([^>]+)>/) || value.match(/([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i);
  return match ? match[1] || match[0] : "";
}

function inferCompanyFromText(text) {
  if (!text) return "";
  const patterns = [
    /(?:thank you|thanks)\s+for\s+applying\s+(?:to|with|at)\s+([A-Za-z0-9&.\- ]{2,60}?)(?:\s+(?:has|have)\s+been\s+received|[.!?,;:]|$)/i,
    /your\s+application\s+(?:to|with|at)\s+([A-Za-z0-9&.\- ]{2,60}?)(?:\s+(?:has|have)\s+been\s+received|\s+is\s+(?:complete|incomplete)|[.!?,;:]|$)/i,
    /application\s+(?:received|submitted)\s+(?:for|to|with|at)\s+([A-Za-z0-9&.\- ]{2,60}?)(?:[.!?,;:]|$)/i,
    /(?:position|role|job)\s+at\s+([A-Za-z0-9&.\- ]{2,60}?)(?:[.!?,;:]|$)/i,
    /interest\s+in\s+(?:joining\s+)?([A-Za-z0-9&.\- ]{2,60}?)(?:[.!?,;®!]|$)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const normalized = normalizeCompanyName(match?.[1] || "");
    if (normalized && normalized.length >= 2) return normalized;
  }
  return "";
}

function cleanRole(value) {
  return (value || "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^for\s+/i, "")
    .replace(/\s+(at|with)\s+.+$/i, "")
    .replace(COMPANY_NOISE_RE, " ")
    .replace(/[|:]+$/g, "")
    .replace(/[.!?,;:]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function inferRoleFromText(text) {
  if (!text) return "";
  const patterns = [
    /(?:applying|applied|application|interest)\s+(?:in|for)\s+(?:the\s+)?([A-Za-z0-9&/,+().\- ]{3,80}?)\s+(?:role|position|job|opening|opportunity)/i,
    /(?:role|position|job)\s*:\s*([A-Za-z0-9&/,+().\- ]{3,80}?)(?:[.!?,;:]|$)/i,
    /for\s+the\s+([A-Za-z0-9&/,+().\- ]{3,80}?)\s+(?:role|position|job|opening)/i,
    /for\s+the\s+([A-Za-z0-9&/,+().\- ]{3,80}?)\s+position\s+(?:at|with)/i,
    /applying\s+for\s+(?:the\s+)?([A-Za-z0-9&/,+().\- ]{3,80}?)\s+(?:at|with)/i,
    /received\s+your\s+application\s+for\s+([A-Za-z0-9&/,+().\- ]{3,80}?)(?:\s+(?:at|with)|[.!?,;:]|$)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const role = cleanRole(match?.[1]);
    if (role && role.length >= 3 && !/^(the|a|an)$/i.test(role)) return role;
  }
  return "";
}

function inferDomainFromCompany(company) {
  return company.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com";
}

function normalizeSearchDomain(value) {
  const input = (value || "").trim().toLowerCase();
  if (!input) return "";
  if (input.includes(".")) {
    return input.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  }
  return inferDomainFromCompany(input);
}

function isGenericMailbox(email) {
  return /^(no-?reply|notifications?|jobs?|careers?|talent|hr|recruiting|support|hello|team)@/i.test(email);
}

const JUNK_SUBJECT_RE = /(security code|is incomplete|complete your application|finish your application|verify your email|reset your password|password|unsubscribe|job alert|jobs you may be interested|new jobs for you|recommended jobs)/i;
const JUNK_COMPANY_RE = /^(notifications?|no[\-\s]?reply|jobs?|careers?|team|talent|hr|support|hello|mail|linkedin|greenhouse|lever|workday|icims|ashby|ukg|wizehire|indeed|ziprecruiter|glassdoor|smartrecruiters|role|position|opening|opportunity|fglife|myworkday|therole|theposition|thejob|theopening|theopportunity)$/i;

function inferApplicationFromMessage(message) {
  const payload = message.payload || {};
  const headers = payload.headers || [];
  const from = extractHeader(headers, "From");
  const subject = extractHeader(headers, "Subject");
  const date = extractHeader(headers, "Date");
  const fromEmail = parseEmailAddress(from);
  const fromDomain = fromEmail.split("@")[1] || "";
  const snippet = message.snippet || "";

  if (JUNK_SUBJECT_RE.test(subject)) return null;

  const isValidCompany = (candidate) =>
    candidate &&
    candidate.length >= 2 &&
    !JUNK_COMPANY_RE.test(candidate.replace(/\s+/g, ""));

  const candidates = [
    inferCompanyFromText(subject),
    inferCompanyFromText(snippet),
    !isSharedAtsDomain(fromDomain) ? normalizeCompanyName(fromDomain.split(".")[0]) : "",
  ];
  const company = candidates.find(isValidCompany) || "";

  const role = inferRoleFromText(subject) || inferRoleFromText(snippet);

  if (!company || company.length < 2) return null;

  return {
    id: message.id,
    threadId: message.threadId,
    company,
    role,
    subject,
    snippet,
    from,
    fromEmail,
    fromDomain,
    detectedAt: nowIso(),
    date,
  };
}

function dedupApplications(apps) {
  const byCompany = new Map();
  for (const app of apps) {
    const key = (app.company || "").toLowerCase();
    if (!key) continue;
    const existing = byCompany.get(key);
    const existingTime = existing ? Date.parse(existing.date) || 0 : -1;
    const incomingTime = Date.parse(app.date) || 0;
    if (!existing || incomingTime >= existingTime) byCompany.set(key, app);
  }
  return Array.from(byCompany.values()).sort(
    (a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0)
  );
}

async function listApplicationMessages(auth) {
  const gmail = gmailClient(auth);
  const listResponse = await gmail.users.messages.list({
    userId: "me",
    q: APPLICATION_QUERY,
    maxResults: Math.max(MAX_APPLICATIONS_PER_RUN * 3, 25),
  });

  const messages = listResponse.data.messages || [];
  const detailed = await Promise.all(
    messages.map(async (message) => {
      const full = await gmail.users.messages.get({
        userId: "me",
        id: message.id,
        format: "metadata",
        metadataHeaders: ["From", "Subject", "Date"],
      });
      return full.data;
    })
  );

  return detailed.map(inferApplicationFromMessage).filter(Boolean);
}

async function lookupHunterContacts(company, seedEmail) {
  if (!HUNTER_API_KEY) return [];
  const seedDomain = seedEmail ? seedEmail.split("@")[1] : "";
  const useSeed =
    seedDomain &&
    !isGenericMailbox(seedEmail) &&
    !isSharedAtsDomain(seedDomain);
  const domain = useSeed ? seedDomain : inferDomainFromCompany(company);
  if (!domain || domain.length < 5 || isSharedAtsDomain(domain)) return [];
  const response = await fetch(
    `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&limit=10&api_key=${encodeURIComponent(HUNTER_API_KEY)}`
  );
  const data = await response.json();
  if (data.errors?.length) {
    console.warn(`[hunter] ${domain}: ${data.errors[0]?.details || data.errors[0]?.id}`);
    return [];
  }
  const emails = data.data?.emails || [];
  return emails
    .filter((entry) => entry.value && !isGenericMailbox(entry.value))
    .map((entry, index) => ({
      id: `${company}-${index}`,
      name:
        [entry.first_name, entry.last_name].filter(Boolean).join(" ").trim() ||
        entry.value.split("@")[0],
      email: entry.value,
      role: entry.position || "Employee",
      company,
      confidence: entry.confidence || 0,
      department: entry.department || "",
      seniority: entry.seniority || "",
      source: "Hunter.io",
    }));
}

function heuristicMatchesRole(contactRole, targetRole) {
  const role = (contactRole || "").toLowerCase();
  const target = (targetRole || "").toLowerCase();
  if (!role) return { recruiter: false, manager: false, peer: false };
  return {
    recruiter: /(recruit|talent|sourc|staffing|people ops|people operations|hr\b)/i.test(role),
    manager: /(manager|director|head|lead|vp|vice president|principal manager)/i.test(role),
    peer:
      target
        .split(/[^a-z0-9]+/i)
        .filter(Boolean)
        .some((token) => token.length > 3 && role.includes(token)) ||
      /(engineer|analyst|scientist|designer|developer|specialist)/i.test(role),
  };
}

async function callClaude(system, user, maxTokens = 900) {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("Anthropic API key missing on the server.");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "Claude request failed.");
  }
  return data.content?.map((item) => item.text || "").join("").trim() || "";
}

async function callGemini(system, user, maxTokens = 900) {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key missing on the server.");
  }

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "Gemini request failed.");
  }

  return (
    data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim() || ""
  );
}

function parseJsonResponse(raw) {
  return JSON.parse(String(raw || "").replace(/```json|```/g, "").trim());
}

async function selectStrategicContacts(profile, application, candidates) {
  const usableCandidates = candidates
    .map((candidate) => ({
      ...candidate,
      roleSignals: heuristicMatchesRole(candidate.role, application.role),
    }))
    .filter((candidate) => candidate.email && candidate.name);

  if (!usableCandidates.length) return [];

  if (!GEMINI_API_KEY && !ANTHROPIC_API_KEY) {
    const recruiter = usableCandidates.find((candidate) => candidate.roleSignals.recruiter);
    const peer = usableCandidates.find(
      (candidate) => candidate.roleSignals.peer && candidate.id !== recruiter?.id
    );
    const manager = usableCandidates.find(
      (candidate) =>
        candidate.roleSignals.manager &&
        candidate.id !== recruiter?.id &&
        candidate.id !== peer?.id
    );
    return [recruiter, peer, manager].filter(Boolean);
  }

  const prompt = [
    "You are selecting the best outreach contacts for a job application follow-up.",
    "Pick exactly one recruiter, one peer who is closest to the applied role, and one managerial contact.",
    "Return strict JSON only with this shape:",
    '{"selected":[{"id":"candidate-id","bucket":"recruiter|peer|manager","reason":"short reason"}]}',
    `Applicant: ${profile.name}, ${profile.title}, skills: ${(profile.skills || []).join(", ")}.`,
    `Target company: ${application.company}.`,
    `Applied role: ${application.role || "Unknown role"}.`,
    `Application subject: ${application.subject}.`,
    `Candidates: ${JSON.stringify(
      usableCandidates.map((candidate) => ({
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        role: candidate.role,
        confidence: candidate.confidence,
        department: candidate.department,
        seniority: candidate.seniority,
      }))
    )}`,
  ].join("\n");

  try {
    const raw = GEMINI_API_KEY
      ? await callGemini("Select strategic outreach contacts. Return valid JSON only.", prompt, 600)
      : await callClaude("Select strategic outreach contacts. Return valid JSON only.", prompt, 600);
    const parsed = parseJsonResponse(raw);
    const picked = (parsed.selected || [])
      .map((choice) => ({
        ...usableCandidates.find((candidate) => candidate.id === choice.id),
        bucket: choice.bucket,
        reason: choice.reason,
      }))
      .filter(Boolean);
    if (picked.length) return picked.slice(0, 3);
  } catch {}

  const recruiter = usableCandidates.find((candidate) => candidate.roleSignals.recruiter);
  const peer = usableCandidates.find(
    (candidate) => candidate.roleSignals.peer && candidate.id !== recruiter?.id
  );
  const manager = usableCandidates.find(
    (candidate) =>
      candidate.roleSignals.manager &&
      candidate.id !== recruiter?.id &&
      candidate.id !== peer?.id
  );
  return [recruiter, peer, manager].filter(Boolean);
}

async function generateOutreachDraft(profile, application, contact) {
  const system = "Write polished networking outreach emails. Return valid JSON only.";
  const user = [
    "Draft a short outreach email asking for a gentle internal nudge after a job application.",
    "Return strict JSON with keys: subject, body.",
    "Do not use placeholders.",
    "Keep the body between 90 and 160 words.",
    "Mention that the resume is attached.",
    "Be respectful and tailored to the recipient's role.",
    "Sound like a real person, not a template.",
    "Do not say 'gentle nudge' explicitly in the email.",
    "Do not overpraise the company or use empty flattery.",
    "Do not use lines like 'I hope this finds you well' or 'I came across your profile'.",
    "Use one clear ask only.",
    "Mention the applied role and company naturally.",
    "If the recipient is a recruiter, ask whether they would be open to pointing the application in the right direction.",
    "If the recipient is a peer, ask for quick advice or whether they would be comfortable sharing the application internally.",
    "If the recipient is a manager, ask whether they would be open to a quick look or to routing the application to the right team.",
    "Close politely and briefly.",
    `Sender: ${profile.name}, ${profile.title}, ${profile.location}.`,
    `Sender skills: ${(profile.skills || []).join(", ")}.`,
    `Sender education: ${(profile.education || [])
      .map((item) => `${item.degree || ""} ${item.school || ""}`.trim())
      .join("; ")}.`,
    `Applied company: ${application.company}.`,
    `Applied role: ${application.role || "Unknown role"}.`,
    `Application subject: ${application.subject}.`,
    `Recipient: ${contact.name}, ${contact.role} at ${contact.company}.`,
    `Recipient bucket: ${contact.bucket || "contact"}.`,
    `Selection reason: ${contact.reason || "Relevant company insider."}`,
  ].join("\n");

  const raw = GEMINI_API_KEY
    ? await callGemini(system, user, 700)
    : await callClaude(system, user, 700);
  const parsed = parseJsonResponse(raw);
  return {
    subject: parsed.subject || `Application follow-up for ${application.company}`,
    body: parsed.body || "",
  };
}

function buildResumeAttachment(profile, resumeText) {
  const rawResume = (resumeText || "").trim();
  if (rawResume) {
    return {
      filename: `${(profile.name || "resume").replace(/[^a-z0-9]+/gi, "_")}_resume.txt`,
      contentType: "text/plain; charset=utf-8",
      content: rawResume,
    };
  }

  const lines = [
    profile.name || "",
    [profile.title, profile.location].filter(Boolean).join(" | "),
    "",
    "Skills",
    (profile.skills || []).join(", "),
    "",
    "Experience",
    ...(profile.experience || []).map((item) =>
      `${item.role || ""} | ${item.company || ""} | ${item.duration || ""}`.trim()
    ),
    "",
    "Education",
    ...(profile.education || []).map((item) =>
      `${item.degree || ""} | ${item.school || ""} | ${item.year || ""}`.trim()
    ),
    "",
    "Interests",
    (profile.interests || []).join(", "),
  ].filter(Boolean);

  return {
    filename: `${(profile.name || "resume").replace(/[^a-z0-9]+/gi, "_")}_resume.txt`,
    contentType: "text/plain; charset=utf-8",
    content: lines.join("\n"),
  };
}

async function sendGmailMessage(auth, { to, subject, body, attachment }) {
  const gmail = gmailClient(auth);
  const raw = encodeMessage({ to, subject, body, attachment });
  const result = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });
  return result.data;
}

function outreachKey(company, email) {
  const normalized = normalizeCompanyName(company || "").toLowerCase().trim();
  return `${normalized}|${(email || "").toLowerCase().trim()}`;
}

async function buildPendingOutreach(profile, applications, alreadySentKeys = new Set()) {
  const pendingOutreach = [];
  const seenThisRun = new Set();

  for (const application of applications) {
    if (pendingOutreach.length >= MAX_OUTREACH_PER_RUN) break;
    const contacts = await lookupHunterContacts(application.company, application.fromEmail);
    const remainingSlots = MAX_OUTREACH_PER_RUN - pendingOutreach.length;
    const selectedContacts = (await selectStrategicContacts(profile, application, contacts)).slice(
      0,
      Math.min(3, remainingSlots)
    );

    for (const contact of selectedContacts) {
      if (pendingOutreach.length >= MAX_OUTREACH_PER_RUN) break;
      const key = outreachKey(application.company, contact.email);
      if (alreadySentKeys.has(key) || seenThisRun.has(key)) continue;
      seenThisRun.add(key);
      const draft = await generateOutreachDraft(profile, application, contact);
      pendingOutreach.push({
        id: crypto.randomBytes(10).toString("hex"),
        generatedAt: nowIso(),
        company: application.company,
        appliedRole: application.role || "",
        applicationSubject: application.subject || "",
        to: contact.email,
        contactName: contact.name,
        role: contact.role,
        bucket: contact.bucket || "",
        reason: contact.reason || "",
        subject: draft.subject,
        body: draft.body,
      });
    }
  }

  return pendingOutreach;
}

async function sendApprovedDrafts(draftIds) {
  const auth = await getAuthorizedClient();
  if (!auth) {
    throw new Error("Gmail is not connected yet.");
  }

  const state = await getState();
  const profile = state.profile;
  if (!profile?.name) {
    throw new Error("Profile not synced yet. Upload your resume in CareerCompass first.");
  }
  const pending = state.pendingOutreach || [];
  const alreadySentKeys = new Set(
    (state.outreachLog || []).map((entry) => outreachKey(entry.company, entry.to))
  );
  const selected = (draftIds?.length
    ? pending.filter((draft) => draftIds.includes(draft.id))
    : pending
  )
    .filter((draft) => !alreadySentKeys.has(outreachKey(draft.company, draft.to)))
    .slice(0, MAX_OUTREACH_PER_RUN);

  if (!selected.length) {
    throw new Error("No pending outreach drafts selected (everything already sent).");
  }

  const resumeAttachment = buildResumeAttachment(profile, state.resumeText);
  const outreachLog = [];

  for (const draft of selected) {
    const sent = await sendGmailMessage(auth, {
      to: draft.to,
      subject: draft.subject,
      body: draft.body,
      attachment: resumeAttachment,
    });

    outreachLog.push({
      company: draft.company,
      appliedRole: draft.appliedRole,
      to: draft.to,
      contactName: draft.contactName,
      role: draft.role,
      bucket: draft.bucket || "",
      subject: draft.subject,
      gmailMessageId: sent.id,
      sentAt: nowIso(),
    });
  }

  const stateAfterSend = await updateState((current) => ({
    ...current,
    pendingOutreach: (current.pendingOutreach || []).filter(
      (draft) => !selected.some((picked) => picked.id === draft.id)
    ),
    outreachLog: [...outreachLog, ...(current.outreachLog || [])].slice(0, 500),
    lastRunAt: nowIso(),
    lastRunSummary: {
      ranAt: nowIso(),
      applicationsFound: (current.applications || []).length,
      draftsPrepared: (current.pendingOutreach || []).length,
      outreachSent: outreachLog.length,
    },
  }));

  return {
    sentCount: outreachLog.length,
    outreachLog,
    pendingRemaining: stateAfterSend.pendingOutreach.length,
  };
}

async function runAutomation() {
  const auth = await getAuthorizedClient();
  if (!auth) {
    throw new Error("Gmail is not connected yet.");
  }

  const state = await getState();
  const profile = state.profile;
  if (!profile?.name) {
    throw new Error("Profile not synced yet. Upload your resume in CareerCompass first.");
  }

  const applications = await listApplicationMessages(auth);
  const dedupedApplications = dedupApplications(applications).slice(0, MAX_APPLICATIONS_PER_RUN);
  const alreadySentKeys = new Set(
    (state.outreachLog || []).map((entry) => outreachKey(entry.company, entry.to))
  );
  const pendingOutreach = await buildPendingOutreach(
    profile,
    dedupedApplications,
    alreadySentKeys
  );

  const summary = {
    ranAt: nowIso(),
    applicationsFound: dedupedApplications.length,
    draftsPrepared: pendingOutreach.length,
    outreachSent: 0,
  };

  await updateState((current) => ({
    ...current,
    applications: dedupedApplications,
    pendingOutreach,
    lastSyncAt: summary.ranAt,
    lastRunAt: summary.ranAt,
    lastRunSummary: summary,
  }));

  return summary;
}

function isConfigured() {
  return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REDIRECT_URI);
}

app.get("/api/health", async (_req, res) => {
  const token = await readToken();
  res.json({
    ok: true,
    configured: isConfigured(),
    gmailConnected: Boolean(token),
  });
});

app.get("/api/automation/status", async (_req, res) => {
  const token = await readToken();
  const state = await getState();
  res.json({
    configured: isConfigured(),
    gmailConnected: Boolean(token),
    maxApplicationsPerRun: MAX_APPLICATIONS_PER_RUN,
    maxOutreachPerRun: MAX_OUTREACH_PER_RUN,
    schedule: {
      cron: "0 23 * * *",
      timezone: TIMEZONE,
      description: "Every night at 11:00 PM",
    },
    lastSyncAt: state.lastSyncAt || null,
    lastRunAt: state.lastRunAt,
    lastRunSummary: state.lastRunSummary,
    profile: state.profile || null,
    applications: state.applications || [],
    pendingOutreach: (state.pendingOutreach || []).slice(0, 20),
    outreachLog: (state.outreachLog || []).slice(0, 10),
    profileSynced: Boolean(state.profile?.name),
  });
});

app.post("/api/profile", async (req, res) => {
  const profile = req.body?.profile;
  const resumeText = req.body?.resumeText || "";
  if (!profile?.name) {
    return res.status(400).json({ error: "Profile payload is required." });
  }
  const state = await updateState((current) => ({
    ...current,
    profile,
    resumeText,
  }));
  res.json({ ok: true, profile: state.profile });
});

app.get("/api/google/oauth/start", (req, res) => {
  if (!isConfigured()) {
    return res.status(500).send("Google OAuth is not configured on the server.");
  }
  const state = crypto.randomBytes(24).toString("hex");
  oauthState.set(state, Date.now());
  const client = createOAuthClient();
  const authUrl = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: GOOGLE_SCOPES,
    state,
  });
  res.redirect(authUrl);
});

app.get("/api/google/oauth/callback", async (req, res) => {
  const { code, state } = req.query;
  const createdAt = oauthState.get(state);
  oauthState.delete(state);

  if (!code || !createdAt || Date.now() - createdAt > SESSION_STATE_TTL_MS) {
    return res.status(400).send("OAuth state expired or invalid.");
  }

  try {
    const client = createOAuthClient();
    const { tokens } = await client.getToken(String(code));
    await writeToken({
      ...tokens,
      connectedAt: nowIso(),
    });
    res.redirect(`${FRONTEND_URL}/?gmail=connected`);
  } catch (error) {
    res.status(500).send(error.message || "OAuth callback failed.");
  }
});

app.get("/api/applications", async (_req, res) => {
  const state = await getState();
  res.json({
    applications: state.applications || [],
    lastSyncAt: state.lastSyncAt || state.lastRunAt || null,
  });
});

app.post("/api/applications/sync", async (_req, res) => {
  try {
    const auth = await getAuthorizedClient();
    if (!auth) {
      return res.status(400).json({ ok: false, error: "Gmail is not connected yet." });
    }
    const applications = await listApplicationMessages(auth);
    const deduped = dedupApplications(applications).slice(0, MAX_APPLICATIONS_PER_RUN);
    const state = await updateState((current) => ({
      ...current,
      applications: deduped,
      lastSyncAt: nowIso(),
    }));
    res.json({
      ok: true,
      applications: state.applications,
      lastSyncAt: state.lastSyncAt,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message || "Sync failed." });
  }
});

app.get("/api/hunter/company-search", async (req, res) => {
  try {
    if (!HUNTER_API_KEY) {
      return res.status(400).json({ ok: false, error: "Hunter API key is not configured." });
    }
    const query = String(req.query.q || "").trim();
    if (!query) {
      return res.status(400).json({ ok: false, error: "Company or domain query is required." });
    }

    const domain = normalizeSearchDomain(query);
    const response = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&limit=10&api_key=${encodeURIComponent(HUNTER_API_KEY)}`
    );
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ ok: false, error: data.errors?.[0]?.details || data.error || "Hunter request failed." });
    }

    const people = (data.data?.emails || []).map((entry, index) => ({
      id: `${domain}-${index}`,
      name: [entry.first_name, entry.last_name].filter(Boolean).join(" ").trim() || entry.value.split("@")[0],
      email: entry.value,
      role: entry.position || "Employee",
      company: query,
      source: "Hunter.io",
      confidence: entry.confidence || 0,
      linkedin: entry.linkedin,
      type:
        /(recruit|talent|sourc|staffing|hr\b)/i.test(entry.position || "") ? "Recruiter" :
        /(manager|director|head|lead|vp)/i.test(entry.position || "") ? "Hiring Manager" :
        "Industry Peer",
    }));

    res.json({ ok: true, domain, people });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message || "Hunter search failed." });
  }
});

app.post("/api/automation/run", async (_req, res) => {
  try {
    const result = await runAutomation();
    res.json({ ok: true, result });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message || "Automation run failed." });
  }
});

app.post("/api/automation/send-approved", async (req, res) => {
  try {
    const draftIds = Array.isArray(req.body?.draftIds) ? req.body.draftIds : [];
    const result = await sendApprovedDrafts(draftIds);
    res.json({ ok: true, result });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message || "Sending approved drafts failed." });
  }
});

cron.schedule(
  "0 23 * * *",
  async () => {
    try {
      await runAutomation();
    } catch (error) {
      console.error("[automation]", error.message || error);
    }
  },
  { timezone: TIMEZONE }
);

ensureDirs()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`CareerCompass backend listening on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
