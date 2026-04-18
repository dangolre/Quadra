import { useState, useEffect, useRef } from "react";
import BuildProfile from "./BuildProfile";

// ═══════════════════════════════════════════════════
// CONFIGURATION & CONSTANTS
// ═══════════════════════════════════════════════════
// Replace with your real Hunter.io API key (free tier: 25 lookups/month)
// Get one at https://hunter.io/api-keys
const HUNTER_API_KEY = process.env.REACT_APP_HUNTER_API_KEY;
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:4000";

const MESSAGE_STYLE_MAP = {
  Alumni: { style: "conversational", label: "Warm & Personal" },
  "Recent Hire": { style: "curiosity", label: "Curious & Friendly" },
  "Team Lead": { style: "conversational", label: "Professional & Polite" },
  Recruiter: { style: "direct", label: "Direct & Concise" },
  "Hiring Manager": { style: "direct", label: "Strategic & Direct" },
  "Industry Peer": { style: "curiosity", label: "Collaborative" },
  CEO: { style: "conversational", label: "Conversational & Polite" },
};

const STATUS_LIST = ["All", "Needs Follow-up", "Replied", "Sent", "No Response", "Coffee Chat Scheduled", "Referral Received"];

// ═══════════════════════════════════════════════════
// DEMO DATA
// ═══════════════════════════════════════════════════
const DEMO_JOBS = [
  { id: 1, title: "Data Engineer", company: "Google", location: "Mountain View, CA", type: "Full-time", level: "Entry", posted: "2 days ago", ghost: false },
  { id: 2, title: "Junior Data Engineer", company: "Amazon", location: "Seattle, WA (Remote)", type: "Full-time", level: "Entry", posted: "1 day ago", ghost: false },
  { id: 3, title: "Data Analyst", company: "Meta", location: "Menlo Park, CA (Hybrid)", type: "Full-time", level: "Entry", posted: "3 days ago", ghost: false },
  { id: 4, title: "ML Engineer", company: "Google", location: "New York, NY", type: "Full-time", level: "Mid", posted: "5 days ago", ghost: false },
  { id: 5, title: "Data Pipeline Developer", company: "Stripe", location: "Remote", type: "Full-time", level: "Entry", posted: "45 days ago", ghost: true },
  { id: 6, title: "Cloud Data Engineer", company: "Microsoft", location: "Redmond, WA", type: "Full-time", level: "Mid", posted: "1 week ago", ghost: false },
];

const DEMO_CONTACTS = {
  Google: [
    { id: 1, name: "Sarah Chen", role: "Senior Data Engineer", type: "Alumni", company: "Google", tenure: "3 years", school: "ULM", linkedin: "https://linkedin.com/in/sarachen", email: "sarah.chen@gmail.com", bio: "ULM Computer Science '21. Built data pipelines at scale. Previously at Deloitte." },
    { id: 2, name: "Marcus Johnson", role: "Engineering Manager", type: "Team Lead", company: "Google", tenure: "5 years", school: "Georgia Tech", linkedin: "https://linkedin.com/in/marcusj", email: "marcus.j@gmail.com", bio: "Leads the Cloud Data team. Passionate about mentoring early-career engineers." },
    { id: 3, name: "Rachel Adams", role: "Data Engineer II", type: "Recent Hire", company: "Google", tenure: "4 months", school: "LSU", linkedin: "https://linkedin.com/in/racheladams", email: "rachel.a@gmail.com", bio: "Just joined Google from a bootcamp. Went through the full interview loop recently." },
    { id: 4, name: "David Park", role: "Technical Recruiter", type: "Recruiter", company: "Google", tenure: "2 years", school: "UCLA", linkedin: "https://linkedin.com/in/davidpark", email: "david.park@google.com", bio: "Recruits for Cloud and Data Engineering roles." },
  ],
  Amazon: [
    { id: 5, name: "Priya Sharma", role: "SDE II", type: "Alumni", company: "Amazon", tenure: "2 years", school: "ULM", linkedin: "https://linkedin.com/in/priyasharma", email: "priya.s@amazon.com", bio: "ULM CS '20. Works on AWS Lambda. Active in alumni mentoring." },
    { id: 6, name: "James Liu", role: "Senior Manager, Data", type: "Hiring Manager", company: "Amazon", tenure: "6 years", school: "MIT", linkedin: "https://linkedin.com/in/jamesliu", email: "james.liu@amazon.com", bio: "Hiring for 3 data engineering positions this quarter." },
    { id: 7, name: "Emily Torres", role: "Data Analyst", type: "Recent Hire", company: "Amazon", tenure: "2 months", school: "UT Austin", linkedin: "https://linkedin.com/in/emilytorres", email: "emily.t@amazon.com", bio: "Transitioned from marketing analytics. Great insight into the interview process." },
  ],
  Meta: [
    { id: 8, name: "Alex Rivera", role: "ML Engineer", type: "Industry Peer", company: "Meta", tenure: "1 year", school: "Stanford", linkedin: "https://linkedin.com/in/alexrivera", email: "alex.r@meta.com", bio: "Previously at a startup. Knows the data engineering landscape well." },
    { id: 9, name: "Nina Patel", role: "Tech Lead, Infrastructure", type: "Team Lead", company: "Meta", tenure: "4 years", school: "Carnegie Mellon", linkedin: "https://linkedin.com/in/ninapatel", email: "nina.p@meta.com", bio: "Leads infrastructure team. Advocates for diverse hiring." },
  ],
  IBM: [
    {
      id: 10,
      name: "Anirudh Girey",
      role: "Test Lead/Architect/Project Manager Role",
      type: "Team Lead",
      company: "IBM",
      tenure: "16 yrs 3 mos",
      school: "",
      linkedin: "https://linkedin.com",
      email: "anirudh.girey@ibm.com",
      bio: "Delivery Manager (Test Lead), Full-time, Jun 2010 - Present (15 yrs 11 mos), Monroe, Louisiana, United States."
    },
  ],
};

const SIMULATED_REPLIES = [
  { id: "r1", from: "Rachel Adams", company: "Google", platform: "LinkedIn", time: "2 hours ago", preview: "Thanks for reaching out! I'd love to share my experience joining Google...", full: "Hi! Thanks so much for reaching out. It's always nice to connect with fellow Louisiana folks in tech. I'd love to share my experience joining Google. The interview process was intense but fair. Would you be free for a 20-minute coffee chat this week? I'm open Tuesday or Thursday afternoon.", action: "Schedule coffee chat" },
  { id: "r2", from: "Priya Sharma", company: "Amazon", platform: "Gmail", time: "5 hours ago", preview: "Hey fellow Warhawk! Always happy to help ULM grads...", full: "Hey fellow Warhawk! Always happy to help ULM grads break into big tech. The SDE role here is challenging but the growth is incredible. I'd recommend focusing on system design and leadership principles. Want me to refer you to an open position on my team? We're actively hiring and a referral would get your resume looked at.", action: "Accept referral offer" },
  { id: "r3", from: "David Park", company: "Google", platform: "Gmail", time: "1 day ago", preview: "Thanks for your interest in the Data Engineer role. Your background looks promising...", full: "Hi there, thanks for your interest in the Data Engineer role on the Cloud team. Your background in data pipelines and Python looks promising. Could you send me your most updated resume? I'd like to flag your application internally.", action: "Send resume" },
];

