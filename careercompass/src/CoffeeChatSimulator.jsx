import { useEffect, useMemo, useRef, useState } from "react";

const C = {
  primary: "#0d9488", primaryLight: "#ccfbf1", primaryDark: "#0f766e",
  accent: "#f59e0b", accentLight: "#fef3c7",
  bg: "#fafaf9", card: "#ffffff", text: "#1c1917", sub: "#78716c", muted: "#a8a29e", border: "#e7e5e4",
  ok: "#16a34a", okLight: "#dcfce7", err: "#ef4444", errLight: "#fef2f2",
  shadow: "0 1px 3px rgba(28,25,23,0.06)",
};

const DEMO_SIM_CONTACTS = [
  {
    id: "demo-google-recruiter",
    name: "David Park",
    role: "Technical Recruiter",
    company: "Google",
    type: "Recruiter",
    school: "UCLA",
    tenure: "2 years",
    bio: "Recruits for Cloud and Data Engineering roles and values concise, thoughtful outreach.",
    linkedin: "https://linkedin.com/in/davidpark",
    email: "david.park@google.com",
  },
  {
    id: "demo-amazon-alumni",
    name: "Priya Sharma",
    role: "SDE II",
    company: "Amazon",
    type: "Alumni",
    school: "ULM",
    tenure: "2 years",
    bio: "ULM alum who enjoys helping early-career engineers understand the interview loop.",
    linkedin: "https://linkedin.com/in/priyasharma",
    email: "priya.s@amazon.com",
  },
  {
    id: "demo-meta-manager",
    name: "Nina Patel",
    role: "Tech Lead, Infrastructure",
    company: "Meta",
    type: "Team Lead",
    school: "Carnegie Mellon",
    tenure: "4 years",
    bio: "Leads infrastructure hiring and likes candidates who can explain why they care about the work.",
    linkedin: "https://linkedin.com/in/ninapatel",
    email: "nina.p@meta.com",
  },
];

const btn = (v = "primary") => ({
  padding: "10px 18px", borderRadius: "10px", border: "none", fontWeight: 700, fontSize: "14px", cursor: "pointer", transition: "all 0.18s ease", fontFamily: "inherit",
  ...(v === "primary" ? { background: C.primary, color: "#fff" }
    : v === "secondary" ? { background: C.primaryLight, color: C.primaryDark }
    : v === "amber" ? { background: C.accent, color: "#fff" }
    : v === "ghost" ? { background: "transparent", color: C.sub, border: `1px solid ${C.border}` }
    : { background: C.border, color: C.text }),
});

const card = {
  background: C.card,
  borderRadius: "16px",
  border: `1px solid ${C.border}`,
  padding: "20px",
  boxShadow: C.shadow,
};

const input = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "12px",
  border: `1px solid ${C.border}`,
  fontSize: "14px",
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
  background: "#fff",
};

const tab = (active) => ({
  padding: "8px 16px",
  borderRadius: "999px",
  border: "none",
  background: active ? C.primary : "#fff",
  color: active ? "#fff" : C.sub,
  fontWeight: 700,
  fontSize: "13px",
  cursor: "pointer",
  fontFamily: "inherit",
  boxShadow: active ? "0 10px 24px rgba(13,148,136,0.18)" : "none",
});

const bubble = (role) => ({
  maxWidth: "82%",
  padding: "12px 14px",
  borderRadius: role === "user" ? "16px 16px 6px 16px" : "16px 16px 16px 6px",
  background: role === "user" ? C.primary : "#f5f5f4",
  color: role === "user" ? "#fff" : C.text,
  fontSize: "14px",
  lineHeight: 1.6,
  boxShadow: role === "user" ? "0 10px 24px rgba(13,148,136,0.18)" : "none",
});

const avatarStyle = (size = 52) => ({
  width: size,
  height: size,
  borderRadius: "50%",
  background: C.primary,
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 800,
  fontSize: size > 40 ? "20px" : "14px",
  flexShrink: 0,
});

