import { useState, useEffect, useRef, useMemo } from "react";
import BuildProfile from "./BuildProfile";
import LinkedInPipeline from "./LinkedInPipeline";

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
      try {
        window.localStorage.removeItem(key);
      } catch {}
      return fallback;
    }
  };
  const readApiJson = async (response, fallbackMessage = "Server returned invalid JSON.") => {
    const raw = await response.text();
    try {
      return raw ? JSON.parse(raw) : {};
    } catch {
      const compact = raw.replace(/\s+/g, " ").trim();
      const sample = compact.slice(0, 140);
      throw new Error(sample ? `${fallbackMessage} ${sample}` : fallbackMessage);
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
  const [tracker, setTracker] = useState(() => readStoredJson("careercompass_tracker", []));
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
  const [peopleSort, setPeopleSort] = useState("confidence");
  const [lastCompanySearch, setLastCompanySearch] = useState("");
  const [assistantInstruction, setAssistantInstruction] = useState("");
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [assistantError, setAssistantError] = useState("");
  const [assistantResult, setAssistantResult] = useState(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [linkedInSim, setLinkedInSim] = useState({ open: false, contact: null, note: "", addNote: true, sent: false });
  const [pipelineFollowUps, setPipelineFollowUps] = useState(() => readStoredJson("cc_pipeline_followup", []));
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
    try {
      if (tracker?.length) window.localStorage.setItem("careercompass_tracker", JSON.stringify(tracker));
      else window.localStorage.removeItem("careercompass_tracker");
    } catch {}
  }, [tracker]);
  useEffect(() => {
    const syncFollowUps = () => setPipelineFollowUps(readStoredJson("cc_pipeline_followup", []));
    syncFollowUps();
    window.addEventListener("storage", syncFollowUps);
    window.addEventListener("focus", syncFollowUps);
    return () => {
      window.removeEventListener("storage", syncFollowUps);
      window.removeEventListener("focus", syncFollowUps);
    };
  }, []);
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
      const data = await readApiJson(response, "Automation status returned invalid JSON.");
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
      const safeProfile = {
        ...nextProfile,
        name: nextProfile?.name === "Demo User" ? "" : nextProfile?.name,
      };
      const response = await fetch(`${apiBase}/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: safeProfile, resumeText: resume }),
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
      const data = await readApiJson(response, "Automation run returned invalid JSON.");
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
      const data = await readApiJson(response, "Approved-send response returned invalid JSON.");
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
      const data = await readApiJson(response, "Application sync returned invalid JSON.");
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
      const data = await readApiJson(response, "Pipeline run returned invalid JSON.");
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

  const searchCompanyPeople = async (queryOverride) => {
    const nextQuery =
      typeof queryOverride === "string"
        ? queryOverride
        : queryOverride && typeof queryOverride === "object" && "target" in queryOverride
          ? coSearch
          : coSearch;
    const query = String(nextQuery || "").trim();
    if (!query) return;
    setCompanySearchBusy(true);
    setCompanySearchError("");
    try {
      const response = await fetch(`${apiBase}/hunter/company-search?q=${encodeURIComponent(query)}`);
      if ((response.headers.get("content-type") || "").includes("text/html")) {
        throw new Error("The backend returned HTML instead of JSON. Make sure `npm run server` is running on port 3001.");
      }
      const data = await readApiJson(response, "Hunter search returned invalid JSON.");
      if (!response.ok) throw new Error(data.error || "Hunter search failed.");
      setCompanyPeople(data.people || []);
      setLastCompanySearch(data.domain || query);
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
    catch { setProfile({ name: "", title: "Aspiring Data Engineer", skills: ["Python","SQL","Data Pipelines","AWS","Spark"], experience: [{ role: "Data Analyst Intern", company: "Tech Corp", duration: "6 months" }], education: [{ school: "University of Louisiana Monroe", degree: "BS Computer Science", year: "2025" }], interests: ["Data Engineering","Cloud Computing"], location: "Monroe, LA" }); setPg("dashboard"); }
    setBusy(false);
  };

  const buildProfileFromForm = async (formData) => {
    const fallbackProfile = {
      name: (formData.fullName || "").trim(),
      title: formData.targetJobTitles || "Aspiring Professional",
      skills: [],
      experience: formData.yearsOfExperience ? [{ role: formData.targetJobTitles || "Target Role", company: "Open to opportunities", duration: formData.yearsOfExperience }] : [],
      education: [],
      interests: formData.targetCompanies || [],
      location: formData.openToRelocation ? "Open to relocation" : "Location not specified",
    };

    const augmentedResume = [
      formData.resume || "",
      formData.fullName ? `Full name: ${formData.fullName}` : "",
      formData.targetJobTitles ? `Target roles: ${formData.targetJobTitles}` : "",
      formData.yearsOfExperience ? `Years of experience: ${formData.yearsOfExperience}` : "",
      formData.employmentTypes?.length ? `Employment types: ${formData.employmentTypes.join(", ")}` : "",
      formData.openToRelocation ? "Open to relocation: Yes" : "",
      formData.targetCompanies?.length ? `Target companies: ${formData.targetCompanies.join(", ")}` : "",
      formData.linkedInUrl ? `LinkedIn: ${formData.linkedInUrl}` : "",
      formData.portfolioUrl ? `Portfolio: ${formData.portfolioUrl}` : "",
      formData.githubUrl ? `GitHub: ${formData.githubUrl}` : "",
      formData.otherLink ? `Other link: ${formData.otherLink}` : "",
      formData.resumeFileName ? `Uploaded resume file: ${formData.resumeFileName}` : "",
    ].filter(Boolean).join("\n");

    setResume(augmentedResume);
    setBusy(true);
    try {
      if (formData.resume?.trim()) {
        const r = await ai("Extract career profile as JSON: name, title, skills[], experience[{role,company,duration}], education[{school,degree,year}], interests[], location. No em dashes. JSON only.", `Extract profile from this candidate information:\n${augmentedResume}`);
        const parsed = JSON.parse(r.replace(/```json\n?|```\n?/g, "").trim());
        setProfile({
          ...fallbackProfile,
          ...parsed,
          name: parsed.name && parsed.name !== "Demo User" ? parsed.name : fallbackProfile.name,
          title: parsed.title || fallbackProfile.title,
          interests: [...new Set([...(parsed.interests || []), ...(formData.targetCompanies || [])])],
        });
      } else {
        setProfile(fallbackProfile);
      }
      setPg("dashboard");
    } catch {
      setProfile(fallbackProfile);
      setPg("dashboard");
    } finally {
      setBusy(false);
    }
  };

  const runClaudeAssistant = async ({ sendNow = false } = {}) => {
    if (!selCt) {
      setAssistantError("Select a contact first.");
      return;
    }
    if (!assistantInstruction.trim()) {
      setAssistantError("Enter an instruction for the assistant.");
      return;
    }
    setAssistantBusy(true);
    setAssistantError("");
    try {
      const response = await fetch(`${apiBase}/assistant/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: assistantInstruction,
          contact: selCt,
          email: foundEmail?.email || selCt.email || "",
          currentDraft: msg ? { platform: msgPlat, body: msg } : null,
          sendNow,
        }),
      });
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/html")) {
        throw new Error("Assistant backend route is not available yet. Restart `npm run dev:all` so the server picks up /api/assistant/action.");
      }
      const data = await readApiJson(response, "Assistant action returned invalid JSON.");
      if (!response.ok) throw new Error(data.error || "Assistant action failed.");
      setAssistantResult(data.result || null);
      if (data.result?.body && data.result?.action?.includes("email")) {
        setMsg(data.result.body);
        setMsgPlat("email");
      }
      if (data.result?.sent) {
        await refreshAutomationStatus();
      }
    } catch (error) {
      setAssistantError(error.message || "Assistant action failed.");
    } finally {
      setAssistantBusy(false);
    }
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
    return cleaned;
  };

  const openLinkedInSimulation = (contact, note = "") => {
    setSelCt(contact);
    setMsgPlat("linkedin");
    setLinkedInSim({
      open: true,
      contact,
      note: note || "",
      addNote: true,
      sent: false,
    });
  };

  const launchLinkedInSimulation = async (contact, note) => {
    const nextNote = note || await genMsg(contact, "linkedin");
    openLinkedInSimulation(contact, nextNote || "");
  };

  const submitLinkedInSimulation = () => {
    if (!linkedInSim.contact) return;
    addTrack(linkedInSim.contact, "Sent");
    setLinkedInSim((prev) => ({ ...prev, sent: true }));
  };

  const startSim = (ct) => { setSimCt(ct); setChat([{ role:"assistant", content:`Hi! Thanks for setting up this chat. I'm ${ct.name}, ${ct.role} at ${ct.company}. Tell me about yourself, what got you interested in this field?` }]); setChatSum(""); setPg("sim"); };

  const sendChat = async () => {
    if (!chatIn.trim() || busy) return; const m = chatIn.trim(); setChatIn("");
    const ms = [...chat, { role:"user", content: m }]; setChat(ms); setBusy(true);
    try {
      const response = await fetch(`${apiBase}/simulator/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact: simCt, messages: ms }),
      });
      const data = await readApiJson(response, "Simulator chat returned invalid JSON.");
      if (!response.ok) throw new Error(data.error || "Simulator chat failed.");
      setChat([...ms, { role:"assistant", content: data.reply || "No response." }]);
    } catch (error) {
      setChat([...ms, { role:"assistant", content: error.message || "Simulator chat failed." }]);
    } finally {
      setBusy(false);
    }
  };

  const genFollowUp = async (reply) => {
    setBusy(true);
    const r = await ai("Generate follow-up message. Warm, specific, move toward next step. Under 100 words. No em dashes.", `Reply from ${reply.from} at ${reply.company}: "${reply.full}"\nUser: ${profile?.name}, ${profile?.title}`);
    setFuData({ reply, followUp: r }); setBusy(false);
  };

  const genPostChat = async () => {
    if (!chatSum.trim()) return; setBusy(true);
    try {
      const response = await fetch(`${apiBase}/simulator/followups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact: simCt, outcome: chatSum }),
      });
      const data = await readApiJson(response, "Simulator follow-up generation returned invalid JSON.");
      if (!response.ok) throw new Error(data.error || "Simulator follow-up generation failed.");
      const followUps = data.followUps || {};
      const formatted = [
        `THANK YOU (send today):\n${followUps.thankYou || ""}`,
        `CHECK-IN (1-2 weeks):\n${followUps.checkIn || ""}`,
        `REFERRAL ASK:\n${followUps.referralAsk || ""}`,
      ].join("\n\n");
      setFuData({ reply: { from: simCt?.name, company: simCt?.company }, followUp: formatted });
      setPg("fu");
    } catch (error) {
      setFuData({ reply: { from: simCt?.name, company: simCt?.company }, followUp: error.message || "Simulator follow-up generation failed." });
      setPg("fu");
    } finally {
      setBusy(false);
    }
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

  const trackerIdFor = (ct = {}) =>
    ct.id || ct.email || ct.to || `${ct.name || ct.contactName || "contact"}-${ct.company || "company"}`;
  const formatTrackerDate = (value) => {
    if (!value) return new Date().toLocaleDateString();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString();
  };
  const computeFollowUpDue = (status, value) => {
    if (status === "Coffee Chat Scheduled") return "Scheduled";
    if (status === "Referral Received") return "Referral in progress";
    if (status === "Replied") return "Reply received";
    if (status !== "Sent" && status !== "No Response") return null;
    const base = value ? new Date(value) : new Date();
    if (Number.isNaN(base.getTime())) return status === "Sent" ? "In 3 days" : "Follow up soon";
    const due = new Date(base.getTime() + 3 * 24 * 60 * 60 * 1000);
    return due.toLocaleDateString();
  };
  const normalizeTrackerEntry = (entry = {}) => {
    const status = entry.status || "Sent";
    const dateSent = formatTrackerDate(entry.dateSent || entry.sentAt || entry.time);
    return {
      ...entry,
      id: trackerIdFor(entry),
      name: entry.name || entry.contactName || "Contact",
      role: entry.role || "Professional",
      company: entry.company || "Company",
      status,
      dateSent,
      followUpDue: entry.followUpDue ?? computeFollowUpDue(status, entry.dateSent || entry.sentAt || entry.time),
      source: entry.source || "CareerCompass",
    };
  };
  const mergeTrackerEntries = (...groups) => {
    const merged = new Map();
    groups.flat().filter(Boolean).forEach((entry) => {
      const normalized = normalizeTrackerEntry(entry);
      const existing = merged.get(normalized.id);
      merged.set(normalized.id, existing ? { ...normalized, ...existing } : normalized);
    });
    return Array.from(merged.values());
  };
  const updateTrackerStatus = (id, status) => {
    setTracker((prev) => {
      const existing = prev.find((entry) => trackerIdFor(entry) === id) || trackerBoard.find((entry) => trackerIdFor(entry) === id);
      if (!existing) return prev;
      const nextEntry = {
        ...existing,
        status,
        followUpDue: computeFollowUpDue(status, existing.dateSent || existing.sentAt || existing.time),
      };
      if (prev.some((entry) => trackerIdFor(entry) === id)) {
        return prev.map((entry) => (trackerIdFor(entry) === id ? nextEntry : entry));
      }
      return [...prev, nextEntry];
    });
  };
  const addTrack = (ct, status="Sent") => {
    const nextEntry = normalizeTrackerEntry({
      ...ct,
      id: trackerIdFor(ct),
      status,
      dateSent: new Date().toISOString(),
      source: ct.source || (status === "Sent" ? "LinkedIn simulation" : "Manual"),
    });
    setTracker((prev) => {
      if (prev.find((entry) => trackerIdFor(entry) === nextEntry.id)) {
        return prev.map((entry) => (trackerIdFor(entry) === nextEntry.id ? { ...entry, ...nextEntry } : entry));
      }
      return [...prev, nextEntry];
    });
  };

  const filtJobs = DEMO_JOBS.filter(j => { if (jf.hideGhost&&j.ghost) return false; if (jf.level&&j.level!==jf.level) return false; if (jf.location&&!j.location.toLowerCase().includes(jf.location.toLowerCase())) return false; return true; });
  const allCts = Object.values(DEMO_CONTACTS).flat();
  const outreachTrackerEntries = (automationStatus?.outreachLog || []).slice(0, 20).map((entry) => ({
    id: trackerIdFor({ ...entry, email: entry.to }),
    name: entry.contactName || entry.to?.split("@")[0] || "Contact",
    role: entry.role || "Professional",
    company: entry.company,
    email: entry.to,
    status: "Sent",
    sentAt: entry.sentAt,
    source: "Gmail automation",
    note: entry.subject,
    platform: "Gmail",
  }));
  const pipelineTrackerEntries = (pipelineFollowUps || []).map((item) => ({
    id: trackerIdFor(item),
    name: item.name,
    role: item.role,
    company: item.company,
    email: item.email,
    status:
      item.connectionStatus === "connected"
        ? item.followUpSentAt
          ? "Sent"
          : "Replied"
        : "No Response",
    sentAt: item.followUpSentAt || item.sentAt || item.connectedAt || item.updatedAt,
    source: "LinkedIn pipeline",
    note: item.followUpType ? `${item.followUpType} follow-up` : "LinkedIn connection",
    platform: "LinkedIn",
  }));
  const replyTrackerEntries = SIMULATED_REPLIES.map((reply) => ({
    id: trackerIdFor({ name: reply.from, company: reply.company }),
    name: reply.from,
    role: allCts.find((contact) => contact.name === reply.from && contact.company === reply.company)?.role || "Professional",
    company: reply.company,
    status:
      reply.action === "Schedule coffee chat"
        ? "Coffee Chat Scheduled"
        : reply.action === "Accept referral offer"
          ? "Referral Received"
          : "Replied",
    time: reply.time,
    source: `${reply.platform} reply`,
    note: reply.preview,
    platform: reply.platform,
  }));
  const trackerBoard = mergeTrackerEntries(outreachTrackerEntries, pipelineTrackerEntries, replyTrackerEntries, tracker);
  const statusCounts = STATUS_LIST.reduce((acc, status) => {
    acc[status] = trackerBoard.filter((entry) =>
      status === "All"
        ? true
        : status === "Needs Follow-up"
          ? entry.status === "Sent" || entry.status === "No Response"
          : entry.status === status
    ).length;
    return acc;
  }, {});
  const filtTrack = trackerBoard.filter(c => stFilt==="All"?true:stFilt==="Needs Follow-up"?c.status==="Sent"||c.status==="No Response":c.status===stFilt);
  const todoItems = useMemo(() => {
    const approvalItems = (automationStatus?.pendingOutreach || []).map((draft, index) => ({
      id: `approval-${draft.id || index}`,
      type: "follow-up",
      category: "approval",
      message: `Review outreach draft for ${draft.contactName || draft.company}`,
      detail: `Draft ready for ${draft.to}. ${draft.appliedRole ? `Role: ${draft.appliedRole}. ` : ""}Approve or edit before sending.`,
      company: draft.company,
      contact: draft.contactName,
      time: draft.generatedAt ? new Date(draft.generatedAt).toLocaleString() : "Ready now",
      draft,
      actionLabel: "Review Draft →",
    }));

    const followUpItems = (pipelineFollowUps || [])
      .filter((item) => item.connectionStatus === "connected")
      .map((item) => ({
        id: `followup-${item.id}`,
        type: "follow-up",
        category: "followup",
        message: `Send follow-up to ${item.name}`,
        detail: item.followUpOptions
          ? "A follow-up draft is ready in your LinkedIn Pipeline queue."
          : "They accepted your connection. Generate a coffee chat, referral, or curiosity follow-up.",
        company: item.company,
        contact: item.name,
        time: item.followUpSentAt ? `Last sent ${new Date(item.followUpSentAt).toLocaleDateString()}` : "Ready now",
        followUp: item,
        actionLabel: item.followUpOptions ? "Open Follow-up Queue →" : "Draft Follow-up →",
      }));

    const replyItems = SIMULATED_REPLIES.map((reply) => ({
      id: `reply-${reply.id}`,
      type: "reply",
      category: "reply",
      message: `${reply.from} replied via ${reply.platform}`,
      detail: reply.preview,
      company: reply.company,
      contact: reply.from,
      time: reply.time,
      reply,
      actionLabel: "Generate Follow-up →",
    }));

    return [...approvalItems, ...followUpItems, ...replyItems];
  }, [automationStatus, pipelineFollowUps]);

  const filtNotif = todoItems.filter(n => nFilt==="all"?true:n.type===nFilt);

  const openPipelineFollowUpQueue = () => {
    try {
      window.localStorage.setItem("cc_pipeline_nav_request", JSON.stringify({ subTab: "followup", ts: Date.now() }));
    } catch {}
    setPg("pipeline");
  };

  const handleTodoAction = (item) => {
    if (item.category === "reply" && item.reply) {
      genFollowUp(item.reply);
      setPg("replies");
      return;
    }

    if (item.category === "approval") {
      setPg("dashboard");
      return;
    }

    if (item.category === "followup") {
      openPipelineFollowUpQueue();
    }
  };

  const searchQuickPicks = [...new Set([
    ...(automationStatus?.applications?.map((item) => item.company).filter(Boolean) || []),
    ...(profile?.interests || []),
    ...(profile?.education?.map((item) => item.school).filter(Boolean) || []),
  ])].slice(0, 8);
  const filtCompanyPeople = companyPeople.filter((person) => {
    if (peopleFilt.name && !person.name.toLowerCase().includes(peopleFilt.name.toLowerCase())) return false;
    if (peopleFilt.role && !person.role.toLowerCase().includes(peopleFilt.role.toLowerCase())) return false;
    if (peopleFilt.type && person.type !== peopleFilt.type) return false;
    if ((person.confidence || 0) < Number(peopleFilt.minConfidence || 0)) return false;
    return true;
  }).sort((a, b) => {
    if (peopleSort === "name") return a.name.localeCompare(b.name);
    if (peopleSort === "role") return (a.role || "").localeCompare(b.role || "");
    return (b.confidence || 0) - (a.confidence || 0);
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
            <button style={tab(pg==="pipeline")} onClick={()=>setPg("pipeline")}>LinkedIn Pipeline</button>
            <button style={tab(pg==="replies")} onClick={()=>setPg("replies")}>Replies ({SIMULATED_REPLIES.length})</button>
              <button style={{ ...tab(pg==="todo"),position:"relative" }} onClick={()=>setPg("todo")}>
                To-Do{todoItems.length > 0 && <span style={{ position:"absolute",top:2,right:2,width:7,height:7,borderRadius:"50%",background:C.err }} />}
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
        <BuildProfile
          isSubmitting={busy}
          initialData={{
            resume,
            fullName: profile?.name || "",
            targetJobTitles: profile?.title || "",
            targetCompanies: profile?.interests || [],
            githubUrl: "",
            linkedInUrl: "",
            portfolioUrl: "",
            otherLink: "",
            employmentTypes: [],
            openToRelocation: false,
            yearsOfExperience: "Student / No experience",
            resumeFile: null,
            resumeFileName: "",
          }}
          onSubmit={buildProfileFromForm}
        />
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

            <div style={{marginTop:"28px",padding:"16px 18px",background:"#fafaf9",border:`1px solid ${C.border}`,borderRadius:"14px"}}>
              <h2 style={{fontSize:"18px",fontWeight:700,marginBottom:"6px"}}>Target Companies & Contacts</h2>
              <p style={{fontSize:"13px",color:C.sub,lineHeight:1.6}}>
                This company browser now lives inside the LinkedIn Pipeline so discovery, outreach, and follow-up all happen in one workflow.
              </p>
              <button style={{...btn("secondary"),marginTop:"12px"}} onClick={()=>setPg("pipeline")}>Open LinkedIn Pipeline</button>
            </div>


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
          <p style={{fontSize:"14px",color:C.sub,marginBottom:"20px"}}>Find jobs and search a company to discover real people and emails from that company</p>
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
                <button style={btn("secondary")} onClick={()=>setPg("pipeline")}>View Contacts →</button>
              </div>
            ))}
          </>}
          {sTab==="people" && <>
            <div style={{...card,padding:"16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"12px",flexWrap:"wrap"}}>
                <div>
                  <h3 style={{fontSize:"16px",fontWeight:800,margin:0}}>Company Search</h3>
                  <p style={{fontSize:"12px",color:C.sub,marginTop:"4px"}}>Type a company name like Google or a domain like google.com to find people and emails from that company.</p>
                </div>
                {lastCompanySearch && <span style={{fontSize:"11px",color:C.primaryDark,background:C.primaryLight,padding:"6px 10px",borderRadius:"999px",fontWeight:700}}>Last domain: {lastCompanySearch}</span>}
              </div>
              {!!searchQuickPicks.length && (
                <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginTop:"14px"}}>
                  {searchQuickPicks.map((item) => (
                    <button key={item} style={{...btn("ghost"),padding:"6px 12px",fontSize:"12px",border:`1px solid ${C.border}`,background:"#fff"}} onClick={()=>{setCoSearch(item); searchCompanyPeople(item);}}>
                      {item}
                    </button>
                  ))}
                </div>
              )}
              <div style={{display:"flex",gap:"10px",alignItems:"center",flexWrap:"wrap",marginTop:"14px"}}>
                <input
                  style={{...inp,flex:"1 1 280px"}}
                  placeholder="Search company name or domain, e.g. Google or google.com"
                  value={coSearch}
                  onChange={e=>setCoSearch(e.target.value)}
                  onKeyDown={e=>{ if (e.key==="Enter") searchCompanyPeople(); }}
                />
                <button style={btn("primary")} onClick={searchCompanyPeople} disabled={companySearchBusy || !coSearch.trim()}>{companySearchBusy ? "Searching..." : "Search Hunter"}</button>
                <button style={btn("ghost")} onClick={()=>{setCoSearch(""); setCompanyPeople([]); setLastCompanySearch(""); setCompanySearchError("");}} disabled={companySearchBusy}>Clear</button>
              </div>
            </div>
            {companySearchError && <div style={{...card,padding:"14px",background:C.errLight,border:`1px solid ${C.err}33`,color:C.err}}>{companySearchError}</div>}
            {companyPeople.length>0 && <div style={{...card,padding:"16px",display:"flex",gap:"10px",alignItems:"center",flexWrap:"wrap"}}>
              <input style={{...inp,width:"200px"}} placeholder="Filter by name..." value={peopleFilt.name} onChange={e=>setPeopleFilt(p=>({...p,name:e.target.value}))} />
              <input style={{...inp,width:"220px"}} placeholder="Filter by role..." value={peopleFilt.role} onChange={e=>setPeopleFilt(p=>({...p,role:e.target.value}))} />
              <select style={sel} value={peopleFilt.type} onChange={e=>setPeopleFilt(p=>({...p,type:e.target.value}))}><option value="">All types</option><option>Recruiter</option><option>Hiring Manager</option><option>Industry Peer</option></select>
              <select style={sel} value={peopleFilt.minConfidence} onChange={e=>setPeopleFilt(p=>({...p,minConfidence:Number(e.target.value)}))}><option value={0}>Any confidence</option><option value={70}>70%+</option><option value={80}>80%+</option><option value={90}>90%+</option></select>
              <select style={sel} value={peopleSort} onChange={e=>setPeopleSort(e.target.value)}><option value="confidence">Sort by confidence</option><option value="name">Sort by name</option><option value="role">Sort by role</option></select>
              <button style={{...btn("ghost"),padding:"8px 12px",border:`1px solid ${C.border}`}} onClick={()=>setPeopleFilt({ name: "", role: "", type: "", minConfidence: 0 })}>Reset filters</button>
              <span style={{fontSize:"12px",color:C.muted,marginLeft:"auto"}}>{filtCompanyPeople.length} people</span>
            </div>}
            {companyPeople.length>0 && filtCompanyPeople.length===0 && <div style={{...card,padding:"18px",textAlign:"center",color:C.muted}}>No people match the current filters.</div>}
            {filtCompanyPeople.length>0 ? filtCompanyPeople.map(ct=>(
              <div key={ct.id} style={{...card,padding:"16px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px"}}>
                <div style={{display:"flex",gap:"10px",alignItems:"center"}}><div style={av()}>{ct.name[0]}</div><div><h3 style={{fontSize:"14px",fontWeight:700,margin:0}}>{ct.name}</h3><p style={{fontSize:"12px",color:C.sub}}>{ct.role} at {ct.company}</p><p style={{fontSize:"12px",color:C.text,marginTop:"4px"}}>{ct.email}</p><div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginTop:"6px"}}><span style={{fontSize:"11px",color:C.muted}}>Hunter confidence: {ct.confidence}%</span>{ct.department && <span style={{fontSize:"11px",color:C.muted}}>Dept: {ct.department}</span>}{ct.seniority && <span style={{fontSize:"11px",color:C.muted}}>Seniority: {ct.seniority}</span>}{ct.domain && <span style={{fontSize:"11px",color:C.muted}}>Domain: {ct.domain}</span>}</div></div></div>
                <div style={{display:"flex",gap:"6px",alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
                  <span style={badge(ct.type)}>{ct.type}</span>
                  {ct.verification && <span style={{fontSize:"10px",fontWeight:700,padding:"4px 8px",borderRadius:"999px",background:"#f5f5f4",color:C.sub}}>{ct.verification}</span>}
                  <button style={{...btn("secondary"),fontSize:"12px",padding:"6px 12px"}} onClick={()=>navigator.clipboard?.writeText(ct.email)}>Copy Email</button>
                  <button style={{...btn("primary"),fontSize:"12px",padding:"6px 12px"}} onClick={()=>{setSelCo(ct.company);setSelCt(ct);setFoundEmail({ email: ct.email, source: ct.source || "Hunter.io", confidence: ct.confidence || 0, verified: /valid|accept_all|verified/i.test(ct.verification || "") }); setAssistantOpen(true); setAssistantResult(null); setAssistantError("");}}>Use Contact</button>
                </div>
              </div>
            )) : !companyPeople.length && <p style={{fontSize:"14px",color:C.muted,textAlign:"center",padding:"40px"}}>{coSearch?"Click Search Hunter to find people and emails at this company.":"Type a company name or domain to find people and emails from that company."}</p>}
          </>}
        </div>
      )}

      {/* LINKEDIN PIPELINE */}
      {pg==="pipeline" && (
        <LinkedInPipeline
          profile={profile}
          applications={automationStatus?.applications || []}
          demoContacts={DEMO_CONTACTS}
          targetCompanies={profile?.interests || []}
          onOpenLinkedInSimulation={openLinkedInSimulation}
        />
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
          <div style={{display:"flex",gap:"6px",marginBottom:"16px",flexWrap:"wrap"}}>
            {STATUS_LIST.map(st => (
              <button key={st} style={tab(stFilt===st)} onClick={()=>setStFilt(st)}>
                {st} <span style={{opacity:0.75}}>({statusCounts[st] || 0})</span>
              </button>
            ))}
          </div>
          {filtTrack.length===0 ? (
            <div style={{...card,textAlign:"center",padding:"50px"}}>
              <p style={{fontSize:"32px",marginBottom:"10px"}}>Inbox</p>
              <p style={{fontSize:"14px",color:C.sub}}>No contacts in this category yet.</p>
              <p style={{fontSize:"12px",color:C.muted,marginTop:"6px"}}>Run the Gmail pipeline, send a LinkedIn request, or open the reply inbox to populate this board.</p>
              <button style={{...btn("primary"),marginTop:"14px"}} onClick={()=>setPg("pipeline")}>Open LinkedIn Pipeline</button>
            </div>
          ) : filtTrack.map((ct,i)=>(
            <div key={ct.id || i} style={card}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"12px",flexWrap:"wrap"}}>
                <div style={{display:"flex",gap:"10px",alignItems:"center"}}>
                  <div style={av()}>{(ct.name || "?")[0]}</div>
                  <div>
                    <h3 style={{fontSize:"14px",fontWeight:700,margin:0}}>{ct.name}</h3>
                    <p style={{fontSize:"12px",color:C.sub}}>{ct.role} at {ct.company}</p>
                    <div style={{display:"flex",gap:"6px",marginTop:"6px",flexWrap:"wrap"}}>
                      <span style={{...tag,background:"#f5f5f4",color:C.sub}}>{ct.source}</span>
                      {ct.platform && <span style={{...tag,background:C.infoLight,color:C.info}}>{ct.platform}</span>}
                    </div>
                  </div>
                </div>
                <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
                  <div style={sDot(ct.status)} />
                  <select style={sel} value={ct.status} onChange={e=>updateTrackerStatus(ct.id, e.target.value)}>
                    {["Sent","Replied","No Response","Coffee Chat Scheduled","Referral Received"].map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div style={{height:1,background:C.border,margin:"12px 0"}} />
              {ct.note && <p style={{fontSize:"12px",color:C.text,lineHeight:1.6,marginBottom:"12px"}}>{ct.note}</p>}
              <div style={{display:"flex",justifyContent:"space-between",fontSize:"12px",gap:"12px",flexWrap:"wrap"}}>
                <div style={{display:"flex",gap:"16px",flexWrap:"wrap"}}>
                  <span style={{color:C.muted}}>Last activity: {ct.dateSent}</span>
                  {ct.followUpDue&&<span style={{color:C.accent,fontWeight:600}}>Next step: {ct.followUpDue}</span>}
                  {ct.email&&<span style={{color:C.sub}}>{ct.email}</span>}
                </div>
                <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                  <button style={{...btn("secondary"),fontSize:"12px",padding:"6px 12px"}} onClick={()=>startSim(ct)}>Practice Chat</button>
                  <button style={{...btn("ghost"),fontSize:"12px",padding:"6px 12px"}} onClick={()=>{
                    if (ct.platform === "LinkedIn") setPg("pipeline");
                    else if (ct.platform === "Gmail") setPg("dashboard");
                    else setPg("replies");
                  }}>Open Flow ?</button>
                </div>
              </div>
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
            <div>{fuData ? <div style={{...card,animation:"fadeIn 0.3s ease"}}><h3 style={{fontSize:"15px",fontWeight:700,marginBottom:"8px"}}>Follow-up for {fuData.reply.from}</h3><div style={mbox}>{fuData.followUp}</div><div style={{marginTop:"12px",display:"flex",gap:"6px"}}><button style={btn("primary")} onClick={()=>navigator.clipboard.writeText(fuData.followUp)}>📋 Copy</button><button style={btn("secondary")} onClick={()=>{const ct = allCts.find(c=>c.name===fuData.reply.from && c.company===fuData.reply.company); if (ct) openLinkedInSimulation(ct, fuData.followUp);}}>🔗 LinkedIn</button><button style={btn("secondary")}>✉️ Gmail</button></div></div> : <div style={{...card,textAlign:"center",padding:"50px",color:C.muted}}><p style={{fontSize:"28px",marginBottom:"8px"}}>💬</p><p style={{fontSize:"13px"}}>Click "Generate Follow-up" to see the AI response.</p></div>}</div>
          </div>
        </div>
      )}

      {/* TO-DO */}
      {pg==="todo" && (
        <div style={wrap}>
          <h1 style={{fontSize:"24px",fontWeight:800,marginBottom:"6px"}}>To-Do & Action Hub</h1>
          <p style={{fontSize:"14px",color:C.sub,marginBottom:"20px"}}>Live actions pulled from your outreach drafts, follow-up queue, and reply inbox demo.</p>
          <div style={{display:"flex",gap:"6px",marginBottom:"16px"}}>{["all","reply","follow-up"].map(f=><button key={f} style={tab(nFilt===f)} onClick={()=>setNFilt(f)}>{f==="all"?"All":f==="reply"?"Replies":"Follow-ups"} ({f==="all"?todoItems.length:todoItems.filter(n=>n.type===f).length})</button>)}</div>
          {filtNotif.length === 0 ? (
            <div style={{...card,textAlign:"center",padding:"50px",color:C.muted}}>
              <p style={{fontSize:"28px",marginBottom:"8px"}}>✅</p>
              <p style={{fontSize:"13px"}}>No pending actions right now.</p>
            </div>
          ) : filtNotif.map(n=>(
              <div key={n.id} style={{...card,padding:"16px",display:"flex",gap:"12px",alignItems:"flex-start"}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:n.type==="reply"?C.ok:C.accent,flexShrink:0,marginTop:"6px"}} />
                <div style={{flex:1}}>
                  <div style={{display:"flex",justifyContent:"space-between"}}><div><p style={{fontSize:"14px",fontWeight:700,margin:0}}>{n.message}</p><p style={{fontSize:"12px",color:C.sub,margin:"3px 0"}}>{n.detail}</p></div><span style={{fontSize:"11px",color:C.muted,whiteSpace:"nowrap"}}>{n.time}</span></div>
                  <div style={{display:"flex",gap:"6px",marginTop:"10px"}}>
                    <button
                      style={{...(n.type==="reply"?btn("primary"):btn("amber")),fontSize:"12px",padding:"6px 12px"}}
                      onClick={()=>handleTodoAction(n)}
                    >
                      {n.actionLabel}
                    </button>
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

      {linkedInSim.open && linkedInSim.contact && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:260,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}} onClick={()=>setLinkedInSim({ open:false, contact:null, note:"", addNote:true, sent:false })}>
          <div style={{background:"#fff",borderRadius:"20px",width:"min(760px, 96vw)",maxHeight:"88vh",overflow:"hidden",boxShadow:"0 24px 70px rgba(0,0,0,0.28)"}} onClick={e=>e.stopPropagation()}>
            <div style={{background:"#f3f2ef",padding:"10px 16px",display:"flex",alignItems:"center",gap:"8px",borderBottom:`1px solid ${C.border}`}}>
              <div style={{display:"flex",gap:"6px"}}><div style={{width:12,height:12,borderRadius:"50%",background:"#ef4444"}} /><div style={{width:12,height:12,borderRadius:"50%",background:"#f59e0b"}} /><div style={{width:12,height:12,borderRadius:"50%",background:"#22c55e"}} /></div>
              <div style={{flex:1,background:"#fff",borderRadius:"7px",padding:"6px 12px",fontSize:"12px",color:C.muted,border:`1px solid ${C.border}`}}>
                linkedin.com/in/{linkedInSim.contact.name.toLowerCase().replace(/\s+/g,"")}
              </div>
            </div>

            <div style={{padding:"22px",display:"grid",gap:"16px",background:"#fff"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"12px",flexWrap:"wrap"}}>
                <div style={{display:"flex",gap:"12px",alignItems:"center"}}>
                  <div style={{...av("#0077B5"),width:52,height:52,fontSize:"18px"}}>{linkedInSim.contact.name?.[0] || "?"}</div>
                  <div>
                    <h3 style={{fontSize:"18px",fontWeight:800,margin:0}}>Connect with {linkedInSim.contact.name}</h3>
                    <p style={{fontSize:"13px",color:C.sub,margin:"4px 0 0"}}>{linkedInSim.contact.role} at {linkedInSim.contact.company}</p>
                    <p style={{fontSize:"12px",color:C.muted,margin:"4px 0 0"}}>{linkedInSim.contact.school}{linkedInSim.contact.tenure ? ` · ${linkedInSim.contact.tenure}` : ""}</p>
                  </div>
                </div>
                <button style={{...btn("ghost"),padding:"8px 12px",border:`1px solid ${C.border}`}} onClick={()=>setLinkedInSim({ open:false, contact:null, note:"", addNote:true, sent:false })}>Close</button>
              </div>

              <div style={{padding:"16px",background:"#f8fafc",border:`1px solid ${C.border}`,borderRadius:"14px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",flexWrap:"wrap"}}>
                  <div>
                    <p style={{fontSize:"13px",fontWeight:700,margin:0,color:C.text}}>LinkedIn Connect Request</p>
                    <p style={{fontSize:"12px",color:C.sub,margin:"4px 0 0"}}>Simulate opening their profile, adding a note, and sending the request inside the demo.</p>
                  </div>
                  <label style={{display:"flex",alignItems:"center",gap:"8px",fontSize:"13px",color:C.sub,cursor:"pointer"}}>
                    <input type="checkbox" checked={linkedInSim.addNote} onChange={e=>setLinkedInSim(prev=>({ ...prev, addNote:e.target.checked }))} />
                    Add a note
                  </label>
                </div>

                {linkedInSim.addNote && (
                  <div style={{marginTop:"14px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
                      <span style={{fontSize:"12px",color:C.sub}}>Personalized note</span>
                      <span style={{fontSize:"12px",color:(linkedInSim.note || "").length > 300 ? C.err : C.muted,fontWeight:700}}>{(linkedInSim.note || "").length}/300</span>
                    </div>
                    <textarea
                      value={linkedInSim.note}
                      onChange={e=>setLinkedInSim(prev=>({ ...prev, note:e.target.value.slice(0, 300) }))}
                      style={{...mboxArea("linkedin"),minHeight:"150px"}}
                      placeholder="Add a short note with your connection request..."
                    />
                  </div>
                )}
              </div>

              {!linkedInSim.sent ? (
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",flexWrap:"wrap"}}>
                  <p style={{fontSize:"12px",color:C.sub,margin:0}}>This is a simulation for your demo. Nothing is being sent to real LinkedIn.</p>
                  <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                    <button style={btn("secondary")} onClick={async ()=>{
                      const refreshed = await genMsg(linkedInSim.contact, "linkedin");
                      setLinkedInSim(prev => ({ ...prev, note: refreshed || prev.note }));
                    }} disabled={busy}>Refresh Note</button>
                    <button style={btn("primary")} onClick={submitLinkedInSimulation} disabled={linkedInSim.addNote && !(linkedInSim.note || "").trim()}>
                      Send Request
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{padding:"16px",background:C.okLight,border:`1px solid ${C.ok}33`,borderRadius:"14px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",flexWrap:"wrap"}}>
                  <div>
                    <p style={{fontSize:"15px",fontWeight:800,color:C.ok,margin:0}}>Connection request sent</p>
                    <p style={{fontSize:"12px",color:C.sub,margin:"4px 0 0"}}>{linkedInSim.contact.name} was added to your tracker with a LinkedIn note.</p>
                  </div>
                  <button style={btn("secondary")} onClick={()=>setLinkedInSim({ open:false, contact:null, note:"", addNote:true, sent:false })}>Done</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <button
        style={{
          position:"fixed",
          right:"22px",
          bottom:"22px",
          width:"58px",
          height:"58px",
          borderRadius:"50%",
          border:`2px solid ${C.accent}55`,
          background:"linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)",
          boxShadow:"0 12px 28px rgba(28,25,23,0.18)",
          cursor:"pointer",
          display:"flex",
          alignItems:"center",
          justifyContent:"center",
          fontSize:"24px",
          zIndex:300,
        }}
        title="Open Claude Networking Assistant"
        onClick={()=>setAssistantOpen(v=>!v)}
      >
        🤖
      </button>

      {assistantOpen && (
        <div style={{position:"fixed",right:"22px",bottom:"92px",width:"min(420px, calc(100vw - 24px))",maxHeight:"70vh",overflowY:"auto",background:"#fff",border:`1px solid ${C.border}`,borderRadius:"18px",boxShadow:"0 20px 50px rgba(28,25,23,0.22)",zIndex:300,padding:"16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"10px",marginBottom:"10px"}}>
            <div>
              <h3 style={{fontSize:"16px",fontWeight:800,margin:0}}>Claude Networking Assistant</h3>
              <p style={{fontSize:"12px",color:C.sub,marginTop:"4px"}}>Available across the app. Select a contact, then tell Claude to draft or send an email.</p>
            </div>
            <button style={{...btn("ghost"),padding:"6px 10px",border:`1px solid ${C.border}`,fontSize:"12px"}} onClick={()=>setAssistantOpen(false)}>Close</button>
          </div>

          <div style={{padding:"12px",background:"#fafaf9",border:`1px solid ${C.border}`,borderRadius:"12px",marginBottom:"10px"}}>
            {selCt ? (
              <>
                <p style={{fontSize:"12px",fontWeight:800,margin:0}}>{selCt.name}</p>
                <p style={{fontSize:"12px",color:C.sub,marginTop:"4px"}}>{selCt.role} at {selCt.company}</p>
                <p style={{fontSize:"12px",color:C.sub,marginTop:"4px"}}>Email: {foundEmail?.email || selCt.email || "No email selected yet"}</p>
              </>
            ) : (
              <p style={{fontSize:"12px",color:C.sub,margin:0}}>No contact selected yet. Pick a person from Search or Dashboard first, then use the assistant here.</p>
            )}
          </div>

          <textarea
            style={{...inp,minHeight:"96px",resize:"vertical"}}
            placeholder='Example: Write a concise outreach email to this person. Or: Send the email now.'
            value={assistantInstruction}
            onChange={e=>setAssistantInstruction(e.target.value)}
          />

          <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginTop:"10px"}}>
            <button style={btn("secondary")} onClick={()=>runClaudeAssistant()} disabled={assistantBusy}>{assistantBusy ? "Thinking..." : "Ask Assistant"}</button>
            <button style={btn("amber")} onClick={()=>runClaudeAssistant({ sendNow: true })} disabled={assistantBusy || !automationStatus?.gmailConnected}>{assistantBusy ? "Sending..." : "Ask + Send Email"}</button>
          </div>

          {assistantError && <div style={{marginTop:"10px",padding:"10px 12px",background:C.errLight,border:`1px solid ${C.err}33`,borderRadius:"10px",fontSize:"12px",color:C.err}}>{assistantError}</div>}
          {assistantResult && (
            <div style={{marginTop:"10px",padding:"12px",background:"#fff",border:`1px solid ${C.border}`,borderRadius:"10px"}}>
              <p style={{fontSize:"12px",fontWeight:700,marginBottom:"6px"}}>Assistant Reply</p>
              <p style={{fontSize:"12px",color:C.text,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{assistantResult.reply}</p>
              {assistantResult.subject && <p style={{fontSize:"12px",color:C.sub,marginTop:"8px"}}><strong>Subject:</strong> {assistantResult.subject}</p>}
              {assistantResult.reason && <p style={{fontSize:"12px",color:C.sub,marginTop:"6px"}}><strong>Reason:</strong> {assistantResult.reason}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