const NOTIFICATIONS = [
  { id: "n1", type: "follow-up", message: "Follow up with Marcus Johnson", detail: "No response for 3 days. Send a gentle reminder.", contact: "Marcus Johnson", company: "Google", time: "Due today" },
  { id: "n2", type: "reply", message: "Rachel Adams replied on LinkedIn", detail: "She wants to schedule a coffee chat this week.", contact: "Rachel Adams", company: "Google", time: "2 hours ago" },
  { id: "n3", type: "reply", message: "Priya Sharma replied via Gmail", detail: "Offered to refer you to an open position!", contact: "Priya Sharma", company: "Amazon", time: "5 hours ago" },
  { id: "n4", type: "reply", message: "David Park replied via Gmail", detail: "Wants your updated resume. Send it ASAP.", contact: "David Park", company: "Google", time: "1 day ago" },
  { id: "n5", type: "follow-up", message: "Follow up with Nina Patel", detail: "Sent 5 days ago. Consider a second outreach.", contact: "Nina Patel", company: "Meta", time: "Due tomorrow" },
];

// ═══════════════════════════════════════════════════
// COLORS
// ═══════════════════════════════════════════════════
const C = {
  primary: "#0d9488", primaryLight: "#ccfbf1", primaryDark: "#0f766e",
  accent: "#f59e0b", accentLight: "#fef3c7",
  bg: "#fafaf9", card: "#ffffff", text: "#1c1917", sub: "#78716c", muted: "#a8a29e", border: "#e7e5e4",
  ok: "#16a34a", okLight: "#dcfce7", err: "#ef4444", errLight: "#fef2f2",
  info: "#3b82f6", infoLight: "#eff6ff", purple: "#7c3aed",
  shadow: "0 1px 3px rgba(28,25,23,0.06)",
};

