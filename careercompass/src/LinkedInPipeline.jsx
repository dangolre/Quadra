import { useEffect, useMemo, useState } from "react";
import CoffeeChatSimulator from "./CoffeeChatSimulator";

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

const DEMO_COMPANIES = ["Google", "Amazon", "Meta", "Microsoft", "Stripe"];

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
  Professional: { bg: "#e0e7ff", text: "#3730a3", border: "#c7d2fe" },
};

const btn = (v = "primary") => ({
  padding: "10px 20px", borderRadius: "10px", border: "none", fontWeight: 600, fontSize: "14px", cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit",
  ...(v === "primary" ? { background: C.primary, color: "#fff" }
    : v === "secondary" ? { background: C.primaryLight, color: C.primaryDark }
    : v === "amber" ? { background: C.accent, color: "#fff" }
    : v === "ok" ? { background: C.ok, color: "#fff" }
    : v === "danger" ? { background: C.err, color: "#fff" }
    : v === "ghost" ? { background: "transparent", color: C.sub }
    : { background: C.border, color: C.text }),
});
const card = { background: C.card, borderRadius: "14px", border: `1px solid ${C.border}`, padding: "24px", marginBottom: "16px", boxShadow: C.shadow };
const badge = (t) => { const c = TC[t] || { bg: "#f5f5f4", text: "#44403c", border: "#e7e5e4" }; return { display: "inline-block", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, background: c.bg, color: c.text, border: `1px solid ${c.border}` }; };
const av = (color = C.primary) => ({ width: 40, height: 40, borderRadius: "50%", background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "14px", flexShrink: 0 });
const inp = { width: "100%", padding: "10px 14px", borderRadius: "10px", border: `1px solid ${C.border}`, fontSize: "14px", fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: "#fff" };
const tab = (a) => ({ padding: "8px 18px", borderRadius: "8px", border: "none", background: a ? C.primary : "transparent", color: a ? "#fff" : C.sub, fontWeight: 600, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" });
const tag = { padding: "3px 10px", borderRadius: "6px", background: C.primaryLight, color: C.primaryDark, fontSize: "12px", fontWeight: 500 };

const wrap = { maxWidth: "1060px", margin: "0 auto", padding: "28px 24px", animation: "fadeIn 0.3s ease" };

const PIPELINE_STEPS = [
  { label: "Scanning your applications", sub: "Pulling the list of companies you've applied to", icon: "🔍" },
  { label: "Finding contacts", sub: "Identifying recruiters, alumni, and hiring managers", icon: "👥" },
  { label: "Drafting messages", sub: "Personalizing each connection note with AI", icon: "✍️" },
  { label: "Ready for review", sub: "Approve, edit, or skip before sending", icon: "✅" },
];

const STYLE_BY_TYPE = {
  Alumni: "conversational",
  Recruiter: "direct",
  "Hiring Manager": "direct",
  Professional: "curiosity",
  "Industry Peer": "curiosity",
  "Recent Hire": "curiosity",
  "Team Lead": "conversational",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const readStored = (key, fallback) => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeStored = (key, value) => {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch {}
};

const firstLast = (fullName = "") => {
  const parts = String(fullName).trim().split(/\s+/);
  return { first: parts[0] || "", last: parts.slice(1).join(" ") || parts[0] || "" };
};

const linkedInSearchUrl = (name, company) => {
  const { first, last } = firstLast(name);
  const keywords = [first, last, company].filter(Boolean).join(" ");
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}`;
};

const stripJson = (text = "") => text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();

async function geminiCall(sys, usr) {
  if (!GEMINI_API_KEY) {
    return { error: "Gemini API key missing. Add REACT_APP_GEMINI_API_KEY to .env and restart the app." };
  }
  try {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: sys }] },
        contents: [{ role: "user", parts: [{ text: usr }] }],
        generationConfig: { maxOutputTokens: 1200 },
      }),
    });
    const d = await r.json();
    if (!r.ok) return { error: d.error?.message || "Gemini request failed." };
    const text = d.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim();
    return { text: text || "" };
  } catch (err) {
    return { error: err?.message || "AI unavailable." };
  }
}

export default function LinkedInPipeline({
  profile,
  applications = [],
  demoContacts = {},
  targetCompanies = [],
  onOpenLinkedInSimulation,
}) {
  const [subTab, setSubTab] = useState("pipeline");
  const [stage, setStage] = useState("idle");
  const [currentStep, setCurrentStep] = useState(-1);
  const [stepDetail, setStepDetail] = useState("");
  const [scannedCompanies, setScannedCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [runError, setRunError] = useState("");
  const [toast, setToast] = useState("");
  const [sendingBusy, setSendingBusy] = useState(false);

  const [followUp, setFollowUp] = useState(() => readStored("cc_pipeline_followup", []));
  const [followUpBusyId, setFollowUpBusyId] = useState(null);
  const [simulatorContact, setSimulatorContact] = useState(null);
  const [simulatorLaunchToken, setSimulatorLaunchToken] = useState(0);
  const [selectedTargetCompany, setSelectedTargetCompany] = useState("");

  useEffect(() => { writeStored("cc_pipeline_followup", followUp); }, [followUp]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("cc_pipeline_nav_request");
      if (!raw) return;
      const request = JSON.parse(raw);
      if (request?.subTab) {
        setSubTab(request.subTab);
      }
      window.localStorage.removeItem("cc_pipeline_nav_request");
    } catch {}
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const resolvedSchool = profile?.education?.[0]?.school || "";
  const targetCompanyList = useMemo(() => {
    const fromTargets = Array.isArray(targetCompanies) ? targetCompanies : [];
    const fromApplications = (applications || []).map((item) => item?.company).filter(Boolean);
    const fromDemo = Object.keys(demoContacts || {});
    return [...new Set([...fromTargets, ...fromApplications, ...fromDemo])]
      .filter(Boolean)
      .filter((company) => (demoContacts?.[company] || []).length > 0);
  }, [applications, demoContacts, targetCompanies]);

  const selectedTargetContacts = useMemo(
    () => (selectedTargetCompany ? (demoContacts?.[selectedTargetCompany] || []) : []),
    [demoContacts, selectedTargetCompany]
  );

  useEffect(() => {
    if (!targetCompanyList.length) {
      setSelectedTargetCompany("");
      return;
    }
    if (!selectedTargetCompany || !targetCompanyList.includes(selectedTargetCompany)) {
      setSelectedTargetCompany(targetCompanyList[0]);
    }
  }, [selectedTargetCompany, targetCompanyList]);

  const senderSummary = useMemo(() => {
    if (!profile) return "A motivated professional exploring new roles.";
    const parts = [
      profile.name && `${profile.name}`,
      profile.title && profile.title,
      profile.education?.[0] && `${profile.education[0].degree || ""} ${profile.education[0].school || ""}`.trim(),
      profile.skills?.length && `Skills: ${profile.skills.slice(0, 6).join(", ")}`,
      profile.location && `Based in ${profile.location}`,
    ].filter(Boolean);
    return parts.join(". ");
  }, [profile]);

  const generateContacts = async (company) => {
    const sys = "You produce realistic networking profiles in strict JSON. Output only a JSON array. No prose, no markdown, no backticks.";
    const usr = `Generate 3 distinct LinkedIn-style contacts who likely work at ${company}. Mix of roles: include at least one Recruiter, one Alumni (ideally from ${resolvedSchool || "the same university as the sender"}), and one Professional, Industry Peer, or Hiring Manager. Each object MUST use this exact shape:
{"name":"First Last","role":"Job Title","type":"Recruiter|Alumni|Professional|Industry Peer|Hiring Manager","school":"University","linkedin":"https://www.linkedin.com/in/slug","email":"first.last@${company.toLowerCase().replace(/\\s+/g, "")}.com","bio":"1-2 sentences"}
Return ONLY the JSON array of 3 objects.`;
    const { text, error } = await geminiCall(sys, usr);
    if (error || !text) return [];
    try {
      const parsed = JSON.parse(stripJson(text));
      if (!Array.isArray(parsed)) return [];
      return parsed.slice(0, 4).map((raw, i) => ({
        id: `${company}-${Date.now()}-${i}`,
        name: raw.name || "Unknown",
        role: raw.role || "Team Member",
        type: raw.type || "Professional",
        school: raw.school || "",
        linkedin: raw.linkedin || "",
        email: raw.email || "",
        bio: raw.bio || "",
        company,
        message: "",
        status: "pending",
        approved: false,
        skipped: false,
      }));
    } catch {
      return [];
    }
  };

  const generateMessage = async (contact) => {
    const style = STYLE_BY_TYPE[contact.type] || "conversational";
    const guide = style === "direct"
      ? "Professional, direct. State interest, highlight one qualification, ask for a quick next step."
      : style === "curiosity"
        ? "Lead with curiosity about their experience. Ask one thoughtful question. Warm but not fawning."
        : "Warm and personal. Reference shared ground (school, background). Build rapport without asking for favors upfront.";
    const sys = `You write LinkedIn connection request notes. STRICTLY under 300 characters. No em dashes. No placeholders like [Your Name]. No greeting line on its own. Return ONLY the note body text.`;
    const usr = `Sender: ${senderSummary}
Recipient: ${contact.name}, ${contact.role} at ${contact.company}. Type: ${contact.type}. School: ${contact.school || "unknown"}. Bio: ${contact.bio}.
Style: ${style}. Guide: ${guide}
Write one LinkedIn connection note under 300 characters.`;
    const { text, error } = await geminiCall(sys, usr);
    if (error) return error;
    let out = (text || "").trim();
    out = out.replace(/\[Your Name\]/gi, profile?.name || "")
      .replace(/\[Your Title\]/gi, profile?.title || "")
      .replace(/\[University\]/gi, resolvedSchool)
      .replace(/\[Company\]/gi, contact.company || "");
    if (out.length > 300) out = out.slice(0, 297).trimEnd() + "...";
    return out;
  };

  const simulateLinkedInConnect = async (contact) => {
    if (typeof onOpenLinkedInSimulation === "function") {
      onOpenLinkedInSimulation(contact, "");
      const draftedNote = await generateMessage(contact);
      onOpenLinkedInSimulation(contact, draftedNote || "");
      return;
    }
    setToast("LinkedIn simulator is not connected yet.");
  };

  const runPipeline = async () => {
    if (!GEMINI_API_KEY) {
      setRunError("Gemini API key missing. Add REACT_APP_GEMINI_API_KEY to .env and restart the app.");
      return;
    }
    setRunError("");
    setStage("running");
    setContacts([]);
    setScannedCompanies([]);
    setCurrentStep(0);
    setStepDetail("Looking at recent applications...");

    const companiesFromApps = [...new Set((applications || []).map((a) => a?.company).filter(Boolean))];
    const pool = companiesFromApps.length ? companiesFromApps : DEMO_COMPANIES;
    const chosen = pool.slice(0, 5);
    setScannedCompanies(chosen);
    await sleep(900);

    setCurrentStep(1);
    const collected = [];
    for (const co of chosen) {
      setStepDetail(`Finding contacts at ${co}...`);
      const found = await generateContacts(co);
      collected.push(...found);
      setContacts([...collected]);
      await sleep(250);
    }

    if (collected.length === 0) {
      setRunError("Couldn't generate any contacts. Check your Gemini API key and try again.");
      setStage("idle");
      setCurrentStep(-1);
      return;
    }

    setCurrentStep(2);
    for (let i = 0; i < collected.length; i++) {
      setStepDetail(`Drafting a note for ${collected[i].name}...`);
      collected[i].message = await generateMessage(collected[i]);
      setContacts([...collected]);
    }

    setCurrentStep(3);
    setStepDetail("All drafts ready. Review below.");
    await sleep(700);
    setStage("review");
  };

  const updateContact = (id, patch) => setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const removeContact = (id) => setContacts((prev) => prev.filter((c) => c.id !== id));

  const approvedCount = contacts.filter((c) => c.approved && !c.skipped).length;
  const allApproved = contacts.length > 0 && contacts.every((c) => c.approved && !c.skipped);

  const toggleSelectAll = () => {
    const next = !allApproved;
    setContacts((prev) => prev.map((c) => (c.skipped ? c : { ...c, approved: next })));
  };

  const sendApproved = async () => {
    const queue = contacts.filter((c) => c.approved && !c.skipped && c.status !== "sent");
    if (!queue.length) {
      setToast("No contacts approved yet.");
      return;
    }
    setSendingBusy(true);
    for (let i = 0; i < queue.length; i++) {
      const c = queue[i];
      try {
        if (c.message && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(c.message);
        }
      } catch {}
      setToast(`Message copied! Paste it in LinkedIn for ${c.name}`);
      const url = linkedInSearchUrl(c.name, c.company);
      window.open(url, "_blank", "noopener,noreferrer");
      if (c.email) {
        const subject = encodeURIComponent(`Hello from ${profile?.name || "a fellow professional"}`);
        const body = encodeURIComponent(c.message || "");
        window.open(`mailto:${c.email}?subject=${subject}&body=${body}`, "_blank", "noopener,noreferrer");
      }
      updateContact(c.id, { status: "sent" });
      setFollowUp((prev) => {
        if (prev.some((item) => item.id === c.id)) return prev;
        return [
          ...prev,
          {
            id: c.id,
            name: c.name,
            role: c.role,
            company: c.company,
            type: c.type,
            linkedin: c.linkedin,
            email: c.email,
            bio: c.bio,
            message: c.message,
            connectionStatus: "pending",
            sentAt: new Date().toISOString(),
            followUpOptions: null,
            chosenFollowUp: "",
          },
        ];
      });
      if (i < queue.length - 1) await sleep(2000);
    }
    setSendingBusy(false);
    setStage("sent");
    setToast(`Processed ${queue.length} contact${queue.length === 1 ? "" : "s"}. Check each LinkedIn tab.`);
  };

  const resetPipeline = () => {
    setStage("idle");
    setCurrentStep(-1);
    setStepDetail("");
    setContacts([]);
    setScannedCompanies([]);
    setRunError("");
  };

  const setConnectionStatus = (id, connectionStatus) => {
    setFollowUp((prev) => prev.map((item) => (item.id === id ? { ...item, connectionStatus } : item)));
  };

  const generateFollowUpOptions = async (item) => {
    setFollowUpBusyId(item.id);
    const sys = "You write three alternative LinkedIn follow-up messages for a newly connected contact. Return strict JSON only.";
    const usr = `Sender: ${senderSummary}
Recipient: ${item.name}, ${item.role} at ${item.company}. Type: ${item.type}. Bio: ${item.bio || "(no bio)"}.

Write THREE distinct follow-up messages, each under 280 characters. Format:
{"coffee":"...","referral":"...","curiosity":"..."}

Tone guide:
- coffee: casual coffee chat invite (15-20 min, flexible)
- referral: direct, respectful ask for referral to a relevant role
- curiosity: ask one genuine question about their path and experience

Return ONLY the JSON object. No prose, no backticks.`;
    const { text, error } = await geminiCall(sys, usr);
    setFollowUpBusyId(null);
    if (error || !text) {
      setToast(error || "Could not generate follow-up options.");
      return;
    }
    try {
      const parsed = JSON.parse(stripJson(text));
      setFollowUp((prev) => prev.map((f) => (f.id === item.id ? { ...f, followUpOptions: parsed, chosenFollowUp: parsed.coffee || "" } : f)));
    } catch {
      setToast("Could not parse follow-up options.");
    }
  };

  const chooseFollowUp = (id, key) => {
    setFollowUp((prev) => prev.map((f) => {
      if (f.id !== id) return f;
      const body = f.followUpOptions?.[key] || "";
      return { ...f, chosenFollowUp: body, selectedKey: key };
    }));
  };

  const sendFollowUp = async (item) => {
    const body = item.chosenFollowUp || "";
    if (!body) {
      setToast("Pick a follow-up option first.");
      return;
    }
    try { if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(body); } catch {}
    if (item.email) {
      const subject = encodeURIComponent(`Following up - ${profile?.name || ""}`);
      window.open(`mailto:${item.email}?subject=${subject}&body=${encodeURIComponent(body)}`, "_blank", "noopener,noreferrer");
    } else {
      window.open(linkedInSearchUrl(item.name, item.company), "_blank", "noopener,noreferrer");
    }
    setToast(`Follow-up copied! Paste it in ${item.email ? "Gmail" : "LinkedIn"}.`);
    setFollowUp((prev) => prev.map((f) => (f.id === item.id ? { ...f, followUpSentAt: new Date().toISOString() } : f)));
  };

  const removeFollowUp = (id) => setFollowUp((prev) => prev.filter((f) => f.id !== id));

  const openSimulatorFor = (contact = null) => {
    setSimulatorContact(contact || null);
    setSimulatorLaunchToken((prev) => prev + 1);
    setSubTab("simulator");
  };

  const renderStepTile = (i) => {
    const step = PIPELINE_STEPS[i];
    const isDone = i < currentStep;
    const isActive = i === currentStep;
    const isPending = i > currentStep;
    return (
      <div key={i} style={{
        display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", borderRadius: "12px",
        background: isDone ? C.okLight : isActive ? C.primaryLight : "#fafaf9",
        border: `1px solid ${isActive ? C.primary + "55" : isDone ? C.ok + "33" : C.border}`,
        transition: "all 0.4s ease", opacity: isPending ? 0.5 : 1,
      }}>
        <span style={{ fontSize: "22px" }}>{isDone ? "✅" : isActive ? step.icon : "⬜"}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: "14px", fontWeight: isActive ? 700 : isDone ? 600 : 500, color: isPending ? C.muted : C.text, margin: 0 }}>{step.label}</p>
          <p style={{ fontSize: "12px", color: C.sub, margin: "2px 0 0" }}>{isActive && stepDetail ? stepDetail : step.sub}</p>
        </div>
        {isActive && <span style={{ width: 16, height: 16, border: `2.5px solid ${C.primary}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />}
        {isDone && <span style={{ fontSize: "11px", color: C.ok, fontWeight: 700 }}>Done</span>}
      </div>
    );
  };

  const pipelineTab = (
    <>
      {!!targetCompanyList.length && (
        <div style={{ ...card, border: `1px solid ${C.accent}33`, background: "#fffcf2" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 800, margin: 0 }}>Target Companies & Contacts</h2>
              <p style={{ fontSize: "13px", color: C.sub, lineHeight: 1.6, maxWidth: "700px", marginTop: "6px" }}>
                Keep your target-company research and outreach in one place. Pick a company to review warm contacts before you run the outreach pipeline.
              </p>
            </div>
            <span style={{ fontSize: "12px", color: C.sub }}>{targetCompanyList.length} companies tracked</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginTop: "16px" }}>
            {targetCompanyList.map((company) => {
              const active = company === selectedTargetCompany;
              const count = demoContacts?.[company]?.length || 0;
              return (
                <button
                  key={company}
                  onClick={() => setSelectedTargetCompany(company)}
                  style={{
                    textAlign: "left",
                    background: active ? C.primaryLight : "#fff",
                    border: `1.5px solid ${active ? C.primary : C.border}`,
                    borderRadius: "14px",
                    padding: "14px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <p style={{ fontSize: "15px", fontWeight: 800, color: C.text, margin: 0 }}>{company}</p>
                  <p style={{ fontSize: "12px", color: active ? C.primaryDark : C.sub, margin: "6px 0 0" }}>
                    {count} saved contact{count === 1 ? "" : "s"}
                  </p>
                </button>
              );
            })}
          </div>

          {selectedTargetCompany && (
            <div style={{ marginTop: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "10px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: 800, margin: 0 }}>Contacts at {selectedTargetCompany}</h3>
                {!!selectedTargetContacts.length && (
                  <span style={{ fontSize: "12px", color: C.sub }}>{selectedTargetContacts.length} contacts available</span>
                )}
              </div>

              {selectedTargetContacts.length ? (
                <div style={{ display: "grid", gap: "10px" }}>
                  {selectedTargetContacts.map((contact) => (
                    <div key={contact.id} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: "14px", padding: "14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                        <div style={{ display: "flex", gap: "10px", alignItems: "center", minWidth: 0 }}>
                          <div style={av(C.primary)}>{contact.name?.[0] || "?"}</div>
                          <div style={{ minWidth: 0 }}>
                            <h4 style={{ fontSize: "14px", fontWeight: 800, margin: 0 }}>{contact.name}</h4>
                            <p style={{ fontSize: "12px", color: C.sub, margin: "2px 0" }}>{contact.role} • {contact.tenure}</p>
                            <p style={{ fontSize: "11px", color: C.muted, margin: 0 }}>{contact.school}</p>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                          <span style={badge(contact.type)}>{contact.type}</span>
                          <button
                            style={{ ...btn("ghost"), fontSize: "12px", padding: "6px 12px", border: `1px solid ${C.border}` }}
                            onClick={() => openSimulatorFor(contact)}
                          >
                            Practice Chat
                          </button>
                          <button
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: "50%",
                              border: `1.5px solid ${C.border}`,
                              background: "#fff",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              boxShadow: C.shadow,
                            }}
                            title="Open LinkedIn connection simulation"
                            onClick={() => simulateLinkedInConnect(contact)}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="#0077B5" aria-hidden="true">
                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                            </svg>
                          </button>
                          <a
                            href={linkedInSearchUrl(contact.name, contact.company)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ ...btn("secondary"), fontSize: "12px", padding: "6px 12px", textDecoration: "none" }}
                          >
                            Find on LinkedIn
                          </a>
                        </div>
                      </div>
                      {contact.bio && <p style={{ fontSize: "12px", color: C.sub, lineHeight: 1.6, margin: "10px 0 0" }}>{contact.bio}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: "14px", padding: "16px" }}>
                  <p style={{ fontSize: "13px", color: C.sub, margin: 0 }}>
                    No saved contacts for {selectedTargetCompany} yet. Run the pipeline to generate contact suggestions for this company.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ ...card, border: `1px solid ${C.primary}33` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 800, margin: 0 }}>LinkedIn Outreach Pipeline</h2>
            <p style={{ fontSize: "13px", color: C.sub, lineHeight: 1.6, maxWidth: "680px", marginTop: "6px" }}>
              Scans the companies you applied to, finds 3-4 contacts at each, drafts personalized LinkedIn notes under 300 characters, and queues them for your review. Nothing is sent until you approve it.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {stage !== "idle" && (
              <button style={btn("ghost")} onClick={resetPipeline}>Reset</button>
            )}
            <button style={btn("primary")} onClick={runPipeline} disabled={stage === "running"}>
              {stage === "running" ? "Running..." : stage === "review" ? "Re-run Pipeline" : "Run Pipeline"}
            </button>
          </div>
        </div>

        {runError && (
          <div style={{ marginTop: "12px", padding: "10px 14px", borderRadius: "10px", fontSize: "12px", background: C.errLight, color: C.err, border: `1px solid ${C.err}33` }}>
            {runError}
          </div>
        )}

        {(stage === "running" || stage === "review" || stage === "sent") && (
          <div style={{ marginTop: "16px", display: "grid", gap: "8px" }}>
            {PIPELINE_STEPS.map((_, i) => renderStepTile(i))}
          </div>
        )}

        {!!scannedCompanies.length && (
          <div style={{ marginTop: "14px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {scannedCompanies.map((co) => (
              <span key={co} style={tag}>{co}</span>
            ))}
          </div>
        )}
      </div>

      {stage === "review" && contacts.length > 0 && (
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "14px" }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <input type="checkbox" checked={allApproved} onChange={toggleSelectAll} style={{ width: 16, height: 16, cursor: "pointer" }} />
              <span style={{ fontSize: "13px", fontWeight: 700 }}>Select All</span>
              <span style={{ fontSize: "12px", color: C.sub }}>({approvedCount} of {contacts.filter((c) => !c.skipped).length} approved)</span>
            </div>
            <button style={btn("amber")} onClick={sendApproved} disabled={sendingBusy || approvedCount === 0}>
              {sendingBusy ? "Opening tabs..." : `Approve & Send (${approvedCount})`}
            </button>
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            {contacts.map((c) => {
              const isSent = c.status === "sent";
              const isApproved = c.approved && !c.skipped;
              const borderColor = isSent ? C.info : isApproved ? C.ok : c.skipped ? C.muted : C.border;
              const bg = isSent ? C.infoLight : isApproved ? C.okLight : c.skipped ? "#fafaf9" : "#fff";
              const over = (c.message || "").length > 300;
              return (
                <div key={c.id} style={{ background: bg, border: `1.5px solid ${borderColor}`, borderRadius: "12px", padding: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center", minWidth: 0 }}>
                      <div style={av(C.primary)}>{c.name?.[0] || "?"}</div>
                      <div style={{ minWidth: 0 }}>
                        <h3 style={{ fontSize: "14px", fontWeight: 700, margin: 0 }}>{c.name}</h3>
                        <p style={{ fontSize: "12px", color: C.sub, margin: "2px 0" }}>{c.role} at {c.company}</p>
                        {c.school && <p style={{ fontSize: "11px", color: C.muted, margin: 0 }}>{c.school}</p>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                      <span style={badge(c.type)}>{c.type}</span>
                      {isSent && <span style={{ fontSize: "11px", fontWeight: 700, color: C.info, background: C.infoLight, padding: "3px 10px", borderRadius: "20px", border: `1px solid ${C.info}33` }}>Sent</span>}
                    </div>
                  </div>

                  {c.bio && <p style={{ fontSize: "12px", color: C.sub, marginTop: "8px", lineHeight: 1.5 }}>{c.bio}</p>}

                  <div style={{ marginTop: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "11px", color: C.sub }}>LinkedIn note</span>
                      <span style={{ fontSize: "11px", color: over ? C.err : C.muted, fontWeight: over ? 700 : 500 }}>
                        {(c.message || "").length}/300
                      </span>
                    </div>
                    <textarea
                      value={c.message || ""}
                      onChange={(e) => updateContact(c.id, { message: e.target.value })}
                      disabled={isSent || c.skipped}
                      style={{
                        width: "100%", minHeight: "80px", resize: "vertical",
                        background: "#fff", borderRadius: "10px", border: `1px solid ${over ? C.err : C.border}`,
                        padding: "10px 12px", fontSize: "13px", lineHeight: 1.5, color: C.text, fontFamily: "inherit", outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>

                  {!isSent && !c.skipped && (
                    <div style={{ marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <button
                        style={{ ...btn(isApproved ? "ok" : "secondary"), fontSize: "12px", padding: "6px 14px" }}
                        onClick={() => updateContact(c.id, { approved: !c.approved, skipped: false })}
                      >
                        {isApproved ? "✅ Approved" : "✅ Approve"}
                      </button>
                      <button
                        style={{ ...btn("ghost"), fontSize: "12px", padding: "6px 14px", border: `1px solid ${C.border}` }}
                        title="Focus the editor to edit"
                        onClick={(e) => {
                          const area = e.currentTarget.closest("div")?.parentElement?.querySelector("textarea");
                          area?.focus();
                        }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        style={{ ...btn("ghost"), fontSize: "12px", padding: "6px 14px", color: C.err, border: `1px solid ${C.err}33` }}
                        onClick={() => removeContact(c.id)}
                      >
                        ❌ Skip
                      </button>
                      <a
                        href={linkedInSearchUrl(c.name, c.company)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ ...btn("ghost"), fontSize: "12px", padding: "6px 14px", textDecoration: "none", border: `1px solid ${C.border}` }}
                      >
                        🔎 Find on LinkedIn
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
            <button style={btn("amber")} onClick={sendApproved} disabled={sendingBusy || approvedCount === 0}>
              {sendingBusy ? "Opening tabs..." : `Approve & Send (${approvedCount})`}
            </button>
          </div>
        </div>
      )}

      {stage === "sent" && contacts.some((c) => c.status === "sent") && (
        <div style={{ ...card, background: C.infoLight, border: `1px solid ${C.info}33` }}>
          <h3 style={{ fontSize: "15px", fontWeight: 800, margin: 0 }}>🎉 Pipeline complete</h3>
          <p style={{ fontSize: "13px", color: C.sub, marginTop: "6px" }}>
            {contacts.filter((c) => c.status === "sent").length} contact{contacts.filter((c) => c.status === "sent").length === 1 ? " is" : "s are"} queued in the Follow-up tab. LinkedIn tabs were opened for each one; paste your message from the clipboard to finish sending.
          </p>
          <button style={{ ...btn("secondary"), marginTop: "10px" }} onClick={() => setSubTab("followup")}>Go to Follow-up Queue →</button>
        </div>
      )}
    </>
  );

  const followUpTab = (
    <>
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 800, margin: 0 }}>Follow-up Queue</h2>
            <p style={{ fontSize: "13px", color: C.sub, lineHeight: 1.6, maxWidth: "680px", marginTop: "6px" }}>
              Track connection requests you sent from the pipeline. Mark them as Connected once they accept, and we'll draft three follow-up options for each.
            </p>
          </div>
          <span style={{ fontSize: "12px", color: C.sub }}>{followUp.length} contact{followUp.length === 1 ? "" : "s"} tracked</span>
        </div>
      </div>

      {followUp.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: "50px" }}>
          <p style={{ fontSize: "32px", marginBottom: "10px" }}>📬</p>
          <p style={{ fontSize: "14px", color: C.sub }}>No contacts in your follow-up queue yet.</p>
          <button style={{ ...btn("primary"), marginTop: "14px" }} onClick={() => setSubTab("pipeline")}>Run the Pipeline →</button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "12px" }}>
          {followUp.map((item) => {
            const isConnected = item.connectionStatus === "connected";
            return (
              <div key={item.id} style={{ ...card, padding: "16px", border: `1.5px solid ${isConnected ? C.ok + "55" : C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center", minWidth: 0 }}>
                    <div style={av(isConnected ? C.ok : C.primary)}>{item.name?.[0] || "?"}</div>
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ fontSize: "14px", fontWeight: 700, margin: 0 }}>{item.name}</h3>
                      <p style={{ fontSize: "12px", color: C.sub, margin: "2px 0" }}>{item.role} at {item.company}</p>
                      <p style={{ fontSize: "11px", color: C.muted }}>Sent {item.sentAt ? new Date(item.sentAt).toLocaleDateString() : ""}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <span style={badge(item.type)}>{item.type}</span>
                    <button
                      style={{ ...btn("ghost"), fontSize: "12px", padding: "6px 12px", border: `1px solid ${C.border}` }}
                      onClick={() => openSimulatorFor(item)}
                    >
                      Practice This Chat
                    </button>
                    <button
                      style={{ ...btn(isConnected ? "ok" : "secondary"), fontSize: "12px", padding: "6px 14px" }}
                      onClick={() => setConnectionStatus(item.id, isConnected ? "pending" : "connected")}
                    >
                      {isConnected ? "✓ Connected" : "Pending Acceptance"}
                    </button>
                    <button
                      style={{ ...btn("ghost"), fontSize: "12px", padding: "6px 10px", color: C.err, border: `1px solid ${C.err}33` }}
                      onClick={() => removeFollowUp(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {isConnected && (
                  <div style={{ marginTop: "14px", padding: "12px", background: "#fafaf9", borderRadius: "10px", border: `1px solid ${C.border}` }}>
                    {!item.followUpOptions ? (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        <p style={{ fontSize: "13px", color: C.sub, margin: 0 }}>Draft three follow-up options personalized to this contact.</p>
                        <button style={btn("primary")} onClick={() => generateFollowUpOptions(item)} disabled={followUpBusyId === item.id}>
                          {followUpBusyId === item.id ? "Drafting..." : "Generate Follow-ups"}
                        </button>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
                          {[
                            { key: "coffee", label: "☕ Coffee Chat" },
                            { key: "referral", label: "🎯 Referral Ask" },
                            { key: "curiosity", label: "💬 Learn More" },
                          ].map((opt) => {
                            const active = item.selectedKey === opt.key || (!item.selectedKey && opt.key === "coffee");
                            return (
                              <button key={opt.key} style={tab(active)} onClick={() => chooseFollowUp(item.id, opt.key)}>
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                        <textarea
                          value={item.chosenFollowUp || ""}
                          onChange={(e) => setFollowUp((prev) => prev.map((f) => (f.id === item.id ? { ...f, chosenFollowUp: e.target.value } : f)))}
                          style={{ ...inp, minHeight: "100px", resize: "vertical", background: "#fff" }}
                        />
                        <div style={{ marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "space-between" }}>
                          <div style={{ fontSize: "11px", color: C.muted, alignSelf: "center" }}>
                            {(item.chosenFollowUp || "").length} chars
                            {item.followUpSentAt && ` · Last sent ${new Date(item.followUpSentAt).toLocaleString()}`}
                          </div>
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            <button style={btn("secondary")} onClick={() => generateFollowUpOptions(item)} disabled={followUpBusyId === item.id}>
                              {followUpBusyId === item.id ? "Regenerating..." : "Regenerate"}
                            </button>
                            <button style={btn("primary")} onClick={() => sendFollowUp(item)}>
                              {item.email ? "📧 Copy + Open Gmail" : "🔗 Copy + Open LinkedIn"}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  const simulatorTab = (
    <CoffeeChatSimulator
      profile={profile}
      contacts={contacts}
      followUpContacts={followUp}
      initialContact={simulatorContact}
      launchToken={simulatorLaunchToken}
    />
  );

  return (
    <div style={wrap}>
      <h1 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "6px" }}>LinkedIn Pipeline</h1>
      <p style={{ fontSize: "14px", color: C.sub, marginBottom: "20px" }}>
        AI-powered outreach: scan applications, find contacts, draft messages, and track follow-ups.
      </p>

      <div style={{ display: "flex", gap: "6px", marginBottom: "20px" }}>
        <button style={tab(subTab === "pipeline")} onClick={() => setSubTab("pipeline")}>Pipeline</button>
        <button style={tab(subTab === "followup")} onClick={() => setSubTab("followup")}>
          Follow-up Queue{followUp.length > 0 && ` (${followUp.length})`}
        </button>
        <button style={tab(subTab === "simulator")} onClick={() => openSimulatorFor(simulatorContact)}>
          Simulator
        </button>
      </div>

      {subTab === "pipeline" ? pipelineTab : subTab === "followup" ? followUpTab : simulatorTab}

      {toast && (
        <div style={{
          position: "fixed", bottom: "94px", left: "50%", transform: "translateX(-50%)",
          background: C.text, color: "#fff", padding: "12px 20px", borderRadius: "12px",
          fontSize: "13px", fontWeight: 600, boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
          zIndex: 400, animation: "fadeIn 0.2s ease", maxWidth: "90vw",
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