const dedupeContacts = (items) => {
  const seen = new Set();
  return items.filter((item, index) => {
    const key = `${item.name || ""}|${item.company || ""}|${item.role || ""}`.toLowerCase();
    if (!key.trim()) {
      return index === 0;
    }
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getInitials = (name = "") =>
  String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";

export default function CoffeeChatSimulator({
  profile,
  contacts = [],
  followUpContacts = [],
  initialContact = null,
  launchToken = 0,
}) {
  const apiBase = "/api";
  const RecognitionCtor = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
  const supportsVoice = Boolean(RecognitionCtor && typeof window !== "undefined" && window.speechSynthesis);

  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef("");

  const allContacts = useMemo(
    () => dedupeContacts([...contacts, ...followUpContacts, ...DEMO_SIM_CONTACTS].filter((item) => item?.name)),
    [contacts, followUpContacts]
  );

  const [selectedId, setSelectedId] = useState(initialContact?.id || allContacts[0]?.id || "");
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [outcome, setOutcome] = useState("");
  const [followUps, setFollowUps] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [voices, setVoices] = useState([]);
  const [voiceUri, setVoiceUri] = useState("");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [callEnded, setCallEnded] = useState(false);

  const selectedContact = useMemo(
    () => allContacts.find((item) => item.id === selectedId) || initialContact || allContacts[0] || null,
    [allContacts, initialContact, selectedId]
  );

  useEffect(() => {
    if (!initialContact) return;
    setSelectedId(initialContact.id);
    setStarted(false);
    setMessages([]);
    setOutcome("");
    setFollowUps(null);
    setFeedback(null);
    setError("");
    setCallEnded(false);
  }, [initialContact, launchToken]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, speaking, listening]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return undefined;
    const loadVoices = () => {
      const nextVoices = window.speechSynthesis.getVoices() || [];
      setVoices(nextVoices);
      if (!voiceUri && nextVoices.length) {
        setVoiceUri(nextVoices[0].voiceURI);
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [voiceUri]);

  useEffect(() => () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);

  const postJson = async (path, payload) => {
    const response = await fetch(`${apiBase}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error("Simulator backend is unavailable right now.");
    }
    const data = await response.json();
    if (!response.ok || data.ok === false) {
      throw new Error(data.error || "Simulator request failed.");
    }
    return data;
  };

  const speakText = (text) => {
    if (typeof window === "undefined" || !window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const pickedVoice = voices.find((item) => item.voiceURI === voiceUri);
    if (pickedVoice) utterance.voice = pickedVoice;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const requestAssistantTurn = async (nextMessages, options = {}) => {
    const data = await postJson("/simulator/chat", {
      contact: selectedContact,
      messages: nextMessages,
    });
    const replyText = data.reply || "";
    const finalMessages = [...nextMessages, { role: "assistant", content: replyText }];
    setMessages(finalMessages);
    if (options.speak) {
      speakText(replyText);
    }
  };

  const startChat = async () => {
    if (!selectedContact) {
      setError("Choose a contact first.");
      return;
    }
    setBusy(true);
    setError("");
      setMessages([]);
      setFollowUps(null);
      setOutcome("");
      setFeedback(null);
      setCallEnded(false);
      try {
      setStarted(true);
      await requestAssistantTurn([], { speak: true });
    } catch (nextError) {
      setError(nextError.message || "Could not start the simulator.");
      setStarted(false);
    } finally {
      setBusy(false);
    }
  };

  const sendMessage = async (rawValue, options = {}) => {
    const text = String(rawValue || "").trim();
    if (!text || busy || !selectedContact || callEnded) return;
    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setBusy(true);
    setError("");
    try {
      await requestAssistantTurn(nextMessages, { speak: options.speak });
    } catch (nextError) {
      setMessages(messages);
      setError(nextError.message || "Could not continue the chat.");
    } finally {
      setBusy(false);
    }
  };

  const handleVoiceCapture = () => {
    if (!supportsVoice) {
      setError("Voice chat requires Chrome browser.");
      return;
    }
    if (busy || speaking) return;
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const recognition = new RecognitionCtor();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      transcriptRef.current = "";
      setListening(true);
      setError("");
    };

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0]?.transcript || "";
      }
      transcriptRef.current = transcript.trim();
    };

    recognition.onerror = () => {
      setListening(false);
      setError("Could not capture your voice clearly. Try again.");
    };

    recognition.onend = async () => {
      setListening(false);
      const finalTranscript = transcriptRef.current.trim();
      transcriptRef.current = "";
      if (!finalTranscript) return;
      await sendMessage(finalTranscript, { speak: true });
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const generateFollowUps = async () => {
    if (!selectedContact || !outcome.trim()) {
      setError("Add a quick summary of how the chat went first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await postJson("/simulator/followups", {
        contact: selectedContact,
        outcome,
      });
      setFollowUps(data.followUps || null);
    } catch (nextError) {
      setError(nextError.message || "Could not generate follow-up messages.");
    } finally {
      setBusy(false);
    }
  };

  const endCall = async () => {
    if (!messages.length || busy) return;
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    if (recognitionRef.current) recognitionRef.current.stop();
    setListening(false);
    setSpeaking(false);
    setBusy(true);
    setError("");
    try {
      const data = await postJson("/simulator/analyze", {
        contact: selectedContact,
        messages,
      });
      setFeedback(data.feedback || null);
      setCallEnded(true);
    } catch (nextError) {
      setError(nextError.message || "Could not analyze the call.");
    } finally {
      setBusy(false);
    }
  };

  const statusText = listening ? "Listening..." : speaking ? "Speaking..." : callEnded ? "Call ended" : started ? "Ready for your next turn" : "Choose a contact to begin";
  const showOutcome = callEnded && messages.length >= 5;

  return (
    <div style={{ display: "grid", gap: "16px" }}>
      <style>{`
        @keyframes ccWave {
          0%, 100% { transform: scaleY(0.35); opacity: 0.35; }
          50% { transform: scaleY(1); opacity: 1; }
        }
        @keyframes ccPulse {
          0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.35); }
          70% { box-shadow: 0 0 0 18px rgba(239,68,68,0); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }
      `}</style>

      <div style={{ ...card, border: `1px solid ${C.primary}33`, background: "linear-gradient(180deg, #fff 0%, #fafaf9 100%)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 800, margin: 0 }}>Coffee Chat Simulator</h2>
            <p style={{ fontSize: "13px", color: C.sub, lineHeight: 1.6, maxWidth: "720px", marginTop: "6px" }}>
                Practice a realistic networking conversation with AI role-playing the professional you selected. Start in text, or switch into voice mode for a more immersive rehearsal.
              Practice a realistic networking conversation with AI role-playing the professional you selected. This simulator is voice-first so it feels more like a real coffee chat.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ ...tab(true), cursor: "default" }}>Voice Simulator</span>
          </div>
        </div>

        {!supportsVoice && (
          <div style={{ marginTop: "12px", padding: "10px 14px", borderRadius: "10px", border: `1px solid ${C.accent}33`, background: C.accentLight, color: "#92400e", fontSize: "12px", fontWeight: 600 }}>
            Voice chat requires Chrome browser.
          </div>
        )}
      </div>

      <div style={{ ...card, padding: "18px" }}>
        <div style={{ display: "grid", gap: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 800, margin: 0 }}>Choose who you want to practice with</h3>
            <span style={{ fontSize: "12px", color: C.sub }}>{allContacts.length} contacts available</span>
          </div>

          <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))" }}>
            {allContacts.map((contact) => {
              const active = contact.id === selectedContact?.id;
              return (
                <button
                  key={contact.id}
                  onClick={() => {
                    setSelectedId(contact.id);
                    setStarted(false);
                    setMessages([]);
                    setOutcome("");
                    setFollowUps(null);
                    setFeedback(null);
                    setError("");
                    setCallEnded(false);
                  }}
                  style={{
                    textAlign: "left",
                    background: active ? C.primaryLight : "#fff",
                    border: `1.5px solid ${active ? C.primary : C.border}`,
                    borderRadius: "14px",
                    padding: "14px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.18s ease",
                  }}
                >
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <div style={avatarStyle(42)}>{getInitials(contact.name)}</div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: "14px", fontWeight: 800, color: C.text, margin: 0 }}>{contact.name}</p>
                      <p style={{ fontSize: "12px", color: C.sub, margin: "2px 0 0" }}>{contact.role}</p>
                    </div>
                  </div>
                  <p style={{ fontSize: "12px", color: C.text, margin: "10px 0 0" }}>{contact.company}</p>
                  <p style={{ fontSize: "11px", color: C.muted, margin: "4px 0 0" }}>{contact.type || "Professional"}{contact.school ? ` • ${contact.school}` : ""}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {selectedContact && (
        <div style={{ ...card, overflow: "hidden", padding: 0 }}>
          <div style={{ padding: "20px", background: "linear-gradient(135deg, #ecfeff 0%, #fff7ed 100%)", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                <div style={avatarStyle(58)}>{getInitials(selectedContact.name)}</div>
                <div>
                  <h3 style={{ fontSize: "18px", fontWeight: 800, margin: 0 }}>{selectedContact.name}</h3>
                  <p style={{ fontSize: "13px", color: C.sub, margin: "4px 0 0" }}>{selectedContact.role} at {selectedContact.company}</p>
                  <p style={{ fontSize: "12px", color: C.text, margin: "6px 0 0" }}>
                    {(selectedContact.type || "Professional")}
                    {selectedContact.school ? ` • ${selectedContact.school}` : ""}
                    {selectedContact.tenure ? ` • ${selectedContact.tenure}` : ""}
                  </p>
                </div>
              </div>

                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                {supportsVoice && voices.length > 0 && (
                  <select value={voiceUri} onChange={(e) => setVoiceUri(e.target.value)} style={{ ...input, width: "220px", padding: "10px 12px" }}>
                    {voices.map((voice) => (
                      <option key={voice.voiceURI} value={voice.voiceURI}>
                        {voice.name}
                      </option>
                    ))}
                  </select>
                )}
                <button style={btn("primary")} onClick={startChat} disabled={busy}>
                  {started ? "Restart Chat" : "Start Chat"}
                </button>
                {started && (
                  <button
                    style={{ ...btn("ghost"), color: C.err, border: `1px solid ${C.err}33` }}
                    onClick={endCall}
                    disabled={busy || !messages.length}
                  >
                    End Call
                  </button>
                )}
              </div>
            </div>
            {selectedContact.bio && (
              <p style={{ fontSize: "13px", color: C.sub, lineHeight: 1.6, margin: "14px 0 0" }}>
                {selectedContact.bio}
              </p>
            )}
          </div>

          <div style={{ padding: "20px", display: "grid", gap: "16px" }}>
            <div style={{ ...card, background: "#fffbeb", border: `1px solid ${C.accent}33`, textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
                <div style={{ ...avatarStyle(64), background: speaking ? C.accent : listening ? C.err : C.primary }}>
                  {getInitials(selectedContact.name)}
                </div>
              </div>
              <p style={{ fontSize: "14px", fontWeight: 800, margin: 0 }}>{selectedContact.name}</p>
              <p style={{ fontSize: "12px", color: C.sub, margin: "6px 0 0" }}>{statusText}</p>

              <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: "5px", height: "42px", margin: "16px 0" }}>
                {[0, 1, 2, 3, 4, 5, 6].map((index) => (
                  <span
                    key={index}
                    style={{
                      width: "6px",
                      height: "100%",
                      borderRadius: "999px",
                      background: speaking ? C.accent : listening ? C.err : C.primary,
                      opacity: speaking || listening ? 1 : 0.2,
                      animation: speaking || listening ? `ccWave ${0.9 + index * 0.08}s ease-in-out infinite` : "none",
                      animationDelay: `${index * 0.1}s`,
                      transformOrigin: "bottom center",
                    }}
                  />
                ))}
              </div>

              <button
                onClick={handleVoiceCapture}
                disabled={!started || busy || speaking || callEnded}
                style={{
                  width: "94px",
                  height: "94px",
                  borderRadius: "50%",
                  border: "none",
                  background: listening ? C.err : "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)",
                  color: "#fff",
                  fontSize: "28px",
                  cursor: started ? "pointer" : "not-allowed",
                  margin: "0 auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  animation: listening ? "ccPulse 1.2s infinite" : "none",
                  boxShadow: "0 18px 32px rgba(28,25,23,0.16)",
                }}
                title={started ? "Tap to speak" : "Start the chat first"}
              >
                🎙️
              </button>
            </div>

            <div style={{ background: "#fcfcfb", border: `1px solid ${C.border}`, borderRadius: "16px", padding: "16px", minHeight: "360px", display: "flex", flexDirection: "column" }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px", overflowY: "auto", paddingRight: "4px" }}>
                {!messages.length && (
                  <div style={{ margin: "auto", textAlign: "center", color: C.muted, padding: "28px 10px" }}>
                    <p style={{ fontSize: "28px", marginBottom: "10px" }}>☕</p>
                    <p style={{ fontSize: "13px", lineHeight: 1.7, maxWidth: "460px" }}>
                      Start the simulator and Claude will open as the professional you selected, asking about your background and what you are hoping to learn.
                    </p>
                  </div>
                )}

                {messages.map((message, index) => (
                  <div key={`${message.role}-${index}`} style={{ display: "flex", justifyContent: message.role === "user" ? "flex-end" : "flex-start" }}>
                    <div style={bubble(message.role)}>{message.content}</div>
                  </div>
                ))}

                {busy && (
                  <div style={{ display: "flex", justifyContent: "flex-start" }}>
                    <div style={bubble("assistant")}>Thinking through a realistic response...</div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>

            {callEnded && feedback && (
              <div style={{ ...card, background: "#f0fdfa", border: `1px solid ${C.primary}33` }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                  <div>
                    <h3 style={{ fontSize: "15px", fontWeight: 800, margin: 0 }}>Call Review</h3>
                    <p style={{ fontSize: "12px", color: C.sub, margin: "6px 0 0", lineHeight: 1.6 }}>
                      Claude reviewed how you handled the conversation and pulled out speaking feedback you can use in the next real coffee chat.
                    </p>
                  </div>
                </div>
                <p style={{ fontSize: "13px", color: C.text, lineHeight: 1.6, margin: "14px 0 0" }}>{feedback.summary}</p>
                <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginTop: "14px" }}>
                  <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: "14px", padding: "14px" }}>
                    <p style={{ fontSize: "12px", fontWeight: 800, color: C.ok, margin: 0 }}>What you did well</p>
                    <ul style={{ margin: "10px 0 0", paddingLeft: "18px", color: C.text, fontSize: "13px", lineHeight: 1.6 }}>
                      {(feedback.strengths || []).map((item, index) => <li key={index}>{item}</li>)}
                    </ul>
                  </div>
                  <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: "14px", padding: "14px" }}>
                    <p style={{ fontSize: "12px", fontWeight: 800, color: C.accent, margin: 0 }}>How to sound stronger next time</p>
                    <ul style={{ margin: "10px 0 0", paddingLeft: "18px", color: C.text, fontSize: "13px", lineHeight: 1.6 }}>
                      {(feedback.improvements || []).map((item, index) => <li key={index}>{item}</li>)}
                    </ul>
                  </div>
                </div>
                {feedback.nextTip && (
                  <div style={{ marginTop: "12px", padding: "12px 14px", borderRadius: "12px", background: "#fff", border: `1px solid ${C.border}`, fontSize: "13px", color: C.text, lineHeight: 1.6 }}>
                    <strong>Next practice tip:</strong> {feedback.nextTip}
                  </div>
                )}
              </div>
            )}

            {showOutcome && (
              <div style={{ ...card, background: "#fffdf7", border: `1px solid ${C.accent}33` }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                  <div>
                    <h3 style={{ fontSize: "15px", fontWeight: 800, margin: 0 }}>How did it go?</h3>
                    <p style={{ fontSize: "12px", color: C.sub, margin: "6px 0 0", lineHeight: 1.6 }}>
                      Add a short summary of how the practice chat ended, then generate three follow-ups you could send after a real conversation.
                    </p>
                  </div>
                  <button style={btn("amber")} onClick={generateFollowUps} disabled={busy || !outcome.trim()}>
                    {busy ? "Generating..." : "Generate Follow-ups"}
                  </button>
                </div>

                <textarea
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  placeholder="Example: We had a warm conversation about the team, and they encouraged me to stay in touch after I apply."
                  style={{ ...input, minHeight: "96px", resize: "vertical", marginTop: "12px" }}
                />

                {followUps && (
                  <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginTop: "14px" }}>
                    {[
                      { key: "thankYou", label: "Send Today", body: followUps.thankYou },
                      { key: "checkIn", label: "Check In 1-2 Weeks", body: followUps.checkIn },
                      { key: "referralAsk", label: "Referral Ask", body: followUps.referralAsk },
                    ].map((item) => (
                      <div key={item.key} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: "14px", padding: "14px" }}>
                        <p style={{ fontSize: "12px", fontWeight: 800, color: C.primaryDark, margin: 0 }}>{item.label}</p>
                        <p style={{ fontSize: "13px", color: C.text, lineHeight: 1.6, margin: "10px 0 0", whiteSpace: "pre-wrap" }}>{item.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {error && (
              <div style={{ padding: "10px 14px", borderRadius: "10px", border: `1px solid ${C.err}33`, background: C.errLight, color: C.err, fontSize: "12px", fontWeight: 600 }}>
                {error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