const TC = {
  Alumni: { bg: "#dcfce7", text: "#166534", border: "#bbf7d0" },
  "Recent Hire": { bg: "#e0f2fe", text: "#075985", border: "#bae6fd" },
  "Team Lead": { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
  Recruiter: { bg: "#f3e8ff", text: "#6b21a8", border: "#e9d5ff" },
  "Hiring Manager": { bg: "#ffe4e6", text: "#9f1239", border: "#fecdd3" },
  "Industry Peer": { bg: "#ccfbf1", text: "#0f766e", border: "#99f6e4" },
};

// ═══════════════════════════════════════════════════
// APP
// ═══════════════════════════════════════════════════
export default function CareerCompass() {
  const [pg, setPg] = useState("landing");
  const [profile, setProfile] = useState(null);
  const [selectedTargetCompanies, setSelectedTargetCompanies] = useState([]);
  const [onboardingFormData, setOnboardingFormData] = useState(null);
  const [resume, setResume] = useState("");
  const [uploadedResumeFile, setUploadedResumeFile] = useState(null);
  const [uploadedResumeFileName, setUploadedResumeFileName] = useState("");
  const [selCo, setSelCo] = useState(null);
  const [selCt, setSelCt] = useState(null);
  const [tracker, setTracker] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgPlat, setMsgPlat] = useState("linkedin");
  const [chat, setChat] = useState([]);
  const [chatIn, setChatIn] = useState("");
  const [simCt, setSimCt] = useState(null);
  const [fuData, setFuData] = useState(null);
  const [chatSum, setChatSum] = useState("");
  const [jf, setJf] = useState({ location: "", level: "", hideGhost: true });
  const [coSearch, setCoSearch] = useState("");
  const [sTab, setSTab] = useState("jobs");
  const [stFilt, setStFilt] = useState("All");
  const [nFilt, setNFilt] = useState("all");
  const [autoStep, setAutoStep] = useState(-1);
  const [foundEmail, setFoundEmail] = useState(null);
  const chatEnd = useRef(null);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  const postJson = async (path, body) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || `Request failed (${response.status})`);
    }
    return data;
  };

  // AI
  const ai = async (sys, usr) => {
    try {
      const d = await postJson("/api/ai/chat", {
        system: sys,
        messages: [{ role: "user", content: usr }],
        maxTokens: 1000,
      });
      return d.text || "No response.";
    } catch { return "AI unavailable. Please retry."; }
  };
  const aiChat = async (sys, msgs) => {
    try {
      const d = await postJson("/api/ai/chat", {
        system: sys,
        messages: msgs,
        maxTokens: 1000,
      });
      return d.text || "No response.";
    } catch { return "AI unavailable."; }
  };

  const buildProfileExtractionText = (p) => {
    const lines = [];
    if (p.fullName) lines.push(`Preferred name: ${p.fullName}`);
    if (p.location) lines.push(`Current location: ${p.location}`);
    if (p.targetJobTitles) lines.push(`Target job titles: ${p.targetJobTitles}`);
    if (p.employmentTypes?.length) lines.push(`Preferred employment types: ${p.employmentTypes.join(", ")}`);
    lines.push(`Years of experience (self-reported): ${p.yearsOfExperience}`);
    lines.push(`Open to relocation: ${p.openToRelocation ? "yes" : "no"}`);
    if (p.targetCompanies?.length) lines.push(`Target companies: ${p.targetCompanies.join(", ")}`);
    if (p.linkedInUrl) lines.push(`LinkedIn: ${p.linkedInUrl}`);
    if (p.portfolioUrl) lines.push(`Portfolio: ${p.portfolioUrl}`);
    if (p.githubUrl) lines.push(`GitHub: ${p.githubUrl}`);
    if (p.otherLink) lines.push(`Other link: ${p.otherLink}`);
    if (p.resumeFileName) lines.push(`Uploaded resume file: ${p.resumeFileName}`);
    lines.push("");
    lines.push("Resume / background:");
    if (p.resume) {
      lines.push(p.resume);
    } else {
      lines.push("No pasted resume text provided. Use fields above plus uploaded file metadata.");
    }
    return lines.join("\n");
  };

  const isPlaceholderName = (name) => {
    if (!name || !String(name).trim()) return true;
    const normalized = String(name).trim().toLowerCase();
    return normalized === "demo" || normalized === "demo user" || normalized === "user";
  };

  const extractProfile = async (profilePayload) => {
    const text = profilePayload ? buildProfileExtractionText(profilePayload) : resume;
    if (!String(text).trim() && !profilePayload) return;
    setBusy(true);
    const preferredName = profilePayload?.fullName?.trim() || "";
    const preferredLocation = profilePayload?.location?.trim() || "";
    try {
      const payload = profilePayload || {
        resume,
        resumeFileName: uploadedResumeFileName,
        linkedInUrl: "",
        portfolioUrl: "",
        githubUrl: "",
        otherLink: "",
        fullName: "",
        location: "",
        targetJobTitles: "",
        employmentTypes: [],
        openToRelocation: false,
        yearsOfExperience: "",
        targetCompanies: selectedTargetCompanies,
      };
      const d = await postJson("/api/profile/extract", { profileInput: payload });
      const normalizedProfile = {
        ...d.profile,
        name: isPlaceholderName(d.profile?.name) ? (preferredName || d.profile?.name || "Candidate") : d.profile.name,
        location: d.profile?.location?.trim() ? d.profile.location : (preferredLocation || d.profile?.location || ""),
      };
      setProfile(normalizedProfile);
      setPg("dashboard");
    } catch {
      setProfile({ name: preferredName || "Candidate", title: "Aspiring Data Engineer", skills: ["Python", "SQL", "Data Pipelines", "AWS", "Spark"], experience: [{ role: "Data Analyst Intern", company: "Tech Corp", duration: "6 months" }], education: [{ school: "University of Louisiana Monroe", degree: "BS Computer Science", year: "2025" }], interests: ["Data Engineering", "Cloud Computing"], location: preferredLocation || "Remote" });
      setPg("dashboard");
    }
    setBusy(false);
  };

  const genMsg = async (contact, platform) => {
    if (!profile || !contact) return; setBusy(true); setMsg(""); setMsgPlat(platform);
    const st = MESSAGE_STYLE_MAP[contact.type]?.style || "conversational";
    const buildFallbackMessage = () => {
      const firstName = contact.name?.split(" ")[0] || contact.name;
      const senderName = profile?.name || "I";
      const senderTitle = profile?.title || "early-career professional";
      const topSkill = profile?.skills?.[0] || "data engineering";
      const recipientType = (contact.type || "").toLowerCase();
      const recipientProfileContext = [contact.role, contact.tenure, contact.school, contact.bio]
        .filter(Boolean)
        .join(" | ");

      const linkedinByType = {
        alumni: `Hi ${firstName}, fellow alumni here. I am ${senderName}, a ${senderTitle}, and your journey at ${contact.company} (${contact.role}) really stood out to me. I would value connecting and learning one practical tip from your experience.`,
        "recent hire": `Hi ${firstName}, congrats on your recent move to ${contact.company}. I am ${senderName}, a ${senderTitle}, and would love to learn what helped most during interviews and onboarding. Open to connect?`,
        recruiter: `Hi ${firstName}, I am ${senderName}, a ${senderTitle} focused on ${topSkill}. I am exploring roles at ${contact.company} and would appreciate your guidance on the best-fit openings and next step in your process.`,
        "team lead": `Hi ${firstName}, I am ${senderName}, a ${senderTitle}. I respect your leadership as ${contact.role} at ${contact.company}. If you are open, I would value a short conversation to learn what your team prioritizes in strong candidates.`,
        "hiring manager": `Hi ${firstName}, I am ${senderName}, a ${senderTitle} focused on ${topSkill}. I am interested in your team at ${contact.company} and would value a brief coffee chat to understand priorities and fit.`,
      };

      const emailByType = {
        alumni: [
          `Hi ${firstName},`,
          "",
          `I am ${senderName}, a ${senderTitle}, and I noticed we share an alumni connection.`,
          `I really admire your journey to ${contact.role} at ${contact.company}, especially how you have grown your impact over time.${recipientProfileContext ? ` (${recipientProfileContext})` : ""}`,
          "",
          `I am currently building depth in ${topSkill}, and I would be grateful for your perspective on how to position myself effectively for similar roles.`,
          "If you are open to a brief 15-20 minute coffee chat, I would truly value learning from your experience. Even one practical suggestion would help me focus my preparation in the right direction.",
          "",
          "Thanks so much,",
          senderName,
        ].join("\n"),
        "recent hire": [
          `Hi ${firstName},`,
          "",
          `I am ${senderName}, currently pursuing ${senderTitle} opportunities.`,
          `I saw that you recently joined ${contact.company}, and your transition really stood out to me.`,
          "I am trying to prepare in a focused way, and I would value your perspective on what mattered most in interviews and what helped you ramp up during onboarding.",
          "",
          "If you are open, a short 15-20 minute conversation would be incredibly helpful. I would really appreciate any concrete suggestions you would recommend for someone preparing for a similar path.",
          "",
          "Thank you,",
          senderName,
        ].join("\n"),
        recruiter: [
          `Hi ${firstName},`,
          "",
          `I am ${senderName}, a ${senderTitle} focused on ${topSkill}.`,
          `I am interested in opportunities at ${contact.company}, and I wanted to ask which roles would best align with my background and current trajectory.${recipientProfileContext ? ` I appreciated your profile context: ${recipientProfileContext}.` : ""}`,
          "I am especially motivated to contribute in a team where I can add value quickly while continuing to learn from experienced professionals.",
          "",
          "If helpful, I can share my resume right away. I would appreciate your guidance on the most effective next step in your process and how to position my profile for strong consideration.",
          "",
          "Best regards,",
          senderName,
        ].join("\n"),
        "team lead": [
          `Hi ${firstName},`,
          "",
          `I am ${senderName}, a ${senderTitle} with a focus on ${topSkill}.`,
          `I have been following work like yours at ${contact.company}, and I really value how leaders like you shape both delivery quality and team growth.${recipientProfileContext ? ` (${recipientProfileContext})` : ""}`,
          "I am actively looking to learn from practitioners who understand what strong contributors do differently in real projects.",
          "",
          "If you are open to a short 15-20 minute coffee chat, I would be grateful for the chance to learn from your experience and get your advice on where I should focus next. If there is potential fit in the future, I would also appreciate guidance on how to prepare for that.",
          "",
          "Thank you for your time,",
          senderName,
        ].join("\n"),
        "hiring manager": [
          `Hi ${firstName},`,
          "",
          `I am ${senderName}, a ${senderTitle} focused on ${topSkill}.`,
          `I am very interested in the work your team is doing at ${contact.company}, and I would appreciate your guidance on where my background could create the most value.`,
          "I am intentional about aligning with teams where I can contribute meaningfully and continue growing under strong leadership.",
          "",
          "If you are open, I would love a short coffee chat to learn more about your team priorities and how I can best prepare for opportunities in this area. If appropriate, I would also value advice on the right path to be considered for future roles.",
          "",
          "Sincerely,",
          senderName,
        ].join("\n"),
      };

      if (platform === "linkedin") {
        const note = linkedinByType[recipientType] || `Hi ${firstName}, I am ${senderName}, a ${senderTitle}. I admired your work at ${contact.company} and your path into ${contact.role}. I would value connecting and learning how you grew in this space.`;
        return note.length > 300 ? note.slice(0, 297).trimEnd() + "..." : note;
      }
      return emailByType[recipientType] || [
        `Hi ${firstName},`,
        "",
        `I am ${senderName}, currently focused on ${topSkill} and pursuing ${senderTitle} opportunities.`,
        `I came across your profile and really appreciated your experience as ${contact.role} at ${contact.company}.`,
        "",
        "If you are open to it, I would be grateful for a short chat to learn from your journey and any advice you would share for someone building in this direction.",
        "",
        "Thanks for your time,",
        senderName,
      ].join("\n");
    };
    try {
      const d = await postJson("/api/message/generate", {
        profile,
        contact,
        platform,
        styleHint: st,
      });
      const cleaned = (d.text || "").trim();
      setMsg(cleaned || buildFallbackMessage());
    } catch {
      setMsg(buildFallbackMessage());
    }
    setBusy(false);
  };

  const startSim = (ct) => { setSimCt(ct); setChat([{ role: "assistant", content: `Hi! Thanks for setting up this chat. I'm ${ct.name}, ${ct.role} at ${ct.company}. Tell me about yourself, what got you interested in this field?` }]); setChatSum(""); setPg("sim"); };

  const sendChat = async () => {
    if (!chatIn.trim() || busy) return; const m = chatIn.trim(); setChatIn("");
    const ms = [...chat, { role: "user", content: m }]; setChat(ms); setBusy(true);
    const r = await aiChat(`Role-play as ${simCt.name}, ${simCt.role} at ${simCt.company}. Bio: ${simCt.bio}. School: ${simCt.school}. Stay in character. Friendly but professional. 2-4 sentences. No em dashes. After 4-5 good exchanges, hint you'd help.`, ms.map(x => ({ role: x.role, content: x.content })));
    setChat([...ms, { role: "assistant", content: r }]); setBusy(false);
  };

  const genFollowUp = async (reply) => {
    setBusy(true);
    const r = await ai("Generate follow-up message. Warm, specific, move toward next step. Under 100 words. No em dashes.", `Reply from ${reply.from} at ${reply.company}: "${reply.full}"\nUser: ${profile?.name}, ${profile?.title}`);
    setFuData({ reply, followUp: r }); setBusy(false);
  };

  const genPostChat = async () => {
    if (!chatSum.trim()) return; setBusy(true);
    const r = await ai("Generate THREE follow-up messages. Headers: 'THANK YOU (send today):', 'CHECK-IN (1-2 weeks):', 'REFERRAL ASK:'. Each under 80 words. No em dashes.", `User: ${profile?.name}, ${profile?.title}. Chat with ${simCt?.name} (${simCt?.role}, ${simCt?.company}). How it went: ${chatSum}`);
    setFuData({ reply: { from: simCt?.name, company: simCt?.company }, followUp: r }); setPg("fu"); setBusy(false);
  };

  const [autoContact, setAutoContact] = useState(null);
  const runAuto = (ct) => {
    setAutoContact(ct);
    setAutoStep(0);
    [0, 1, 2, 3, 4].forEach((step, i) => setTimeout(() => {
      setAutoStep(step);
      if (step === 4) setTimeout(() => { setAutoStep(-1); setAutoContact(null); addTrack(ct, "Sent"); }, 2000);
    }, i * 2200));
  };
  const AUTO_STEPS = [
    { label: "Opening LinkedIn profile", sub: "Navigating to their profile page...", icon: "🌐" },
    { label: "Clicking 'Connect'", sub: "Found the Connect button", icon: "👆" },
    { label: "Selecting 'Add a note'", sub: "Adding your personalized note", icon: "📝" },
    { label: "Pasting your message", sub: "Inserting AI-crafted message", icon: "✍️" },
    { label: "Connection request sent!", sub: "Successfully sent with personalized note", icon: "✅" },
  ];

  const lookupEmail = async (name, company) => {
    setBusy(true); setFoundEmail(null);
    const domain = company.toLowerCase().replace(/\s/g, "") + ".com";
    const firstName = name.split(" ")[0];
    const lastName = name.split(" ").slice(-1)[0];
    try {
      // Real Hunter.io API call - email finder
      const res = await fetch(
        `https://api.hunter.io/v2/email-finder?domain=${domain}&first_name=${firstName}&last_name=${lastName}&api_key=${HUNTER_API_KEY}`
      );
      const data = await res.json();
      if (data.data?.email) {
        setFoundEmail({
          email: data.data.email,
          confidence: data.data.confidence || 0,
          source: "Hunter.io",
          firstName: data.data.first_name,
          lastName: data.data.last_name,
          position: data.data.position,
          linkedin: data.data.linkedin_url,
          verified: data.data.verification?.status === "valid",
        });
      } else {
        // Fallback: try domain search for any emails at the company
        const res2 = await fetch(
          `https://api.hunter.io/v2/domain-search?domain=${domain}&limit=5&api_key=${HUNTER_API_KEY}`
        );
        const data2 = await res2.json();
        if (data2.data?.emails?.length > 0) {
          const match = data2.data.emails.find(
            e => e.first_name?.toLowerCase() === firstName.toLowerCase()
          ) || data2.data.emails[0];
          setFoundEmail({
            email: match.value,
            confidence: match.confidence || 0,
            source: "Hunter.io (domain search)",
            firstName: match.first_name,
            lastName: match.last_name,
            position: match.position,
            verified: match.verification?.status === "valid",
          });
        } else {
          // If API key is not set or no results, show a helpful fallback
          const fName = firstName.toLowerCase();
          const lName = lastName.toLowerCase();
          setFoundEmail({
            email: `${fName}.${lName}@${domain}`,
            confidence: 0,
            source: HUNTER_API_KEY === "YOUR_HUNTER_API_KEY" ? "Estimated (add Hunter.io API key for real lookup)" : "Not found - estimated pattern",
            verified: false,
          });
        }
      }
    } catch (err) {
      // Network error or invalid key fallback
      const fName = firstName.toLowerCase();
      const lName = lastName.toLowerCase();
      setFoundEmail({
        email: `${fName}.${lName}@${domain}`,
        confidence: 0,
        source: "Estimated (Hunter.io unavailable)",
        verified: false,
      });
    }
    setBusy(false);
  };

  const addTrack = (ct, status = "Sent") => {
    if (tracker.find(c => c.id === ct.id)) return;
    setTracker(p => [...p, { ...ct, status, dateSent: new Date().toLocaleDateString(), followUpDue: status === "Sent" ? "In 3 days" : null }]);
  };

  const filtJobs = DEMO_JOBS.filter(j => { if (jf.hideGhost && j.ghost) return false; if (jf.level && j.level !== jf.level) return false; if (jf.location && !j.location.toLowerCase().includes(jf.location.toLowerCase())) return false; return true; });
  const filtTrack = tracker.filter(c => stFilt === "All" ? true : stFilt === "Needs Follow-up" ? c.status === "Sent" || c.status === "No Response" : c.status === stFilt);
  const filtNotif = NOTIFICATIONS.filter(n => nFilt === "all" ? true : n.type === nFilt);
  const allCts = Object.values(DEMO_CONTACTS).flat();
  const searchCts = coSearch ? allCts.filter(c => c.company.toLowerCase().includes(coSearch.toLowerCase()) || c.name.toLowerCase().includes(coSearch.toLowerCase()) || c.role.toLowerCase().includes(coSearch.toLowerCase())) : [];
  const dashboardCompanies = selectedTargetCompanies.length > 0 ? selectedTargetCompanies : ["Google", "Amazon", "Meta"];
  const companyColors = ["#4285F4", "#FF9900", "#0668E1", "#0ea5e9", "#7c3aed", "#16a34a", "#f97316", "#e11d48"];
  const companyCards = dashboardCompanies.map((name, i) => ({ n: name, l: (name?.[0] || "?").toUpperCase(), c: companyColors[i % companyColors.length] }));

  // ═══ STYLES ═══
  const btn = (v = "primary") => ({
    padding: "10px 20px", borderRadius: "10px", border: "none", fontWeight: 600, fontSize: "14px", cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit",
    ...(v === "primary" ? { background: C.primary, color: "#fff" } : v === "secondary" ? { background: C.primaryLight, color: C.primaryDark } : v === "amber" ? { background: C.accent, color: "#fff" } : v === "ghost" ? { background: "transparent", color: C.sub } : { background: C.border, color: C.text })
  });
  const card = { background: C.card, borderRadius: "14px", border: `1px solid ${C.border}`, padding: "24px", marginBottom: "16px", boxShadow: C.shadow };
  const badge = (t) => { const c = TC[t] || { bg: "#f5f5f4", text: "#44403c", border: "#e7e5e4" }; return { display: "inline-block", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, background: c.bg, color: c.text, border: `1px solid ${c.border}` }; };
  const av = (color = C.primary) => ({ width: 40, height: 40, borderRadius: "50%", background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "14px", flexShrink: 0 });
  const inp = { width: "100%", padding: "10px 14px", borderRadius: "10px", border: `1px solid ${C.border}`, fontSize: "14px", fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: "#fff" };
  const sel = { padding: "8px 12px", borderRadius: "8px", border: `1px solid ${C.border}`, fontSize: "13px", fontFamily: "inherit", outline: "none", background: "#fff", cursor: "pointer" };
  const tag = { padding: "3px 10px", borderRadius: "6px", background: C.primaryLight, color: C.primaryDark, fontSize: "12px", fontWeight: 500 };
  const tab = (a) => ({ padding: "8px 18px", borderRadius: "8px", border: "none", background: a ? C.primary : "transparent", color: a ? "#fff" : C.sub, fontWeight: 600, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" });
  const mbox = { background: "#fafaf9", borderRadius: "10px", border: `1px solid ${C.border}`, padding: "16px", fontSize: "14px", lineHeight: 1.7, color: C.text, whiteSpace: "pre-wrap" };
  const sDot = (st) => ({ width: 9, height: 9, borderRadius: "50%", flexShrink: 0, background: st === "Replied" ? C.ok : st === "Sent" ? C.info : st === "Coffee Chat Scheduled" ? C.accent : st === "Referral Received" ? C.purple : C.muted });

  const wrap = { maxWidth: "1060px", margin: "0 auto", padding: "28px 24px", animation: "fadeIn 0.3s ease" };

  // ═══ RENDER ═══
  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", background: C.bg, minHeight: "100vh", color: C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        *{margin:0;box-sizing:border-box}
        button:hover:not(:disabled){opacity:.88}
        button:disabled{opacity:.5;cursor:not-allowed}
        input:focus,textarea:focus,select:focus{border-color:${C.primary};box-shadow:0 0 0 3px ${C.primary}22}
        ::selection{background:${C.primaryLight}}
      `}</style>

      {/* NAV */}
      {pg !== "landing" && (
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 28px", background: "#fff", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 100 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "18px", cursor: "pointer" }} onClick={() => setPg(profile ? "dashboard" : "landing")}>
            <div style={{ width: 32, height: 32, borderRadius: "8px", background: C.primary, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "14px" }}>🧭</div>
            CareerCompass
          </div>
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            <button style={tab(pg === "dashboard")} onClick={() => setPg("dashboard")}>Dashboard</button>
            <button style={tab(pg === "search")} onClick={() => setPg("search")}>Search</button>
            <button style={tab(pg === "tracker")} onClick={() => setPg("tracker")}>Tracker{tracker.length > 0 && ` (${tracker.length})`}</button>
            <button style={tab(pg === "replies")} onClick={() => setPg("replies")}>Replies ({SIMULATED_REPLIES.length})</button>
            <button style={{ ...tab(pg === "todo"), position: "relative" }} onClick={() => setPg("todo")}>
              To-Do<span style={{ position: "absolute", top: 2, right: 2, width: 7, height: 7, borderRadius: "50%", background: C.err }} />
            </button>
          </div>
        </nav>
      )}

      {/* LANDING */}
      {pg === "landing" && (
        <div style={{ textAlign: "center", padding: "80px 24px 40px", animation: "fadeIn 0.4s ease" }}>
          <div style={{ display: "inline-flex", padding: "5px 14px", borderRadius: "20px", background: C.primaryLight, fontSize: "13px", color: C.primaryDark, fontWeight: 600, marginBottom: "20px", gap: "6px", alignItems: "center" }}>🧭 AI-Powered Networking Agent</div>
          <h1 style={{ fontSize: "46px", fontWeight: 800, lineHeight: 1.15, marginBottom: "14px", maxWidth: "650px", margin: "0 auto 14px" }}>Stop applying blindly.<br />Start <span style={{ color: C.primary }}>connecting</span> smartly.</h1>
          <p style={{ fontSize: "17px", color: C.sub, maxWidth: "520px", margin: "0 auto 36px", lineHeight: 1.7 }}>CareerCompass finds the right people, crafts the perfect message, tracks every reply, and coaches you through coffee chats.</p>
          <button style={btn("primary")} onClick={() => setPg("onboard")}>Get Started →</button>
          <div style={{ maxWidth: "880px", margin: "24px auto 0", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px", padding: "0 24px" }}>
            {[{ i: "🎯", t: "Smart Discovery", d: "AI finds alumni, team leads, recruiters at your target companies" }, { i: "✉️", t: "Tailored Outreach", d: "LinkedIn notes under 300 chars. Emails with depth. Auto-matched style." }, { i: "🤖", t: "Coffee Chat Sim", d: "Practice with an AI that role-plays as your actual contact" }].map((f, idx) => (
              <div key={idx} style={card}><div style={{ fontSize: "26px", marginBottom: "10px" }}>{f.i}</div><h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "6px" }}>{f.t}</h3><p style={{ fontSize: "13px", color: C.sub, lineHeight: 1.5 }}>{f.d}</p></div>
            ))}
          </div>
        </div>
      )}

      {/* ONBOARDING */}
      {pg === "onboard" && (
        <BuildProfile
          isSubmitting={busy}
          initialData={onboardingFormData}
          onSubmit={(profile) => {
            setOnboardingFormData(profile);
            setResume(profile.resume);
            setUploadedResumeFile(profile.resumeFile || null);
            setUploadedResumeFileName(profile.resumeFileName || "");
            setSelectedTargetCompanies(profile.targetCompanies || []);
            extractProfile(profile);
          }}
        />
      )}

      {/* DASHBOARD */}
      {pg === "dashboard" && profile && (
        <div style={wrap}>
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div><h1 style={{ fontSize: "24px", fontWeight: 800 }}>Welcome, {profile.name?.split(" ")[0]} 👋</h1><p style={{ fontSize: "14px", color: C.sub }}>{profile.title} · {profile.location}</p></div>
              <button style={btn("ghost")} onClick={() => setPg("onboard")}>Edit</button>
            </div>
            {uploadedResumeFileName && (
              <p style={{ fontSize: "12px", color: C.sub, marginTop: "8px" }}>
                Uploaded resume on file: {uploadedResumeFileName}
                {uploadedResumeFile ? ` (${Math.max(1, Math.round(uploadedResumeFile.size / 1024))} KB)` : ""}
              </p>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "12px" }}>{profile.skills?.map((sk, i) => <span key={i} style={tag}>{sk}</span>)}</div>
          </div>

          <h2 style={{ fontSize: "18px", fontWeight: 700, marginTop: "28px", marginBottom: "12px" }}>Target Companies</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px" }}>
            {companyCards.map(co => (
              <div key={co.n} style={{ ...card, cursor: "pointer", border: selCo === co.n ? `2px solid ${C.primary}` : `1px solid ${C.border}`, padding: "18px" }} onClick={() => { setSelCo(co.n); setSelCt(null); setMsg(""); setFoundEmail(null); }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}><div style={av(co.c)}>{co.l}</div><div><h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0 }}>{co.n}</h3><p style={{ fontSize: "12px", color: C.primary, fontWeight: 600, margin: 0 }}>{DEMO_CONTACTS[co.n]?.length || 0} contacts</p></div></div>
              </div>
            ))}
          </div>

          {selCo && (
            <div style={{ marginTop: "24px", animation: "fadeIn 0.3s ease" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "10px" }}>Contacts at {selCo}</h2>
              {(DEMO_CONTACTS[selCo] || []).length === 0 && (
                <div style={{ ...card, padding: "16px" }}>
                  <p style={{ fontSize: "13px", color: C.sub }}>
                    No demo contacts available for {selCo} yet.
                  </p>
                </div>
              )}
              {(DEMO_CONTACTS[selCo] || []).map(ct => (
                <div key={ct.id} style={{ ...card, cursor: "pointer", border: selCt?.id === ct.id ? `2px solid ${C.primary}` : `1px solid ${C.border}`, padding: "18px" }} onClick={() => { setSelCt(ct); setMsg(""); setFoundEmail(null); }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      <div style={av()}>{ct.name[0]}</div>
                      <div>
                        <h3 style={{ fontSize: "14px", fontWeight: 700, margin: 0 }}>{ct.name}</h3>
                        <p style={{ fontSize: "12px", color: C.sub, margin: "1px 0" }}>{ct.role} · {ct.tenure}</p>
                        <p style={{ fontSize: "11px", color: C.muted }}>{ct.school}</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}><span style={badge(ct.type)}>{ct.type}</span><span style={{ fontSize: "10px", color: C.muted, background: "#f5f5f4", padding: "2px 8px", borderRadius: "10px" }}>{MESSAGE_STYLE_MAP[ct.type]?.label}</span></div>
                  </div>
                  {selCt?.id === ct.id && msg && (
                    <div style={{ marginTop: "10px" }}>
                      <p style={{ fontSize: "11px", color: C.sub, marginBottom: "6px" }}>
                        {msgPlat === "linkedin" ? "LinkedIn note" : "Email draft"} · {msgPlat === "linkedin" ? `${msg.length}/300 chars` : "Personalized"}
                      </p>
                      <div style={{ ...mbox, padding: "12px 14px" }}>{msg}</div>
                    </div>
                  )}
                  <p style={{ fontSize: "12px", color: C.sub, marginTop: "8px", lineHeight: 1.5 }}>{ct.bio}</p>
                  {selCt?.id === ct.id && (
                    <div style={{ marginTop: "14px", animation: "fadeIn 0.2s ease" }}>
                      <div style={{ height: 1, background: C.border, margin: "12px 0" }} />
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <button style={btn("primary")} onClick={e => { e.stopPropagation(); genMsg(ct, "linkedin"); }}>🔗 LinkedIn (300 chars)</button>
                        <button style={btn("secondary")} onClick={e => { e.stopPropagation(); genMsg(ct, "email"); }}>✉️ Email</button>
                        <button style={btn("ghost")} onClick={e => { e.stopPropagation(); startSim(ct); }}>🎙️ Practice Chat</button>
                        <button style={{ ...btn("amber"), fontSize: "12px", padding: "8px 14px" }} onClick={e => { e.stopPropagation(); lookupEmail(ct.name, ct.company); }}>🔍 Find Email</button>
                      </div>
                      {foundEmail && (
                        <div style={{ marginTop: "10px", padding: "12px 14px", background: foundEmail.confidence > 50 ? C.okLight : C.accentLight, borderRadius: "10px", fontSize: "13px", animation: "fadeIn 0.3s ease", border: `1px solid ${foundEmail.confidence > 50 ? C.ok + "33" : C.accent + "33"}` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <span style={{ fontWeight: 700, color: foundEmail.confidence > 50 ? C.ok : C.accent }}>📧 {foundEmail.email}</span>
                              {foundEmail.verified && <span style={{ marginLeft: "8px", fontSize: "11px", color: C.ok, fontWeight: 600 }}>✓ Verified</span>}
                            </div>
                            <span style={{ fontSize: "11px", color: C.muted }}>
                              {foundEmail.confidence > 0 ? `${foundEmail.confidence}% confidence` : ""}
                            </span>
                          </div>
                          <p style={{ fontSize: "11px", color: C.sub, margin: "4px 0 0" }}>via {foundEmail.source}</p>
                          {foundEmail.position && <p style={{ fontSize: "11px", color: C.muted, margin: "2px 0 0" }}>Position: {foundEmail.position}</p>}
                          <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                            <button style={{ ...btn("primary"), fontSize: "11px", padding: "5px 10px" }} onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(foundEmail.email); }}>📋 Copy Email</button>
                            <button style={{ ...btn("secondary"), fontSize: "11px", padding: "5px 10px" }} onClick={e => { e.stopPropagation(); window.open(`mailto:${foundEmail.email}`, "_blank"); }}>✉️ Send Email</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {autoStep >= 0 && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.2s ease" }}>
              <div style={{ background: "#fff", borderRadius: "20px", padding: "0", maxWidth: "520px", width: "92%", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
                {/* Fake browser chrome */}
                <div style={{ background: "#f5f5f4", padding: "10px 16px", display: "flex", alignItems: "center", gap: "8px", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", gap: "6px" }}><div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ef4444" }} /><div style={{ width: 12, height: 12, borderRadius: "50%", background: "#f59e0b" }} /><div style={{ width: 12, height: 12, borderRadius: "50%", background: "#22c55e" }} /></div>
                  <div style={{ flex: 1, background: "#fff", borderRadius: "6px", padding: "4px 12px", fontSize: "12px", color: C.muted, border: `1px solid ${C.border}` }}>
                    {autoStep >= 0 && autoContact ? `linkedin.com/in/${autoContact.name.toLowerCase().replace(/\s/g, "")}` : "linkedin.com"}
                  </div>
                </div>

                {/* Simulated LinkedIn UI */}
                <div style={{ padding: "24px", background: "#fff" }}>
                  {/* Profile header simulation */}
                  <div style={{ display: "flex", gap: "14px", alignItems: "center", marginBottom: "20px", padding: "16px", background: "#f8fafc", borderRadius: "12px", border: `1px solid ${C.border}` }}>
                    <div style={{ ...av(C.primary), width: 52, height: 52, fontSize: "18px" }}>{autoContact?.name?.[0] || "?"}</div>
                    <div>
                      <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: C.text }}>{autoContact?.name}</h3>
                      <p style={{ fontSize: "13px", color: C.sub, margin: "2px 0" }}>{autoContact?.role} at {autoContact?.company}</p>
                      <p style={{ fontSize: "11px", color: C.muted }}>{autoContact?.school}</p>
                    </div>
                  </div>

                  {/* Steps */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {AUTO_STEPS.map((step, i) => {
                      const isDone = i < autoStep;
                      const isActive = i === autoStep;
                      const isPending = i > autoStep;
                      return (
                        <div key={i} style={{
                          display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "10px",
                          background: isDone ? C.okLight : isActive ? C.primaryLight : "#fafaf9",
                          border: `1px solid ${isActive ? C.primary + "55" : isDone ? C.ok + "33" : "transparent"}`,
                          transition: "all 0.4s ease",
                          opacity: isPending ? 0.4 : 1,
                          transform: isActive ? "scale(1.02)" : "scale(1)",
                        }}>
                          <span style={{ fontSize: "20px", transition: "all 0.3s" }}>{isDone ? "✅" : isActive ? step.icon : "⬜"}</span>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: "13px", fontWeight: isActive ? 700 : isDone ? 600 : 400, color: isPending ? C.muted : C.text, margin: 0 }}>{step.label}</p>
                            {(isActive || isDone) && <p style={{ fontSize: "11px", color: C.sub, margin: "2px 0 0", transition: "all 0.3s" }}>{step.sub}</p>}
                          </div>
                          {isActive && <span style={{ width: 18, height: 18, border: `2.5px solid ${C.primary}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />}
                          {isDone && <span style={{ fontSize: "11px", color: C.ok, fontWeight: 600 }}>Done</span>}
                        </div>
                      );
                    })}
                  </div>

                  {/* Message preview when pasting step */}
                  {autoStep >= 3 && msg && (
                    <div style={{ marginTop: "16px", padding: "12px 14px", background: "#f0f9ff", borderRadius: "8px", border: "1px solid #bae6fd", animation: "fadeIn 0.4s ease" }}>
                      <p style={{ fontSize: "11px", fontWeight: 600, color: "#0369a1", marginBottom: "4px" }}>📝 Message being sent:</p>
                      <p style={{ fontSize: "12px", color: C.text, lineHeight: 1.5, margin: 0 }}>{msg.length > 200 ? msg.substring(0, 200) + "..." : msg}</p>
                    </div>
                  )}

                  {/* Success state */}
                  {autoStep === 4 && (
                    <div style={{ marginTop: "16px", textAlign: "center", padding: "12px", background: C.okLight, borderRadius: "10px", border: `1px solid ${C.ok}33`, animation: "fadeIn 0.3s ease" }}>
                      <p style={{ fontSize: "14px", fontWeight: 700, color: C.ok, margin: 0 }}>🎉 Connection request sent successfully!</p>
                      <p style={{ fontSize: "12px", color: C.sub, margin: "4px 0 0" }}>Added to your networking tracker</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SEARCH */}
      {pg === "search" && (
        <div style={wrap}>
          <h1 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "6px" }}>Search</h1>
          <p style={{ fontSize: "14px", color: C.sub, marginBottom: "20px" }}>Find jobs and discover employees at target companies</p>
          <div style={{ display: "flex", gap: "6px", marginBottom: "20px" }}><button style={tab(sTab === "jobs")} onClick={() => setSTab("jobs")}>Job Postings</button><button style={tab(sTab === "people")} onClick={() => setSTab("people")}>Employee / Company</button></div>

          {sTab === "jobs" && <>
            <div style={{ ...card, padding: "16px", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
              <input style={{ ...inp, width: "180px" }} placeholder="Location..." value={jf.location} onChange={e => setJf(p => ({ ...p, location: e.target.value }))} />
              <select style={sel} value={jf.level} onChange={e => setJf(p => ({ ...p, level: e.target.value }))}><option value="">All Levels</option><option>Entry</option><option>Mid</option><option>Senior</option></select>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: C.sub, cursor: "pointer" }}><input type="checkbox" checked={jf.hideGhost} onChange={e => setJf(p => ({ ...p, hideGhost: e.target.checked }))} /> Hide ghost jobs</label>
              <span style={{ fontSize: "12px", color: C.muted, marginLeft: "auto" }}>{filtJobs.length} results</span>
            </div>
            {filtJobs.map(j => (
              <div key={j.id} style={{ ...card, padding: "18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div><h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0 }}>{j.title}</h3><p style={{ fontSize: "13px", color: C.sub, margin: "3px 0" }}>{j.company} · {j.location}</p><div style={{ display: "flex", gap: "6px", marginTop: "6px" }}><span style={tag}>{j.level}</span><span style={{ ...tag, background: "#f5f5f4", color: C.sub }}>{j.posted}</span>{j.ghost && <span style={{ ...tag, background: C.errLight, color: C.err }}>⚠️ Ghost job</span>}</div></div>
                <button style={btn("secondary")} onClick={() => { setSelCo(j.company); setPg("dashboard"); }}>View Contacts →</button>
              </div>
            ))}
          </>}
          {sTab === "people" && <>
            <div style={{ ...card, padding: "16px" }}><input style={inp} placeholder="Search company, name, or role..." value={coSearch} onChange={e => setCoSearch(e.target.value)} /></div>
            {coSearch && searchCts.length > 0 ? searchCts.map(ct => (
              <div key={ct.id} style={{ ...card, padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}><div style={av()}>{ct.name[0]}</div><div><h3 style={{ fontSize: "14px", fontWeight: 700, margin: 0 }}>{ct.name}</h3><p style={{ fontSize: "12px", color: C.sub }}>{ct.role} at {ct.company}</p></div></div>
                <div style={{ display: "flex", gap: "6px" }}><span style={badge(ct.type)}>{ct.type}</span><button style={{ ...btn("primary"), fontSize: "12px", padding: "6px 12px" }} onClick={() => { setSelCo(ct.company); setSelCt(ct); setPg("dashboard"); }}>View →</button></div>
              </div>
            )) : <p style={{ fontSize: "14px", color: C.muted, textAlign: "center", padding: "40px" }}>{coSearch ? "No results." : "Type to search."}</p>}
          </>}
        </div>
      )}

      {/* TRACKER */}
      {pg === "tracker" && (
        <div style={wrap}>
          <h1 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "6px" }}>Networking Tracker</h1>
          <p style={{ fontSize: "14px", color: C.sub, marginBottom: "16px" }}>Track outreach, replies, and follow-ups</p>
          <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap" }}>{STATUS_LIST.map(st => <button key={st} style={tab(stFilt === st)} onClick={() => setStFilt(st)}>{st}</button>)}</div>
          {filtTrack.length === 0 ? <div style={{ ...card, textAlign: "center", padding: "50px" }}><p style={{ fontSize: "32px", marginBottom: "10px" }}>📭</p><p style={{ fontSize: "14px", color: C.sub }}>No contacts in this category.</p><button style={{ ...btn("primary"), marginTop: "14px" }} onClick={() => setPg("dashboard")}>Discover Contacts →</button></div>
            : filtTrack.map((ct, i) => (
              <div key={i} style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}><div style={av()}>{ct.name[0]}</div><div><h3 style={{ fontSize: "14px", fontWeight: 700, margin: 0 }}>{ct.name}</h3><p style={{ fontSize: "12px", color: C.sub }}>{ct.role} at {ct.company}</p></div></div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}><div style={sDot(ct.status)} /><select style={sel} value={ct.status} onChange={e => setTracker(p => p.map(c => c.id === ct.id ? { ...c, status: e.target.value } : c))}>{["Sent", "Replied", "No Response", "Coffee Chat Scheduled", "Referral Received"].map(o => <option key={o}>{o}</option>)}</select></div>
                </div>
                <div style={{ height: 1, background: C.border, margin: "12px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}><div style={{ display: "flex", gap: "16px" }}><span style={{ color: C.muted }}>Sent: {ct.dateSent}</span>{ct.followUpDue && <span style={{ color: C.accent, fontWeight: 600 }}>Follow-up: {ct.followUpDue}</span>}</div><button style={{ ...btn("secondary"), fontSize: "12px", padding: "6px 12px" }} onClick={() => startSim(ct)}>Practice Chat</button></div>
              </div>
            ))}
        </div>
      )}

      {/* REPLIES */}
      {pg === "replies" && (
        <div style={wrap}>
          <h1 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "6px" }}>Reply Detection</h1>
          <p style={{ fontSize: "14px", color: C.sub, marginBottom: "20px" }}>Replies from LinkedIn and Gmail, detected via extension + Gmail API</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ background: "#fff", borderRadius: "14px", border: `2px solid ${C.primary}`, overflow: "hidden", boxShadow: "0 4px 16px rgba(13,148,136,0.12)" }}>
              <div style={{ background: C.primary, color: "#fff", padding: "12px 18px", display: "flex", justifyContent: "space-between" }}><span style={{ fontWeight: 700, fontSize: "14px" }}>🧭 CareerCompass Extension</span><span style={{ fontSize: "11px", opacity: .8 }}>LinkedIn + Gmail</span></div>
              <div style={{ padding: "14px" }}>
                <div style={{ background: C.primaryLight, borderRadius: "8px", padding: "10px 12px", marginBottom: "12px" }}><p style={{ fontSize: "12px", fontWeight: 700, color: C.primaryDark, margin: 0 }}>🔔 {SIMULATED_REPLIES.length} new replies</p></div>
                {SIMULATED_REPLIES.map((r, i) => (
                  <div key={i} style={{ padding: "12px 0", borderBottom: i < SIMULATED_REPLIES.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}><div style={av(r.platform === "LinkedIn" ? "#0077B5" : "#EA4335")}>{r.from[0]}</div><div><p style={{ fontSize: "13px", fontWeight: 700, margin: 0 }}>{r.from}</p><p style={{ fontSize: "10px", color: C.muted, margin: 0 }}>{r.company} · {r.platform} · {r.time}</p></div></div>
                    <p style={{ fontSize: "11px", color: C.sub, margin: "6px 0", lineHeight: 1.4 }}>{r.preview}</p>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}><button style={{ ...btn("primary"), fontSize: "11px", padding: "5px 10px" }} onClick={() => genFollowUp(r)} disabled={busy}>Generate Follow-up</button><span style={{ fontSize: "10px", color: C.accent, fontWeight: 600 }}>💡 {r.action}</span></div>
                  </div>
                ))}
              </div>
            </div>
            <div>{fuData ? <div style={{ ...card, animation: "fadeIn 0.3s ease" }}><h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "8px" }}>Follow-up for {fuData.reply.from}</h3><div style={mbox}>{fuData.followUp}</div><div style={{ marginTop: "12px", display: "flex", gap: "6px" }}><button style={btn("primary")} onClick={() => navigator.clipboard.writeText(fuData.followUp)}>📋 Copy</button><button style={btn("secondary")}>🔗 LinkedIn</button><button style={btn("secondary")}>✉️ Gmail</button></div></div> : <div style={{ ...card, textAlign: "center", padding: "50px", color: C.muted }}><p style={{ fontSize: "28px", marginBottom: "8px" }}>💬</p><p style={{ fontSize: "13px" }}>Click "Generate Follow-up" to see the AI response.</p></div>}</div>
          </div>
        </div>
      )}

      {/* TO-DO */}
      {pg === "todo" && (
        <div style={wrap}>
          <h1 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "6px" }}>To-Do & Notifications</h1>
          <p style={{ fontSize: "14px", color: C.sub, marginBottom: "20px" }}>Action items, replies, and follow-up reminders</p>
          <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>{["all", "reply", "follow-up"].map(f => <button key={f} style={tab(nFilt === f)} onClick={() => setNFilt(f)}>{f === "all" ? "All" : f === "reply" ? "Replies" : "Follow-ups"} ({f === "all" ? NOTIFICATIONS.length : NOTIFICATIONS.filter(n => n.type === f).length})</button>)}</div>
          {filtNotif.map(n => (
            <div key={n.id} style={{ ...card, padding: "16px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: n.type === "reply" ? C.ok : C.accent, flexShrink: 0, marginTop: "6px" }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><div><p style={{ fontSize: "14px", fontWeight: 700, margin: 0 }}>{n.message}</p><p style={{ fontSize: "12px", color: C.sub, margin: "3px 0" }}>{n.detail}</p></div><span style={{ fontSize: "11px", color: C.muted, whiteSpace: "nowrap" }}>{n.time}</span></div>
                <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
                  {n.type === "reply" && <button style={{ ...btn("primary"), fontSize: "12px", padding: "6px 12px" }} onClick={() => { const r = SIMULATED_REPLIES.find(x => x.from === n.contact); if (r) genFollowUp(r); setPg("replies"); }}>Generate Follow-up →</button>}
                  {n.type === "follow-up" && <button style={{ ...btn("amber"), fontSize: "12px", padding: "6px 12px" }} onClick={() => { const ct = allCts.find(c => c.name === n.contact); if (ct) { setSelCt(ct); setSelCo(ct.company); genMsg(ct, "linkedin"); setPg("dashboard"); } }}>Send Follow-up →</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SIMULATOR */}
      {pg === "sim" && (
        <div style={{ maxWidth: "700px", margin: "0 auto", padding: "28px 24px", animation: "fadeIn 0.3s ease" }}>
          <button style={btn("ghost")} onClick={() => setPg("dashboard")}>← Back</button>
          <div style={{ ...card, marginTop: "14px" }}><div style={{ display: "flex", gap: "10px", alignItems: "center" }}><div style={av()}>{simCt?.name?.[0]}</div><div><h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>Coffee Chat with {simCt?.name}</h2><p style={{ fontSize: "12px", color: C.sub }}>{simCt?.role} at {simCt?.company} · AI Simulation</p></div></div></div>
          <div style={{ ...card, minHeight: "380px", display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", marginBottom: "14px" }}>
              {chat.map((m, i) => <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}><div style={m.role === "user" ? { background: C.primary, color: "#fff", padding: "10px 14px", borderRadius: "14px 14px 4px 14px", maxWidth: "78%", fontSize: "14px", lineHeight: 1.5 } : { background: "#f5f5f4", color: C.text, padding: "10px 14px", borderRadius: "14px 14px 14px 4px", maxWidth: "78%", fontSize: "14px", lineHeight: 1.5 }}>{m.content}</div></div>)}
              {busy && <div style={{ display: "flex" }}><div style={{ background: "#f5f5f4", padding: "10px 14px", borderRadius: "14px 14px 14px 4px", fontSize: "14px", color: C.muted }}>typing...</div></div>}
              <div ref={chatEnd} />
            </div>
            <div style={{ display: "flex", gap: "8px" }}><input style={{ ...inp, flex: 1 }} placeholder="Type your message..." value={chatIn} onChange={e => setChatIn(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()} /><button style={btn("primary")} onClick={sendChat} disabled={busy}>Send</button></div>
          </div>
          {chat.length > 4 && <div style={card}><h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "8px" }}>Generate Post-Chat Follow-ups</h3><textarea style={{ ...inp, minHeight: "70px", resize: "vertical" }} placeholder="How did the chat go?" value={chatSum} onChange={e => setChatSum(e.target.value)} /><button style={{ ...btn("primary"), marginTop: "10px" }} onClick={genPostChat} disabled={busy}>{busy ? "Generating..." : "Generate Follow-ups →"}</button></div>}
        </div>
      )}

      {/* FOLLOW-UP */}
      {pg === "fu" && (
        <div style={{ maxWidth: "700px", margin: "0 auto", padding: "28px 24px", animation: "fadeIn 0.3s ease" }}>
          <button style={btn("ghost")} onClick={() => setPg("sim")}>← Back</button>
          <div style={{ marginTop: "16px" }}><h1 style={{ fontSize: "22px", fontWeight: 800 }}>Post-Chat Follow-ups</h1><p style={{ fontSize: "14px", color: C.sub, marginTop: "4px" }}>For {fuData?.reply?.from} at {fuData?.reply?.company}</p><div style={{ ...card, marginTop: "16px" }}><div style={mbox}>{fuData?.followUp}</div><div style={{ marginTop: "14px", display: "flex", gap: "8px" }}><button style={btn("primary")} onClick={() => navigator.clipboard.writeText(fuData?.followUp || "")}>📋 Copy All</button><button style={btn("secondary")} onClick={() => { if (simCt) addTrack(simCt, "Coffee Chat Scheduled"); setPg("tracker"); }}>✓ Add to Tracker</button></div></div></div>
        </div>
      )}
    </div>
  );
}