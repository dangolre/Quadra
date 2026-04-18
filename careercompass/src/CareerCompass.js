import { useState, useEffect, useRef } from "react";

// ═══════════════════════════════════════════════════
// CONFIGURATION & CONSTANTS
// ═══════════════════════════════════════════════════
// Replace with your real Hunter.io API key (free tier: 25 lookups/month)
// Get one at https://hunter.io/api-keys
const HUNTER_API_KEY = process.env.REACT_APP_HUNTER_API_KEY;
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

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
  const backendBase = `${window.location.protocol}//${window.location.hostname}:3001`;
  const apiBase = "/api";
  const readStoredJson = (key, fallback) => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };
  const [pg, setPg] = useState("landing");
  const [profile, setProfile] = useState(() => readStoredJson("careercompass_profile", null));
  const [resume, setResume] = useState(() => {
    try {
      return window.localStorage.getItem("careercompass_resume") || "";
    } catch {
      return "";
    }
  });
  const [selCo, setSelCo] = useState(null);
  const [selCt, setSelCt] = useState(null);
  const [tracker, setTracker] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgPlat, setMsgPlat] = useState("linkedin");
  const [showFullMsg, setShowFullMsg] = useState(false);
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
  const [automationStatus, setAutomationStatus] = useState(null);
  const [automationBusy, setAutomationBusy] = useState(false);
  const [approvalBusy, setApprovalBusy] = useState(false);
  const [trackerBusy, setTrackerBusy] = useState(false);
  const [trackerError, setTrackerError] = useState("");
  const [trackerMessage, setTrackerMessage] = useState("");
  const [oauthTrackerTriggered, setOauthTrackerTriggered] = useState(false);
  const [companyPeople, setCompanyPeople] = useState([]);
  const [companySearchBusy, setCompanySearchBusy] = useState(false);
  const [companySearchError, setCompanySearchError] = useState("");
  const [peopleFilt, setPeopleFilt] = useState({ name: "", role: "", type: "", minConfidence: 0 });
  const chatEnd = useRef(null);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);
  useEffect(() => { refreshAutomationStatus(); }, []);
  useEffect(() => { if (profile?.name) syncProfileToAutomation(profile); }, [profile]);
  useEffect(() => {
    try {
      if (profile) window.localStorage.setItem("careercompass_profile", JSON.stringify(profile));
      else window.localStorage.removeItem("careercompass_profile");
    } catch {}
  }, [profile]);
  useEffect(() => {
    try {
      if (resume) window.localStorage.setItem("careercompass_resume", resume);
      else window.localStorage.removeItem("careercompass_resume");
    } catch {}
  }, [resume]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gmail") === "connected" && automationStatus?.gmailConnected && !oauthTrackerTriggered) {
      setOauthTrackerTriggered(true);
      if (profile?.name) setPg("dashboard");
      runTrackerPipeline({ silent: true });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [automationStatus, oauthTrackerTriggered, profile]);

  const refreshAutomationStatus = async () => {
    try {
      const response = await fetch(`${apiBase}/automation/status`);
      const data = await response.json();
      if (!profile?.name && data.profile?.name) {
        setProfile(data.profile);
      }
      setAutomationStatus(data);
      return data;
    } catch {
      setAutomationStatus(null);
      return null;
    }
  };

  const syncProfileToAutomation = async (nextProfile) => {
    try {
      const response = await fetch(`${apiBase}/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: nextProfile, resumeText: resume }),
      });
      if (!response.ok) {
        throw new Error("Profile sync failed.");
      }
      return await refreshAutomationStatus();
    } catch {}
    return null;
  };

  const connectGmailAutomation = () => {
    window.location.href = `${backendBase}/api/google/oauth/start`;
  };

  const runNightlyAutomationNow = async (silent = false) => {
    setAutomationBusy(true);
    try {
      const response = await fetch(`${apiBase}/automation/run`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Automation run failed.");
      await refreshAutomationStatus();
      if (!silent) alert(`Tracker finished. Applications found: ${data.result?.applicationsFound || 0}. Drafts ready for review: ${data.result?.draftsPrepared || 0}.`);
    } catch (error) {
      if (!silent) alert(error.message || "Automation run failed.");
    } finally {
      setAutomationBusy(false);
    }
  };

  const approveOutreachDrafts = async (draftIds = []) => {
    setApprovalBusy(true);
    try {
      const response = await fetch(`${apiBase}/automation/send-approved`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftIds }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Sending approved drafts failed.");
      await refreshAutomationStatus();
      alert(`Sent ${data.result?.sentCount || 0} email${(data.result?.sentCount || 0) === 1 ? "" : "s"}.`);
    } catch (error) {
      alert(error.message || "Sending approved drafts failed.");
    } finally {
      setApprovalBusy(false);
    }
  };

  const syncApplications = async ({ silent = false } = {}) => {
    setTrackerBusy(true);
    setTrackerError("");
    if (!silent) setTrackerMessage("");
    try {
      const response = await fetch(`${apiBase}/applications/sync`, { method: "POST" });
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/html")) {
        throw new Error("Backend not reachable. Make sure `npm run server` is running on port 3001.");
      }
      const data = await response.json();
      if (!response.ok || data.ok === false) {
        throw new Error(data.error || "Application sync failed.");
      }
      await refreshAutomationStatus();
      const count = data.applications?.length || 0;
      if (!silent) {
        setTrackerMessage(
          count
            ? `Found ${count} application${count === 1 ? "" : "s"} in your Gmail.`
            : "No application emails detected in the last 30 days."
        );
      }
      return data;
    } catch (error) {
      const nextError = error.message || "Application sync failed.";
      setTrackerError(nextError);
      throw new Error(nextError);
    } finally {
      setTrackerBusy(false);
    }
  };

  const runTrackerPipeline = async ({ silent = false } = {}) => {
    if (!automationStatus?.gmailConnected) {
      connectGmailAutomation();
      return;
    }

    setTrackerError("");
    if (!silent) setTrackerMessage("Running pipeline...");

    try {
      const syncData = await syncApplications({ silent: true });
      const applicationsFound = syncData?.applications?.length || 0;
      let latestStatus = automationStatus;
      if (profile?.name) {
        latestStatus = await syncProfileToAutomation(profile) || latestStatus;
      } else {
        latestStatus = await refreshAutomationStatus() || latestStatus;
      }

      if (!latestStatus?.profileSynced) {
        setTrackerMessage(
          applicationsFound
            ? `Tracked ${applicationsFound} application${applicationsFound === 1 ? "" : "s"} from Gmail. Add or restore your profile to prepare outreach drafts.`
            : "No application emails were detected in Gmail."
        );
        return;
      }

      setAutomationBusy(true);
      const response = await fetch(`${apiBase}/automation/run`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Pipeline run failed.");

      await refreshAutomationStatus();
      const applicationsFoundWithDrafts = data.result?.applicationsFound || applicationsFound;
      const draftsPrepared = data.result?.draftsPrepared || 0;
      setTrackerMessage(
        `Pipeline complete. Tracked ${applicationsFoundWithDrafts} application${applicationsFoundWithDrafts === 1 ? "" : "s"} and prepared ${draftsPrepared} outreach draft${draftsPrepared === 1 ? "" : "s"} for review.`
      );
    } catch (error) {
      const nextError = error.message || "Pipeline run failed.";
      setTrackerError(nextError);
      if (!silent) setTrackerMessage("");
    } finally {
      setAutomationBusy(false);
    }
  };

  const searchCompanyPeople = async () => {
    if (!coSearch.trim()) return;
    setCompanySearchBusy(true);
    setCompanySearchError("");
    try {
      const response = await fetch(`${apiBase}/hunter/company-search?q=${encodeURIComponent(coSearch.trim())}`);
      if ((response.headers.get("content-type") || "").includes("text/html")) {
        throw new Error("The backend returned HTML instead of JSON. Make sure `npm run server` is running on port 3001.");
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Hunter search failed.");
      setCompanyPeople(data.people || []);
    } catch (error) {
      setCompanyPeople([]);
      setCompanySearchError(error.message || "Hunter search failed.");
    } finally {
      setCompanySearchBusy(false);
    }
  };

  // AI
  const ai = async (sys, usr) => {
    try {
      if (!GEMINI_API_KEY) return "Gemini API key missing. Add REACT_APP_GEMINI_API_KEY to .env and restart the app.";
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: sys }] },
          contents: [{ role: "user", parts: [{ text: usr }] }],
          generationConfig: { maxOutputTokens: 1000 },
        }),
      });
      const d = await r.json();
      if (!r.ok) return d.error?.message || "Gemini request failed.";
      return d.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim() || "No response.";
    } catch {
      return "AI unavailable. Please retry.";
    }
  };
  const aiChat = async (sys, msgs) => {
    try {
      if (!GEMINI_API_KEY) return "Gemini API key missing. Add REACT_APP_GEMINI_API_KEY to .env and restart the app.";
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: sys }] },
          contents: msgs.map((msg) => ({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content }],
          })),
          generationConfig: { maxOutputTokens: 1000 },
        }),
      });
      const d = await r.json();
      if (!r.ok) return d.error?.message || "Gemini request failed.";
      return d.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim() || "No response.";
    } catch {
      return "AI unavailable.";
    }
  };

  const extractProfile = async () => {
    if (!resume.trim()) return; setBusy(true);
    const r = await ai("Extract career profile as JSON: name, title, skills[], experience[{role,company,duration}], education[{school,degree,year}], interests[], location. No em dashes. JSON only.", `Extract profile:\n${resume}`);
    try { setProfile(JSON.parse(r.replace(/```json\n?|```\n?/g, "").trim())); setPg("dashboard"); }
    catch { setProfile({ name: "Demo User", title: "Aspiring Data Engineer", skills: ["Python","SQL","Data Pipelines","AWS","Spark"], experience: [{ role: "Data Analyst Intern", company: "Tech Corp", duration: "6 months" }], education: [{ school: "University of Louisiana Monroe", degree: "BS Computer Science", year: "2025" }], interests: ["Data Engineering","Cloud Computing"], location: "Monroe, LA" }); setPg("dashboard"); }
    setBusy(false);
  };

  const genMsg = async (contact, platform) => {
    if (!profile || !contact) return; setBusy(true); setMsg(""); setMsgPlat(platform);
    const st = MESSAGE_STYLE_MAP[contact.type]?.style || "conversational";
    const limit = platform === "linkedin" ? "STRICTLY under 300 characters. LinkedIn connection request note." : "Email format, 150-250 words.";
    const guide = st === "direct" ? "Professional, direct. State interest, highlight qualifications, ask for next step." : st === "curiosity" ? "Lead with curiosity about their experience. Ask thoughtful questions. Warm." : "Warm, personal. Find common ground. Build rapport. Don't ask for favors upfront.";
    const r = await ai(`Networking message expert. Write ${st} ${platform} message.\nRules: Never start with "I came across" or "I hope this finds you well". No em dashes. ${limit} ${guide} Reference specific details. Feel human. Goal: referral/job. Use the sender information exactly as provided. Do not use placeholders such as [Your Name], [University], [Company], or [Title]. Write the full finished draft only.`,
      `SENDER: ${profile.name}, ${profile.title}. Skills: ${profile.skills?.join(", ")}. Education: ${profile.education?.map(e=>`${e.degree}, ${e.school}`).join("; ")}. Location: ${profile.location}.\nRECIPIENT: ${contact.name}, ${contact.role} at ${contact.company}. Type: ${contact.type}. School: ${contact.school}. Bio: ${contact.bio}.\nPlatform: ${platform}. ${platform==="linkedin"?"MUST be under 300 characters.":""}`);
    const cleaned = r
      .replace(/\[Your Name\]/gi, profile.name || "")
      .replace(/\[Your Title\]/gi, profile.title || "")
      .replace(/\[University\]/gi, profile.education?.[0]?.school || "")
      .replace(/\[Company\]/gi, contact.company || "")
      .replace(/\[Title\]/gi, profile.title || "");
    setMsg(cleaned); setBusy(false);
  };

  const startSim = (ct) => { setSimCt(ct); setChat([{ role:"assistant", content:`Hi! Thanks for setting up this chat. I'm ${ct.name}, ${ct.role} at ${ct.company}. Tell me about yourself, what got you interested in this field?` }]); setChatSum(""); setPg("sim"); };

  const sendChat = async () => {
    if (!chatIn.trim() || busy) return; const m = chatIn.trim(); setChatIn("");
    const ms = [...chat, { role:"user", content: m }]; setChat(ms); setBusy(true);
    const r = await aiChat(`Role-play as ${simCt.name}, ${simCt.role} at ${simCt.company}. Bio: ${simCt.bio}. School: ${simCt.school}. Stay in character. Friendly but professional. 2-4 sentences. No em dashes. After 4-5 good exchanges, hint you'd help.`, ms.map(x=>({role:x.role,content:x.content})));
    setChat([...ms, { role:"assistant", content: r }]); setBusy(false);
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
    [0,1,2,3,4].forEach((step, i) => setTimeout(() => {
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

  const addTrack = (ct, status="Sent") => {
    if (tracker.find(c=>c.id===ct.id)) return;
    setTracker(p=>[...p,{...ct,status,dateSent:new Date().toLocaleDateString(),followUpDue:status==="Sent"?"In 3 days":null}]);
  };

  const filtJobs = DEMO_JOBS.filter(j => { if (jf.hideGhost&&j.ghost) return false; if (jf.level&&j.level!==jf.level) return false; if (jf.location&&!j.location.toLowerCase().includes(jf.location.toLowerCase())) return false; return true; });
  const filtTrack = tracker.filter(c => stFilt==="All"?true:stFilt==="Needs Follow-up"?c.status==="Sent"||c.status==="No Response":c.status===stFilt);
  const filtNotif = NOTIFICATIONS.filter(n => nFilt==="all"?true:n.type===nFilt);
  const allCts = Object.values(DEMO_CONTACTS).flat();
  const searchCts = coSearch ? allCts.filter(c => c.company.toLowerCase().includes(coSearch.toLowerCase())||c.name.toLowerCase().includes(coSearch.toLowerCase())||c.role.toLowerCase().includes(coSearch.toLowerCase())) : [];
  const filtCompanyPeople = companyPeople.filter((person) => {
    if (peopleFilt.name && !person.name.toLowerCase().includes(peopleFilt.name.toLowerCase())) return false;
    if (peopleFilt.role && !person.role.toLowerCase().includes(peopleFilt.role.toLowerCase())) return false;
    if (peopleFilt.type && person.type !== peopleFilt.type) return false;
    if ((person.confidence || 0) < Number(peopleFilt.minConfidence || 0)) return false;
    return true;
  });

  // ═══ STYLES ═══
  const btn = (v="primary") => ({ padding:"10px 20px", borderRadius:"10px", border:"none", fontWeight:600, fontSize:"14px", cursor:"pointer", transition:"all 0.15s", fontFamily:"inherit",
    ...(v==="primary"?{background:C.primary,color:"#fff"}:v==="secondary"?{background:C.primaryLight,color:C.primaryDark}:v==="amber"?{background:C.accent,color:"#fff"}:v==="ghost"?{background:"transparent",color:C.sub}:{background:C.border,color:C.text}) });
  const card = { background:C.card, borderRadius:"14px", border:`1px solid ${C.border}`, padding:"24px", marginBottom:"16px", boxShadow:C.shadow };
  const badge = (t) => { const c=TC[t]||{bg:"#f5f5f4",text:"#44403c",border:"#e7e5e4"}; return { display:"inline-block",padding:"3px 10px",borderRadius:"20px",fontSize:"11px",fontWeight:600,background:c.bg,color:c.text,border:`1px solid ${c.border}` }; };
  const av = (color=C.primary) => ({ width:40,height:40,borderRadius:"50%",background:color,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:"14px",flexShrink:0 });
  const inp = { width:"100%",padding:"10px 14px",borderRadius:"10px",border:`1px solid ${C.border}`,fontSize:"14px",fontFamily:"inherit",outline:"none",boxSizing:"border-box",background:"#fff" };
  const sel = { padding:"8px 12px",borderRadius:"8px",border:`1px solid ${C.border}`,fontSize:"13px",fontFamily:"inherit",outline:"none",background:"#fff",cursor:"pointer" };
  const tag = { padding:"3px 10px",borderRadius:"6px",background:C.primaryLight,color:C.primaryDark,fontSize:"12px",fontWeight:500 };
  const tab = (a) => ({ padding:"8px 18px",borderRadius:"8px",border:"none",background:a?C.primary:"transparent",color:a?"#fff":C.sub,fontWeight:600,fontSize:"13px",cursor:"pointer",fontFamily:"inherit" });
  const mbox = { background:"#fafaf9",borderRadius:"10px",border:`1px solid ${C.border}`,padding:"16px",fontSize:"14px",lineHeight:1.7,color:C.text,whiteSpace:"pre-wrap" };
  const mboxArea = (platform) => ({ ...mbox, width:"100%",resize:"vertical",overflowY:"auto",minHeight:platform==="email"?"220px":"140px",fontFamily:"inherit",outline:"none" });
  const sDot = (st) => ({ width:9,height:9,borderRadius:"50%",flexShrink:0,background:st==="Replied"?C.ok:st==="Sent"?C.info:st==="Coffee Chat Scheduled"?C.accent:st==="Referral Received"?C.purple:C.muted });

  const wrap = { maxWidth:"1060px",margin:"0 auto",padding:"28px 24px",animation:"fadeIn 0.3s ease" };

  // ═══ RENDER ═══
  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:C.bg, minHeight:"100vh", color:C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        *{margin:0;box-sizing:border-box}
        button:hover:not(:disabled){opacity:.88}
        button[title]:hover{background:${C.primaryLight} !important;border-color:${C.primary} !important;transform:scale(1.08)}
        button:disabled{opacity:.5;cursor:not-allowed}
        input:focus,textarea:focus,select:focus{border-color:${C.primary};box-shadow:0 0 0 3px ${C.primary}22}
        ::selection{background:${C.primaryLight}}
      `}</style>

      {/* NAV */}
      {pg !== "landing" && (
        <nav style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 28px",background:"#fff",borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:100 }}>
          <div style={{ display:"flex",alignItems:"center",gap:"8px",fontWeight:700,fontSize:"18px",cursor:"pointer" }} onClick={()=>setPg(profile?"dashboard":"landing")}>
            <div style={{ width:32,height:32,borderRadius:"8px",background:C.primary,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:"14px" }}>🧭</div>
            CareerCompass
          </div>
          <div style={{ display:"flex",gap:"4px",flexWrap:"wrap" }}>
            <button style={tab(pg==="dashboard")} onClick={()=>setPg("dashboard")}>Dashboard</button>
            <button style={tab(pg==="search")} onClick={()=>setPg("search")}>Search</button>
            <button style={tab(pg==="tracker")} onClick={()=>setPg("tracker")}>Tracker{tracker.length>0&&` (${tracker.length})`}</button>
            <button style={tab(pg==="replies")} onClick={()=>setPg("replies")}>Replies ({SIMULATED_REPLIES.length})</button>
            <button style={{ ...tab(pg==="todo"),position:"relative" }} onClick={()=>setPg("todo")}>
              To-Do<span style={{ position:"absolute",top:2,right:2,width:7,height:7,borderRadius:"50%",background:C.err }} />
            </button>
          </div>
        </nav>
      )}

      {/* LANDING */}
      {pg==="landing" && (
        <div style={{ textAlign:"center",padding:"80px 24px 40px",animation:"fadeIn 0.4s ease" }}>
          <div style={{ display:"inline-flex",padding:"5px 14px",borderRadius:"20px",background:C.primaryLight,fontSize:"13px",color:C.primaryDark,fontWeight:600,marginBottom:"20px",gap:"6px",alignItems:"center" }}>🧭 AI-Powered Networking Agent</div>
          <h1 style={{ fontSize:"46px",fontWeight:800,lineHeight:1.15,marginBottom:"14px",maxWidth:"650px",margin:"0 auto 14px" }}>Stop applying blindly.<br/>Start <span style={{color:C.primary}}>connecting</span> smartly.</h1>
          <p style={{ fontSize:"17px",color:C.sub,maxWidth:"620px",margin:"0 auto 36px",lineHeight:1.7 }}>CareerCompass tracks the companies you applied to, finds the right people inside them, crafts the perfect message, and coaches you through coffee chats.</p>
          <button style={btn("primary")} onClick={()=>setPg("onboard")}>Get Started →</button>
          <div style={{ maxWidth:"880px",margin:"24px auto 0",display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"14px",padding:"0 24px" }}>
            {[{i:"🎯",t:"Smart Discovery",d:"AI finds alumni, team leads, recruiters at your target companies"},{i:"✉️",t:"Tailored Outreach",d:"LinkedIn notes under 300 chars. Emails with depth. Auto-matched style."},{i:"🤖",t:"Coffee Chat Sim",d:"Practice with an AI that role-plays as your actual contact"}].map((f,idx)=>(
              <div key={idx} style={card}><div style={{fontSize:"26px",marginBottom:"10px"}}>{f.i}</div><h3 style={{fontSize:"15px",fontWeight:700,marginBottom:"6px"}}>{f.t}</h3><p style={{fontSize:"13px",color:C.sub,lineHeight:1.5}}>{f.d}</p></div>
            ))}
          </div>
          <div style={{maxWidth:"880px",margin:"20px auto 0",padding:"0 24px"}}>
            <div style={{...card,textAlign:"left",background:"#fffcf2",border:`1px solid ${C.accent}44`}}>
              <p style={{fontSize:"11px",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:C.accent,marginBottom:"8px"}}>JobTracker</p>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"16px",flexWrap:"wrap"}}>
                <div>
                  <h3 style={{fontSize:"20px",fontWeight:800,marginBottom:"6px"}}>Track all the companies you applied to</h3>
                  <p style={{fontSize:"13px",color:C.sub,lineHeight:1.6,maxWidth:"560px"}}>CareerCompass keeps your application trail in one place, detects the company, and tees up the next move: find insiders, draft outreach, and send a gentle internal nudge.</p>
                </div>
                <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                  {!automationStatus?.gmailConnected && <button style={btn("ghost")} onClick={connectGmailAutomation}>Connect Gmail</button>}
                  <button style={btn("secondary")} onClick={() => runTrackerPipeline()} disabled={trackerBusy || automationBusy}>
                    {!automationStatus?.gmailConnected ? "Connect Gmail To Run Pipeline" : trackerBusy || automationBusy ? "Running Pipeline..." : "Run Pipeline"}
                  </button>
                </div>
              </div>
              {(trackerError || trackerMessage) && (
                <div style={{marginTop:"12px",padding:"10px 14px",borderRadius:"10px",fontSize:"12px",background:trackerError?C.errLight:C.primaryLight,color:trackerError?C.err:C.primaryDark,border:`1px solid ${trackerError?C.err+"33":C.primary+"33"}`}}>
                  {trackerError || trackerMessage}
                </div>
              )}
              <div style={{marginTop:"12px",display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:"8px"}}>
                {[
                  { label: "Gmail", value: automationStatus?.gmailConnected ? "Connected" : "Not connected" },
                  { label: "Profile", value: automationStatus?.profileSynced ? "Synced" : "Not synced" },
                  { label: "Tracked", value: `${automationStatus?.applications?.length || 0} apps` },
                  { label: "Drafts", value: `${automationStatus?.pendingOutreach?.length || 0} ready` },
                ].map((item) => (
                  <div key={item.label} style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"10px",padding:"10px 12px"}}>
                    <p style={{fontSize:"11px",color:C.muted,marginBottom:"4px",textTransform:"uppercase",letterSpacing:"0.04em"}}>{item.label}</p>
                    <p style={{fontSize:"13px",fontWeight:700,margin:0}}>{item.value}</p>
                  </div>
                ))}
              </div>
              {automationStatus?.applications?.length ? (
                <div style={{marginTop:"16px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:"8px"}}>
                    <p style={{fontSize:"12px",fontWeight:700,color:C.sub,margin:0}}>{automationStatus.applications.length} application{automationStatus.applications.length === 1 ? "" : "s"} tracked from Gmail</p>
                    <div style={{display:"flex",gap:"10px",alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
                      {automationStatus?.pendingOutreach?.length ? <p style={{fontSize:"11px",color:C.primaryDark,margin:0,fontWeight:700}}>{automationStatus.pendingOutreach.length} draft{automationStatus.pendingOutreach.length === 1 ? "" : "s"} ready</p> : null}
                      {automationStatus?.lastSyncAt && <p style={{fontSize:"11px",color:C.muted,margin:0}}>Last sync: {new Date(automationStatus.lastSyncAt).toLocaleString()}</p>}
                    </div>
                  </div>
                  <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"12px",overflow:"hidden"}}>
                    <div style={{display:"grid",gridTemplateColumns:"minmax(0,2fr) minmax(0,3fr) minmax(0,1fr)",gap:"12px",padding:"10px 14px",background:"#fafaf9",borderBottom:`1px solid ${C.border}`,fontSize:"11px",fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.04em"}}>
                      <span>Company</span>
                      <span>Role / Title</span>
                      <span style={{textAlign:"right"}}>Applied</span>
                    </div>
                    {automationStatus.applications.map((appItem, i) => (
                      <div key={appItem.id || `${appItem.company}-${i}`} style={{display:"grid",gridTemplateColumns:"minmax(0,2fr) minmax(0,3fr) minmax(0,1fr)",gap:"12px",padding:"12px 14px",borderTop:i===0?"none":`1px solid ${C.border}`,alignItems:"center"}}>
                        <div style={{display:"flex",gap:"10px",alignItems:"center",minWidth:0}}>
                          <div style={{...av(C.info),width:"32px",height:"32px",fontSize:"13px",flexShrink:0}}>{appItem.company?.[0]?.toUpperCase() || "?"}</div>
                          <p style={{fontSize:"13px",fontWeight:700,margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{appItem.company}</p>
                        </div>
                        <div style={{minWidth:0}}>
                          <p style={{fontSize:"13px",fontWeight:600,margin:0,color:appItem.role?C.text:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{appItem.role || "Role not detected"}</p>
                          <p style={{fontSize:"11px",color:C.muted,margin:"2px 0 0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{appItem.subject}</p>
                        </div>
                        <span style={{fontSize:"12px",color:C.sub,textAlign:"right",whiteSpace:"nowrap"}}>{appItem.date ? new Date(appItem.date).toLocaleDateString() : "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:"12px",marginTop:"16px"}}>
                  {[
                    { company:"Google", role:"Data Engineer", status:"Applied", next:"Find alumni and recruiter" },
                    { company:"Amazon", role:"Business Intelligence Engineer", status:"Application Received", next:"Draft internal nudge email" },
                    { company:"Meta", role:"Data Analyst", status:"Follow-up Due", next:"Send gentle reminder tonight" },
                  ].map((item) => (
                    <div key={item.company} style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"12px",padding:"14px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"8px"}}>
                        <h4 style={{fontSize:"14px",fontWeight:800,margin:0}}>{item.company}</h4>
                        <span style={{fontSize:"10px",fontWeight:700,padding:"4px 8px",borderRadius:"999px",background:item.status==="Follow-up Due"?C.accentLight:C.primaryLight,color:item.status==="Follow-up Due"?C.accent:C.primaryDark}}>{item.status}</span>
                      </div>
                      <p style={{fontSize:"12px",color:C.text,marginTop:"8px"}}>{item.role}</p>
                      <p style={{fontSize:"12px",color:C.sub,marginTop:"8px"}}>{item.next}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ONBOARDING */}
      {pg==="onboard" && (
        <div style={{ maxWidth:"640px",margin:"0 auto",padding:"40px 24px",animation:"fadeIn 0.4s ease" }}>
          <div style={{ textAlign:"center",marginBottom:"28px" }}><h1 style={{fontSize:"28px",fontWeight:800}}>Let's build your profile</h1><p style={{fontSize:"15px",color:C.sub,marginTop:"8px"}}>Paste your resume or describe your background.</p></div>
          <div style={card}>
            <textarea style={{...inp,minHeight:"140px",resize:"vertical"}} placeholder="Paste your resume or describe your background..." value={resume} onChange={e=>setResume(e.target.value)} />
            <div style={{marginTop:"14px",display:"flex",gap:"10px"}}>
              <button style={btn("primary")} onClick={extractProfile} disabled={busy||!resume.trim()}>{busy?"Analyzing...":"Extract Profile →"}</button>
              <button style={btn("ghost")} onClick={()=>setResume("I'm a recent Computer Science graduate from the University of Louisiana Monroe (ULM), class of 2025. I have experience in Python, SQL, Apache Spark, and AWS. I completed a 6-month internship at a tech startup as a Data Analyst where I built dashboards and data pipelines. I'm passionate about data engineering and cloud computing. Looking for entry-level data engineering roles at companies like Google, Amazon, or Meta. Located in Monroe, Louisiana.")}>Load Demo</button>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD */}
      {pg==="dashboard" && profile && (
        <div style={wrap}>
          <div style={card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div><h1 style={{fontSize:"24px",fontWeight:800}}>Welcome, {profile.name?.split(" ")[0]} 👋</h1><p style={{fontSize:"14px",color:C.sub}}>{profile.title} · {profile.location}</p></div>
              <button style={btn("ghost")} onClick={()=>setPg("onboard")}>Edit</button>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:"6px",marginTop:"12px"}}>{profile.skills?.map((sk,i)=><span key={i} style={tag}>{sk}</span>)}</div>
          </div>

          <div style={{...card,border:`1px solid ${C.primary}33`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"16px",flexWrap:"wrap"}}>
              <div>
                <h2 style={{fontSize:"18px",fontWeight:800,marginBottom:"6px"}}>Gmail Automation Agent</h2>
                <p style={{fontSize:"13px",color:C.sub,lineHeight:1.6,maxWidth:"760px"}}>
                  Runs nightly at 11:00 PM, checks Gmail for application-related messages, detects companies and roles from those emails, finds likely contacts, and drafts outreach emails from your own Gmail account. Each run is capped at {automationStatus?.maxApplicationsPerRun || 10} tracked applications and {automationStatus?.maxOutreachPerRun || 10} outreach drafts, and nothing is sent until you approve it.
                </p>
              </div>
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                <button style={btn("secondary")} onClick={refreshAutomationStatus}>Refresh Status</button>
                {!automationStatus?.gmailConnected && <button style={btn("ghost")} onClick={connectGmailAutomation}>Connect Gmail</button>}
                <button style={btn("secondary")} onClick={syncApplications} disabled={trackerBusy || !automationStatus?.gmailConnected}>{trackerBusy ? "Syncing..." : "Sync Applications"}</button>
                <button style={btn("primary")} onClick={() => runTrackerPipeline()} disabled={trackerBusy || automationBusy || !automationStatus?.gmailConnected}>{trackerBusy || automationBusy ? "Running..." : "Run Pipeline"}</button>
                <button style={btn("amber")} onClick={() => approveOutreachDrafts()} disabled={approvalBusy || !automationStatus?.gmailConnected || !automationStatus?.pendingOutreach?.length}>{approvalBusy ? "Sending..." : "Send All Approved"}</button>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(6,minmax(0,1fr))",gap:"10px",marginTop:"14px"}}>
              {[
                { label:"OAuth", value: automationStatus?.gmailConnected ? "Connected" : "Not connected" },
                { label:"Profile", value: automationStatus?.profileSynced ? "Synced" : "Not synced" },
                { label:"Last Sync", value: automationStatus?.lastSyncAt ? new Date(automationStatus.lastSyncAt).toLocaleString() : "Never" },
                { label:"Schedule", value: automationStatus?.schedule?.description || "Every night at 11:00 PM" },
                { label:"Track Limit", value: `${automationStatus?.maxApplicationsPerRun || 10} applications` },
                { label:"Draft Queue", value: `${automationStatus?.pendingOutreach?.length || 0} ready` },
                { label:"Last Run", value: automationStatus?.lastRunAt ? new Date(automationStatus.lastRunAt).toLocaleString() : "Never" },
              ].map((item) => (
                <div key={item.label} style={{background:"#fafaf9",border:`1px solid ${C.border}`,borderRadius:"12px",padding:"12px 14px"}}>
                  <p style={{fontSize:"11px",color:C.muted,marginBottom:"4px"}}>{item.label}</p>
                  <p style={{fontSize:"13px",fontWeight:700}}>{item.value}</p>
                </div>
              ))}
            </div>
            {!!automationStatus?.applications?.length && (
              <div style={{marginTop:"18px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:"10px"}}>
                  <h3 style={{fontSize:"15px",fontWeight:800,margin:0}}>📬 Job Tracker</h3>
                  <span style={{fontSize:"12px",color:C.sub}}>{automationStatus.applications.length} job{automationStatus.applications.length === 1 ? "" : "s"} applied</span>
                </div>
                <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"12px",overflow:"hidden"}}>
                  <div style={{display:"grid",gridTemplateColumns:"minmax(0,2fr) minmax(0,3fr) minmax(0,1fr)",gap:"12px",padding:"10px 14px",background:"#fafaf9",borderBottom:`1px solid ${C.border}`,fontSize:"11px",fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.04em"}}>
                    <span>Company</span>
                    <span>Role / Title</span>
                    <span style={{textAlign:"right"}}>Applied</span>
                  </div>
                  {automationStatus.applications.map((appItem, i) => (
                    <div key={appItem.id || `${appItem.company}-${i}`} style={{display:"grid",gridTemplateColumns:"minmax(0,2fr) minmax(0,3fr) minmax(0,1fr)",gap:"12px",padding:"12px 14px",borderTop:i===0?"none":`1px solid ${C.border}`,alignItems:"center"}}>
                      <div style={{display:"flex",gap:"10px",alignItems:"center",minWidth:0}}>
                        <div style={{...av(C.info),width:"32px",height:"32px",fontSize:"13px",flexShrink:0}}>{appItem.company?.[0]?.toUpperCase() || "?"}</div>
                        <p style={{fontSize:"13px",fontWeight:700,margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{appItem.company}</p>
                      </div>
                      <div style={{minWidth:0}}>
                        <p style={{fontSize:"13px",fontWeight:600,margin:0,color:appItem.role?C.text:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{appItem.role || "Role not detected"}</p>
                        <p style={{fontSize:"11px",color:C.muted,margin:"2px 0 0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{appItem.subject}</p>
                      </div>
                      <span style={{fontSize:"12px",color:C.sub,textAlign:"right",whiteSpace:"nowrap"}}>{appItem.date ? new Date(appItem.date).toLocaleDateString() : "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!!automationStatus?.pendingOutreach?.length && (
              <div style={{marginTop:"14px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",flexWrap:"wrap",marginBottom:"8px"}}>
                  <h3 style={{fontSize:"14px",fontWeight:700,margin:0}}>Pending Approval</h3>
                  <p style={{fontSize:"12px",color:C.sub,margin:0}}>Review these drafts before they are sent from your Gmail.</p>
                </div>
                <div style={{display:"grid",gap:"10px"}}>
                  {automationStatus.pendingOutreach.map((draft) => (
                    <div key={draft.id} style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"12px",padding:"14px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"12px",flexWrap:"wrap"}}>
                        <div>
                          <p style={{fontSize:"13px",fontWeight:800}}>{draft.company}{draft.appliedRole ? ` · ${draft.appliedRole}` : ""}</p>
                          <p style={{fontSize:"12px",color:C.text,marginTop:"4px"}}>{draft.contactName} {draft.role ? `(${draft.role})` : ""}</p>
                          <p style={{fontSize:"12px",color:C.sub,marginTop:"4px"}}>To: {draft.to}</p>
                          <p style={{fontSize:"12px",color:C.sub,marginTop:"4px"}}>Subject: {draft.subject}</p>
                        </div>
                        <div style={{display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
                          {draft.bucket && <span style={badge(draft.bucket === "manager" ? "Hiring Manager" : draft.bucket === "recruiter" ? "Recruiter" : "Industry Peer")}>{draft.bucket}</span>}
                          <button style={{...btn("secondary"),fontSize:"12px",padding:"6px 12px"}} onClick={()=>navigator.clipboard?.writeText(`To: ${draft.to}\nSubject: ${draft.subject}\n\n${draft.body}`)}>Copy Draft</button>
                          <button style={{...btn("primary"),fontSize:"12px",padding:"6px 12px"}} onClick={()=>approveOutreachDrafts([draft.id])} disabled={approvalBusy}>{approvalBusy ? "Sending..." : "Approve & Send"}</button>
                        </div>
                      </div>
                      <div
                        style={{
                          marginTop: "10px",
                          padding: "12px 14px",
                          background: "#fafaf9",
                          border: `1px solid ${C.border}`,
                          borderRadius: "10px",
                          whiteSpace: "pre-wrap",
                          fontSize: "12px",
                          lineHeight: 1.6,
                          color: C.text,
                        }}
                      >
                        {draft.body}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!!automationStatus?.outreachLog?.length && (
              <div style={{marginTop:"14px"}}>
                <h3 style={{fontSize:"14px",fontWeight:700,marginBottom:"8px"}}>Sent Outreach</h3>
                <div style={{display:"grid",gap:"8px"}}>
                  {automationStatus.outreachLog.slice(0, 10).map((entry, index) => (
                    <div key={`${entry.gmailMessageId || entry.to}-${index}`} style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"12px",padding:"12px 14px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"12px",flexWrap:"wrap"}}>
                        <div>
                          <p style={{fontSize:"13px",fontWeight:800}}>{entry.company}{entry.appliedRole ? ` · ${entry.appliedRole}` : ""}</p>
                          <p style={{fontSize:"12px",color:C.text,marginTop:"4px"}}>{entry.contactName} {entry.role ? `(${entry.role})` : ""}</p>
                          <p style={{fontSize:"12px",color:C.sub,marginTop:"4px"}}>Sent to: {entry.to}</p>
                          <p style={{fontSize:"12px",color:C.sub,marginTop:"4px"}}>{entry.subject}</p>
                        </div>
                        <div style={{textAlign:"right"}}>
                          {entry.bucket && <p style={{fontSize:"11px",fontWeight:700,color:C.primary,marginBottom:"4px"}}>{entry.bucket}</p>}
                          <p style={{fontSize:"11px",color:C.muted}}>{entry.sentAt ? new Date(entry.sentAt).toLocaleString() : ""}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <h2 style={{fontSize:"18px",fontWeight:700,marginTop:"28px",marginBottom:"12px"}}>Target Companies</h2>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px"}}>
            {[{n:"Google",l:"G",c:"#4285F4"},{n:"Amazon",l:"A",c:"#FF9900"},{n:"Meta",l:"M",c:"#0668E1"}].map(co=>(
              <div key={co.n} style={{...card,cursor:"pointer",border:selCo===co.n?`2px solid ${C.primary}`:`1px solid ${C.border}`,padding:"18px"}} onClick={()=>{setSelCo(co.n);setSelCt(null);setMsg("");setFoundEmail(null);}}>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}><div style={av(co.c)}>{co.l}</div><div><h3 style={{fontSize:"15px",fontWeight:700,margin:0}}>{co.n}</h3><p style={{fontSize:"12px",color:C.primary,fontWeight:600,margin:0}}>{DEMO_CONTACTS[co.n]?.length} contacts</p></div></div>
              </div>
            ))}
          </div>

          {selCo && (
            <div style={{marginTop:"24px",animation:"fadeIn 0.3s ease"}}>
              <h2 style={{fontSize:"18px",fontWeight:700,marginBottom:"10px"}}>Contacts at {selCo}</h2>
              {DEMO_CONTACTS[selCo]?.map(ct=>(
                <div key={ct.id} style={{...card,cursor:"pointer",border:selCt?.id===ct.id?`2px solid ${C.primary}`:`1px solid ${C.border}`,padding:"18px"}} onClick={()=>{setSelCt(ct);setMsg("");setFoundEmail(null);}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{display:"flex",gap:"12px",alignItems:"center"}}><div style={av()}>{ct.name[0]}</div><div><h3 style={{fontSize:"14px",fontWeight:700,margin:0}}>{ct.name}</h3><p style={{fontSize:"12px",color:C.sub,margin:"1px 0"}}>{ct.role} · {ct.tenure}</p><p style={{fontSize:"11px",color:C.muted}}>{ct.school}</p></div></div>
                    <div style={{display:"flex",gap:"6px",alignItems:"center"}}><span style={badge(ct.type)}>{ct.type}</span><span style={{fontSize:"10px",color:C.muted,background:"#f5f5f4",padding:"2px 8px",borderRadius:"10px"}}>{MESSAGE_STYLE_MAP[ct.type]?.label}</span></div>
                  </div>
                  <p style={{fontSize:"12px",color:C.sub,marginTop:"8px",lineHeight:1.5}}>{ct.bio}</p>
                  {selCt?.id===ct.id && (
                    <div style={{marginTop:"14px",animation:"fadeIn 0.2s ease"}}>
                      <div style={{height:1,background:C.border,margin:"12px 0"}} />
                      <div style={{display:"flex",gap:"12px",alignItems:"center"}}>
                        {/* Email icon */}
                        <button
                          style={{width:44,height:44,borderRadius:"50%",border:`1.5px solid ${C.border}`,background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px",transition:"all 0.15s",boxShadow:C.shadow}}
                          title="Find email & generate message"
                          onClick={e=>{e.stopPropagation();lookupEmail(ct.name,ct.company);genMsg(ct,"email");addTrack(ct,"Sent");}}
                        >✉️</button>
                        {/* LinkedIn icon */}
                        <button
                          style={{width:44,height:44,borderRadius:"50%",border:`1.5px solid ${C.border}`,background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px",transition:"all 0.15s",boxShadow:C.shadow}}
                          title="Generate LinkedIn connection note"
                          onClick={e=>{e.stopPropagation();genMsg(ct,"linkedin");addTrack(ct,"Sent");}}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="#0077B5"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                        </button>
                        {/* Mic icon */}
                        <button
                          style={{width:44,height:44,borderRadius:"50%",border:`1.5px solid ${C.border}`,background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px",transition:"all 0.15s",boxShadow:C.shadow}}
                          title="Practice coffee chat"
                          onClick={e=>{e.stopPropagation();startSim(ct);}}
                        >🎙️</button>
                      </div>

                      {/* Email lookup result */}
                      {foundEmail && (
                        <div style={{marginTop:"10px",padding:"10px 14px",background:foundEmail.confidence>50?C.okLight:C.accentLight,borderRadius:"10px",fontSize:"13px",animation:"fadeIn 0.3s ease",border:`1px solid ${foundEmail.confidence>50?C.ok+"33":C.accent+"33"}`}}>
                          <span style={{fontWeight:700,color:foundEmail.confidence>50?C.ok:C.accent}}>📧 {foundEmail.email}</span>
                          {foundEmail.verified && <span style={{marginLeft:"6px",fontSize:"11px",color:C.ok,fontWeight:600}}>✓ Verified</span>}
                          <p style={{fontSize:"11px",color:C.sub,margin:"2px 0 0"}}>via {foundEmail.source}</p>
                        </div>
                      )}

                      {/* Generated message inline */}
                      {msg && selCt?.id===ct.id && (
                        <div style={{marginTop:"12px",animation:"fadeIn 0.3s ease"}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
                            <p style={{fontSize:"12px",color:C.sub,margin:0}}>
                              {msgPlat==="linkedin"?`LinkedIn note · ${msg.length}/300 chars`:"Email message"} · {MESSAGE_STYLE_MAP[ct.type]?.label}
                            </p>
                          </div>
                          {msgPlat==="linkedin"&&msg.length>300 && <p style={{fontSize:"12px",color:C.err,fontWeight:600,marginBottom:"6px"}}>⚠️ Over 300 chars</p>}
                          <textarea readOnly value={msg} style={mboxArea(msgPlat)} onClick={()=>setShowFullMsg(true)} title="Click to view the full message" />
                          <div style={{marginTop:"10px",display:"flex",gap:"8px"}}>
                            {/* Copy icon */}
                            <button style={{width:36,height:36,borderRadius:"50%",border:`1.5px solid ${C.border}`,background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px",transition:"all 0.15s",boxShadow:C.shadow}} title="Copy message" onClick={()=>navigator.clipboard.writeText(msg)}>📋</button>
                            {/* Open LinkedIn icon */}
                            {msgPlat==="linkedin" && <button style={{width:36,height:36,borderRadius:"50%",border:`1.5px solid ${C.border}`,background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s",boxShadow:C.shadow}} title="Open LinkedIn" onClick={()=>window.open(selCt.linkedin,"_blank")}><svg width="16" height="16" viewBox="0 0 24 24" fill="#0077B5"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg></button>}
                            {/* Open Email icon */}
                            {msgPlat==="email" && <button style={{width:36,height:36,borderRadius:"50%",border:`1.5px solid ${C.border}`,background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px",transition:"all 0.15s",boxShadow:C.shadow}} title="Open in email" onClick={()=>window.open(`mailto:${foundEmail?.email||selCt.email}?body=${encodeURIComponent(msg)}`,"_blank")}>📨</button>}
                            {/* Auto-Connect icon */}
                            {msgPlat==="linkedin" && <button style={{width:36,height:36,borderRadius:"50%",border:`1.5px solid ${C.accent}`,background:C.accentLight,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px",transition:"all 0.15s",boxShadow:C.shadow}} title="Auto-Connect on LinkedIn" onClick={()=>runAuto(selCt)}>🤖</button>}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}


          {showFullMsg && msg && (
            <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:250,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}} onClick={()=>setShowFullMsg(false)}>
              <div style={{background:"#fff",borderRadius:"18px",width:"min(760px, 96vw)",maxHeight:"85vh",padding:"20px",boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}} onClick={e=>e.stopPropagation()}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px",gap:"12px"}}>
                  <div>
                    <h3 style={{fontSize:"18px",fontWeight:800,margin:0}}>{msgPlat==="linkedin"?"Full LinkedIn Message":"Full Email Message"}</h3>
                    <p style={{fontSize:"12px",color:C.sub,marginTop:"4px"}}>{msgPlat==="linkedin"?`${msg.length}/300 chars`:"Full draft"}</p>
                  </div>
                  <button style={{...btn("ghost"),padding:"8px 12px",border:`1px solid ${C.border}`}} onClick={()=>setShowFullMsg(false)}>Close</button>
                </div>
                <textarea readOnly value={msg} style={{...mboxArea(msgPlat),minHeight:"55vh"}} />
              </div>
            </div>
          )}

          {autoStep>=0 && (
            <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",animation:"fadeIn 0.2s ease"}}>
              <div style={{background:"#fff",borderRadius:"20px",padding:"0",maxWidth:"520px",width:"92%",overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
                {/* Fake browser chrome */}
                <div style={{background:"#f5f5f4",padding:"10px 16px",display:"flex",alignItems:"center",gap:"8px",borderBottom:`1px solid ${C.border}`}}>
                  <div style={{display:"flex",gap:"6px"}}><div style={{width:12,height:12,borderRadius:"50%",background:"#ef4444"}} /><div style={{width:12,height:12,borderRadius:"50%",background:"#f59e0b"}} /><div style={{width:12,height:12,borderRadius:"50%",background:"#22c55e"}} /></div>
                  <div style={{flex:1,background:"#fff",borderRadius:"6px",padding:"4px 12px",fontSize:"12px",color:C.muted,border:`1px solid ${C.border}`}}>
                    {autoStep >= 0 && autoContact ? `linkedin.com/in/${autoContact.name.toLowerCase().replace(/\s/g,"")}` : "linkedin.com"}
                  </div>
                </div>

                {/* Simulated LinkedIn UI */}
                <div style={{padding:"24px",background:"#fff"}}>
                  {/* Profile header simulation */}
                  <div style={{display:"flex",gap:"14px",alignItems:"center",marginBottom:"20px",padding:"16px",background:"#f8fafc",borderRadius:"12px",border:`1px solid ${C.border}`}}>
                    <div style={{...av(C.primary),width:52,height:52,fontSize:"18px"}}>{autoContact?.name?.[0] || "?"}</div>
                    <div>
                      <h3 style={{fontSize:"16px",fontWeight:700,margin:0,color:C.text}}>{autoContact?.name}</h3>
                      <p style={{fontSize:"13px",color:C.sub,margin:"2px 0"}}>{autoContact?.role} at {autoContact?.company}</p>
                      <p style={{fontSize:"11px",color:C.muted}}>{autoContact?.school}</p>
                    </div>
                  </div>

                  {/* Steps */}
                  <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                    {AUTO_STEPS.map((step, i) => {
                      const isDone = i < autoStep;
                      const isActive = i === autoStep;
                      const isPending = i > autoStep;
                      return (
                        <div key={i} style={{
                          display:"flex",alignItems:"center",gap:"12px",padding:"12px 16px",borderRadius:"10px",
                          background: isDone ? C.okLight : isActive ? C.primaryLight : "#fafaf9",
                          border: `1px solid ${isActive ? C.primary+"55" : isDone ? C.ok+"33" : "transparent"}`,
                          transition:"all 0.4s ease",
                          opacity: isPending ? 0.4 : 1,
                          transform: isActive ? "scale(1.02)" : "scale(1)",
                        }}>
                          <span style={{fontSize:"20px",transition:"all 0.3s"}}>{isDone ? "✅" : isActive ? step.icon : "⬜"}</span>
                          <div style={{flex:1}}>
                            <p style={{fontSize:"13px",fontWeight:isActive?700:isDone?600:400,color:isPending?C.muted:C.text,margin:0}}>{step.label}</p>
                            {(isActive || isDone) && <p style={{fontSize:"11px",color:C.sub,margin:"2px 0 0",transition:"all 0.3s"}}>{step.sub}</p>}
                          </div>
                          {isActive && <span style={{width:18,height:18,border:`2.5px solid ${C.primary}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.7s linear infinite"}} />}
                          {isDone && <span style={{fontSize:"11px",color:C.ok,fontWeight:600}}>Done</span>}
                        </div>
                      );
                    })}
                  </div>

                  {/* Message preview when pasting step */}
                  {autoStep >= 3 && msg && (
                    <div style={{marginTop:"16px",padding:"12px 14px",background:"#f0f9ff",borderRadius:"8px",border:"1px solid #bae6fd",animation:"fadeIn 0.4s ease"}}>
                      <p style={{fontSize:"11px",fontWeight:600,color:"#0369a1",marginBottom:"4px"}}>📝 Message being sent:</p>
                      <p style={{fontSize:"12px",color:C.text,lineHeight:1.5,margin:0}}>{msg.length > 200 ? msg.substring(0, 200) + "..." : msg}</p>
                    </div>
                  )}

                  {/* Success state */}
                  {autoStep === 4 && (
                    <div style={{marginTop:"16px",textAlign:"center",padding:"12px",background:C.okLight,borderRadius:"10px",border:`1px solid ${C.ok}33`,animation:"fadeIn 0.3s ease"}}>
                      <p style={{fontSize:"14px",fontWeight:700,color:C.ok,margin:0}}>🎉 Connection request sent successfully!</p>
                      <p style={{fontSize:"12px",color:C.sub,margin:"4px 0 0"}}>Added to your networking tracker</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SEARCH */}
      {pg==="search" && (
        <div style={wrap}>
          <h1 style={{fontSize:"24px",fontWeight:800,marginBottom:"6px"}}>Search</h1>
          <p style={{fontSize:"14px",color:C.sub,marginBottom:"20px"}}>Find jobs and discover employees at target companies</p>
          <div style={{display:"flex",gap:"6px",marginBottom:"20px"}}><button style={tab(sTab==="jobs")} onClick={()=>setSTab("jobs")}>Job Postings</button><button style={tab(sTab==="people")} onClick={()=>setSTab("people")}>Employee / Company</button></div>

          {sTab==="jobs" && <>
            <div style={{...card,padding:"16px",display:"flex",gap:"10px",flexWrap:"wrap",alignItems:"center"}}>
              <input style={{...inp,width:"180px"}} placeholder="Location..." value={jf.location} onChange={e=>setJf(p=>({...p,location:e.target.value}))} />
              <select style={sel} value={jf.level} onChange={e=>setJf(p=>({...p,level:e.target.value}))}><option value="">All Levels</option><option>Entry</option><option>Mid</option><option>Senior</option></select>
              <label style={{display:"flex",alignItems:"center",gap:"6px",fontSize:"13px",color:C.sub,cursor:"pointer"}}><input type="checkbox" checked={jf.hideGhost} onChange={e=>setJf(p=>({...p,hideGhost:e.target.checked}))} /> Hide ghost jobs</label>
              <span style={{fontSize:"12px",color:C.muted,marginLeft:"auto"}}>{filtJobs.length} results</span>
            </div>
            {filtJobs.map(j=>(
              <div key={j.id} style={{...card,padding:"18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div><h3 style={{fontSize:"15px",fontWeight:700,margin:0}}>{j.title}</h3><p style={{fontSize:"13px",color:C.sub,margin:"3px 0"}}>{j.company} · {j.location}</p><div style={{display:"flex",gap:"6px",marginTop:"6px"}}><span style={tag}>{j.level}</span><span style={{...tag,background:"#f5f5f4",color:C.sub}}>{j.posted}</span>{j.ghost&&<span style={{...tag,background:C.errLight,color:C.err}}>⚠️ Ghost job</span>}</div></div>
                <button style={btn("secondary")} onClick={()=>{setSelCo(j.company);setPg("dashboard");}}>View Contacts →</button>
              </div>
            ))}
          </>}
          {sTab==="people" && <>
            <div style={{...card,padding:"16px",display:"flex",gap:"10px",alignItems:"center",flexWrap:"wrap"}}><input style={{...inp,flex:"1 1 280px"}} placeholder="Search company or domain..." value={coSearch} onChange={e=>setCoSearch(e.target.value)} /><button style={btn("primary")} onClick={searchCompanyPeople} disabled={companySearchBusy || !coSearch.trim()}>{companySearchBusy ? "Searching..." : "Search Hunter"}</button></div>
            {companySearchError && <div style={{...card,padding:"14px",background:C.errLight,border:`1px solid ${C.err}33`,color:C.err}}>{companySearchError}</div>}
            {companyPeople.length>0 && <div style={{...card,padding:"16px",display:"flex",gap:"10px",alignItems:"center",flexWrap:"wrap"}}>
              <input style={{...inp,width:"200px"}} placeholder="Filter by name..." value={peopleFilt.name} onChange={e=>setPeopleFilt(p=>({...p,name:e.target.value}))} />
              <input style={{...inp,width:"220px"}} placeholder="Filter by role..." value={peopleFilt.role} onChange={e=>setPeopleFilt(p=>({...p,role:e.target.value}))} />
              <select style={sel} value={peopleFilt.type} onChange={e=>setPeopleFilt(p=>({...p,type:e.target.value}))}><option value="">All types</option><option>Recruiter</option><option>Hiring Manager</option><option>Industry Peer</option></select>
              <select style={sel} value={peopleFilt.minConfidence} onChange={e=>setPeopleFilt(p=>({...p,minConfidence:Number(e.target.value)}))}><option value={0}>Any confidence</option><option value={70}>70%+</option><option value={80}>80%+</option><option value={90}>90%+</option></select>
              <span style={{fontSize:"12px",color:C.muted,marginLeft:"auto"}}>{filtCompanyPeople.length} people</span>
            </div>}
            {companyPeople.length>0 && filtCompanyPeople.length===0 && <div style={{...card,padding:"18px",textAlign:"center",color:C.muted}}>No people match the current filters.</div>}
            {filtCompanyPeople.length>0 ? filtCompanyPeople.map(ct=>(
              <div key={ct.id} style={{...card,padding:"16px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px"}}>
                <div style={{display:"flex",gap:"10px",alignItems:"center"}}><div style={av()}>{ct.name[0]}</div><div><h3 style={{fontSize:"14px",fontWeight:700,margin:0}}>{ct.name}</h3><p style={{fontSize:"12px",color:C.sub}}>{ct.role} at {ct.company}</p><p style={{fontSize:"12px",color:C.text,marginTop:"4px"}}>{ct.email}</p><p style={{fontSize:"11px",color:C.muted,marginTop:"2px"}}>Hunter confidence: {ct.confidence}%</p></div></div>
                <div style={{display:"flex",gap:"6px",alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
                  <span style={badge(ct.type)}>{ct.type}</span>
                  <button style={{...btn("secondary"),fontSize:"12px",padding:"6px 12px"}} onClick={()=>navigator.clipboard?.writeText(ct.email)}>Copy Email</button>
                  <button style={{...btn("primary"),fontSize:"12px",padding:"6px 12px"}} onClick={()=>{setSelCo(ct.company);setSelCt(ct);setPg("dashboard");}}>Use Contact</button>
                </div>
              </div>
            )) : !companyPeople.length && <p style={{fontSize:"14px",color:C.muted,textAlign:"center",padding:"40px"}}>{coSearch?"Search Hunter to find people at this company.":"Type a company or domain and search Hunter."}</p>}
          </>}
        </div>
      )}

      {/* TRACKER */}
      {pg==="tracker" && (
        <div style={wrap}>
          <h1 style={{fontSize:"24px",fontWeight:800,marginBottom:"6px"}}>Networking Tracker</h1>
          <p style={{fontSize:"14px",color:C.sub,marginBottom:"16px"}}>Track outreach, replies, and follow-ups</p>
          <div style={{...card,border:`1px solid ${C.primary}33`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"16px",flexWrap:"wrap"}}>
              <div>
                <h2 style={{fontSize:"18px",fontWeight:800,marginBottom:"6px"}}>Job Tracker</h2>
                <p style={{fontSize:"13px",color:C.sub,lineHeight:1.6,maxWidth:"760px"}}>Connect Gmail, run the pipeline, and pull application emails into a reviewed list of companies, roles, and outreach drafts.</p>
              </div>
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                {!automationStatus?.gmailConnected && <button style={btn("ghost")} onClick={connectGmailAutomation}>Connect Gmail</button>}
                <button style={btn("primary")} onClick={() => runTrackerPipeline()} disabled={trackerBusy || automationBusy}>
                  {!automationStatus?.gmailConnected ? "Connect Gmail To Run Pipeline" : trackerBusy || automationBusy ? "Running Pipeline..." : "Run Pipeline"}
                </button>
              </div>
            </div>
            {(trackerError || trackerMessage) && (
              <div style={{marginTop:"12px",padding:"10px 14px",borderRadius:"10px",fontSize:"12px",background:trackerError?C.errLight:C.primaryLight,color:trackerError?C.err:C.primaryDark,border:`1px solid ${trackerError?C.err+"33":C.primary+"33"}`}}>
                {trackerError || trackerMessage}
              </div>
            )}
            {!!automationStatus?.applications?.length ? (
              <div style={{display:"grid",gap:"8px",marginTop:"14px"}}>
                {automationStatus.applications.map((appItem) => (
                  <div key={appItem.id || `${appItem.company}-${appItem.role || "role"}`} style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"12px",padding:"12px 14px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",flexWrap:"wrap"}}>
                      <div>
                        <p style={{fontSize:"13px",fontWeight:800}}>{appItem.company}</p>
                        {appItem.role && <p style={{fontSize:"12px",color:C.text,marginTop:"4px"}}>{appItem.role}</p>}
                        <p style={{fontSize:"12px",color:C.sub,marginTop:"4px"}}>{appItem.subject || "Application signal detected from Gmail"}</p>
                      </div>
                      <span style={{fontSize:"11px",color:C.muted}}>{appItem.date ? new Date(appItem.date).toLocaleDateString() : ""}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{marginTop:"14px",background:"#fafaf9",border:`1px solid ${C.border}`,borderRadius:"12px",padding:"18px"}}>
                <p style={{fontSize:"13px",color:C.sub}}>No tracked applications yet. Connect Gmail and run the tracker to detect companies and job titles from your application emails.</p>
              </div>
            )}
          </div>
          <div style={{display:"flex",gap:"6px",marginBottom:"16px",flexWrap:"wrap"}}>{STATUS_LIST.map(st=><button key={st} style={tab(stFilt===st)} onClick={()=>setStFilt(st)}>{st}</button>)}</div>
          {filtTrack.length===0 ? <div style={{...card,textAlign:"center",padding:"50px"}}><p style={{fontSize:"32px",marginBottom:"10px"}}>📭</p><p style={{fontSize:"14px",color:C.sub}}>No contacts in this category.</p><button style={{...btn("primary"),marginTop:"14px"}} onClick={()=>setPg("dashboard")}>Discover Contacts →</button></div>
          : filtTrack.map((ct,i)=>(
            <div key={i} style={card}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",gap:"10px",alignItems:"center"}}><div style={av()}>{ct.name[0]}</div><div><h3 style={{fontSize:"14px",fontWeight:700,margin:0}}>{ct.name}</h3><p style={{fontSize:"12px",color:C.sub}}>{ct.role} at {ct.company}</p></div></div>
                <div style={{display:"flex",gap:"8px",alignItems:"center"}}><div style={sDot(ct.status)} /><select style={sel} value={ct.status} onChange={e=>setTracker(p=>p.map(c=>c.id===ct.id?{...c,status:e.target.value}:c))}>{["Sent","Replied","No Response","Coffee Chat Scheduled","Referral Received"].map(o=><option key={o}>{o}</option>)}</select></div>
              </div>
              <div style={{height:1,background:C.border,margin:"12px 0"}} />
              <div style={{display:"flex",justifyContent:"space-between",fontSize:"12px"}}><div style={{display:"flex",gap:"16px"}}><span style={{color:C.muted}}>Sent: {ct.dateSent}</span>{ct.followUpDue&&<span style={{color:C.accent,fontWeight:600}}>Follow-up: {ct.followUpDue}</span>}</div><button style={{...btn("secondary"),fontSize:"12px",padding:"6px 12px"}} onClick={()=>startSim(ct)}>Practice Chat</button></div>
            </div>
          ))}
        </div>
      )}

      {/* REPLIES */}
      {pg==="replies" && (
        <div style={wrap}>
          <h1 style={{fontSize:"24px",fontWeight:800,marginBottom:"6px"}}>Reply Detection</h1>
          <p style={{fontSize:"14px",color:C.sub,marginBottom:"20px"}}>Replies from LinkedIn and Gmail, detected via extension + Gmail API</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}>
            <div style={{background:"#fff",borderRadius:"14px",border:`2px solid ${C.primary}`,overflow:"hidden",boxShadow:"0 4px 16px rgba(13,148,136,0.12)"}}>
              <div style={{background:C.primary,color:"#fff",padding:"12px 18px",display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:700,fontSize:"14px"}}>🧭 CareerCompass Extension</span><span style={{fontSize:"11px",opacity:.8}}>LinkedIn + Gmail</span></div>
              <div style={{padding:"14px"}}>
                <div style={{background:C.primaryLight,borderRadius:"8px",padding:"10px 12px",marginBottom:"12px"}}><p style={{fontSize:"12px",fontWeight:700,color:C.primaryDark,margin:0}}>🔔 {SIMULATED_REPLIES.length} new replies</p></div>
                {SIMULATED_REPLIES.map((r,i)=>(
                  <div key={i} style={{padding:"12px 0",borderBottom:i<SIMULATED_REPLIES.length-1?`1px solid ${C.border}`:"none"}}>
                    <div style={{display:"flex",gap:"8px",alignItems:"center"}}><div style={av(r.platform==="LinkedIn"?"#0077B5":"#EA4335")}>{r.from[0]}</div><div><p style={{fontSize:"13px",fontWeight:700,margin:0}}>{r.from}</p><p style={{fontSize:"10px",color:C.muted,margin:0}}>{r.company} · {r.platform} · {r.time}</p></div></div>
                    <p style={{fontSize:"11px",color:C.sub,margin:"6px 0",lineHeight:1.4}}>{r.preview}</p>
                    <div style={{display:"flex",gap:"6px",alignItems:"center"}}><button style={{...btn("primary"),fontSize:"11px",padding:"5px 10px"}} onClick={()=>genFollowUp(r)} disabled={busy}>Generate Follow-up</button><span style={{fontSize:"10px",color:C.accent,fontWeight:600}}>💡 {r.action}</span></div>
                  </div>
                ))}
              </div>
            </div>
            <div>{fuData ? <div style={{...card,animation:"fadeIn 0.3s ease"}}><h3 style={{fontSize:"15px",fontWeight:700,marginBottom:"8px"}}>Follow-up for {fuData.reply.from}</h3><div style={mbox}>{fuData.followUp}</div><div style={{marginTop:"12px",display:"flex",gap:"6px"}}><button style={btn("primary")} onClick={()=>navigator.clipboard.writeText(fuData.followUp)}>📋 Copy</button><button style={btn("secondary")}>🔗 LinkedIn</button><button style={btn("secondary")}>✉️ Gmail</button></div></div> : <div style={{...card,textAlign:"center",padding:"50px",color:C.muted}}><p style={{fontSize:"28px",marginBottom:"8px"}}>💬</p><p style={{fontSize:"13px"}}>Click "Generate Follow-up" to see the AI response.</p></div>}</div>
          </div>
        </div>
      )}

      {/* TO-DO */}
      {pg==="todo" && (
        <div style={wrap}>
          <h1 style={{fontSize:"24px",fontWeight:800,marginBottom:"6px"}}>To-Do & Notifications</h1>
          <p style={{fontSize:"14px",color:C.sub,marginBottom:"20px"}}>Action items, replies, and follow-up reminders</p>
          <div style={{display:"flex",gap:"6px",marginBottom:"16px"}}>{["all","reply","follow-up"].map(f=><button key={f} style={tab(nFilt===f)} onClick={()=>setNFilt(f)}>{f==="all"?"All":f==="reply"?"Replies":"Follow-ups"} ({f==="all"?NOTIFICATIONS.length:NOTIFICATIONS.filter(n=>n.type===f).length})</button>)}</div>
          {filtNotif.map(n=>(
            <div key={n.id} style={{...card,padding:"16px",display:"flex",gap:"12px",alignItems:"flex-start"}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:n.type==="reply"?C.ok:C.accent,flexShrink:0,marginTop:"6px"}} />
              <div style={{flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between"}}><div><p style={{fontSize:"14px",fontWeight:700,margin:0}}>{n.message}</p><p style={{fontSize:"12px",color:C.sub,margin:"3px 0"}}>{n.detail}</p></div><span style={{fontSize:"11px",color:C.muted,whiteSpace:"nowrap"}}>{n.time}</span></div>
                <div style={{display:"flex",gap:"6px",marginTop:"10px"}}>
                  {n.type==="reply" && <button style={{...btn("primary"),fontSize:"12px",padding:"6px 12px"}} onClick={()=>{const r=SIMULATED_REPLIES.find(x=>x.from===n.contact);if(r)genFollowUp(r);setPg("replies");}}>Generate Follow-up →</button>}
                  {n.type==="follow-up" && <button style={{...btn("amber"),fontSize:"12px",padding:"6px 12px"}} onClick={()=>{const ct=allCts.find(c=>c.name===n.contact);if(ct){setSelCt(ct);setSelCo(ct.company);genMsg(ct,"linkedin");setPg("dashboard");}}}>Send Follow-up →</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SIMULATOR */}
      {pg==="sim" && (
        <div style={{maxWidth:"700px",margin:"0 auto",padding:"28px 24px",animation:"fadeIn 0.3s ease"}}>
          <button style={btn("ghost")} onClick={()=>setPg("dashboard")}>← Back</button>
          <div style={{...card,marginTop:"14px"}}><div style={{display:"flex",gap:"10px",alignItems:"center"}}><div style={av()}>{simCt?.name?.[0]}</div><div><h2 style={{fontSize:"16px",fontWeight:700,margin:0}}>Coffee Chat with {simCt?.name}</h2><p style={{fontSize:"12px",color:C.sub}}>{simCt?.role} at {simCt?.company} · AI Simulation</p></div></div></div>
          <div style={{...card,minHeight:"380px",display:"flex",flexDirection:"column"}}>
            <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:"10px",marginBottom:"14px"}}>
              {chat.map((m,i)=><div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}><div style={m.role==="user"?{background:C.primary,color:"#fff",padding:"10px 14px",borderRadius:"14px 14px 4px 14px",maxWidth:"78%",fontSize:"14px",lineHeight:1.5}:{background:"#f5f5f4",color:C.text,padding:"10px 14px",borderRadius:"14px 14px 14px 4px",maxWidth:"78%",fontSize:"14px",lineHeight:1.5}}>{m.content}</div></div>)}
              {busy && <div style={{display:"flex"}}><div style={{background:"#f5f5f4",padding:"10px 14px",borderRadius:"14px 14px 14px 4px",fontSize:"14px",color:C.muted}}>typing...</div></div>}
              <div ref={chatEnd} />
            </div>
            <div style={{display:"flex",gap:"8px"}}><input style={{...inp,flex:1}} placeholder="Type your message..." value={chatIn} onChange={e=>setChatIn(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()} /><button style={btn("primary")} onClick={sendChat} disabled={busy}>Send</button></div>
          </div>
          {chat.length>4 && <div style={card}><h3 style={{fontSize:"14px",fontWeight:700,marginBottom:"8px"}}>Generate Post-Chat Follow-ups</h3><textarea style={{...inp,minHeight:"70px",resize:"vertical"}} placeholder="How did the chat go?" value={chatSum} onChange={e=>setChatSum(e.target.value)} /><button style={{...btn("primary"),marginTop:"10px"}} onClick={genPostChat} disabled={busy}>{busy?"Generating...":"Generate Follow-ups →"}</button></div>}
        </div>
      )}

      {/* FOLLOW-UP */}
      {pg==="fu" && (
        <div style={{maxWidth:"700px",margin:"0 auto",padding:"28px 24px",animation:"fadeIn 0.3s ease"}}>
          <button style={btn("ghost")} onClick={()=>setPg("sim")}>← Back</button>
          <div style={{marginTop:"16px"}}><h1 style={{fontSize:"22px",fontWeight:800}}>Post-Chat Follow-ups</h1><p style={{fontSize:"14px",color:C.sub,marginTop:"4px"}}>For {fuData?.reply?.from} at {fuData?.reply?.company}</p><div style={{...card,marginTop:"16px"}}><div style={mbox}>{fuData?.followUp}</div><div style={{marginTop:"14px",display:"flex",gap:"8px"}}><button style={btn("primary")} onClick={()=>navigator.clipboard.writeText(fuData?.followUp||"")}>📋 Copy All</button><button style={btn("secondary")} onClick={()=>{if(simCt)addTrack(simCt,"Coffee Chat Scheduled");setPg("tracker");}}>✓ Add to Tracker</button></div></div></div>
        </div>
      )}
    </div>
  );
}
