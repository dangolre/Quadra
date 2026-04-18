import { useCallback, useEffect, useId, useState, type ChangeEvent, type FormEvent } from "react";
import { Github, Globe, Link as LinkIcon, Linkedin, Loader2 } from "lucide-react";

export interface ProfileData {
  resume: string;
  resumeFile: File | null;
  resumeFileName: string;
  linkedInUrl: string;
  portfolioUrl: string;
  githubUrl: string;
  otherLink: string;
  fullName: string;
  targetJobTitles: string;
  employmentTypes: string[];
  openToRelocation: boolean;
  yearsOfExperience: string;
  targetCompanies: string[];
}

const EXPERIENCE_OPTIONS = [
  "Student / No experience",
  "< 1 year",
  "1–2 years",
  "3–5 years",
  "6–10 years",
  "10+ years",
] as const;

const EMPLOYMENT_TYPE_OPTIONS = ["Internship", "Contract", "Full-time", "Part-time"] as const;

const LEGIT_COMPANIES = [
  "Google",
  "Amazon",
  "Meta",
  "Microsoft",
  "Apple",
  "Netflix",
  "NVIDIA",
  "Tesla",
  "OpenAI",
  "Anthropic",
  "Databricks",
  "Snowflake",
  "Stripe",
  "Airbnb",
  "Uber",
  "Lyft",
  "Salesforce",
  "Oracle",
  "IBM",
  "Intel",
  "AMD",
  "Cisco",
  "Adobe",
  "Atlassian",
  "ServiceNow",
  "Workday",
  "SAP",
  "Palantir",
  "Cloudflare",
  "Twilio",
  "Shopify",
  "Coinbase",
  "Block",
  "PayPal",
  "JPMorgan Chase",
  "Goldman Sachs",
  "Bank of America",
  "Capital One",
  "Walmart",
  "Target",
  "Costco",
  "Procter & Gamble",
  "Johnson & Johnson",
  "Pfizer",
  "Moderna",
  "Merck",
  "UnitedHealth Group",
  "Deloitte",
  "Accenture",
  "PwC",
  "KPMG",
  "EY",
  "Booz Allen Hamilton",
  "Lockheed Martin",
  "Northrop Grumman",
  "Boeing",
  "SpaceX",
  "General Motors",
  "Ford",
  "Toyota",
];

function urlWarning(value: string): boolean {
  const v = value.trim();
  return v.length > 0 && !v.startsWith("https://");
}

type BuildProfileProps = {
  onSubmit: (profile: ProfileData) => void;
  isSubmitting?: boolean;
  initialData?: Partial<ProfileData> | null;
};

const MAX_RESUME_FILE_SIZE = 5 * 1024 * 1024;

const inputIconWrap =
  "flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-offset-0 focus-within:border-emerald-500";
const textInput =
  "min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-0 outline-none";

export default function BuildProfile({ onSubmit, isSubmitting = false, initialData = null }: BuildProfileProps) {
  const uid = useId();
  const [resume, setResume] = useState("");
  const [linkedInUrl, setLinkedInUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [otherLink, setOtherLink] = useState("");
  const [fullName, setFullName] = useState("");
  const [targetJobTitles, setTargetJobTitles] = useState("");
  const [employmentTypes, setEmploymentTypes] = useState<string[]>([]);
  const [openToRelocation, setOpenToRelocation] = useState(false);
  const [yearsOfExperience, setYearsOfExperience] = useState<string>(EXPERIENCE_OPTIONS[0]);
  const [targetCompanies, setTargetCompanies] = useState<string[]>([]);
  const [chipInput, setChipInput] = useState("");
  const [companyInputError, setCompanyInputError] = useState<string | null>(null);
  const [liveMsg, setLiveMsg] = useState("");
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUploadError, setResumeUploadError] = useState<string | null>(null);
  const [resumeUploadInfo, setResumeUploadInfo] = useState<string | null>(null);
  const [resumeFileName, setResumeFileName] = useState<string>("");

  const resumeId = `${uid}-resume`;
  const resumeHelperId = `${uid}-resume-helper`;
  const resumeErrId = `${uid}-resume-err`;
  const resumeUploadInfoId = `${uid}-resume-upload-info`;
  const resumeUploadErrId = `${uid}-resume-upload-err`;
  const nameId = `${uid}-name`;
  const nameErrId = `${uid}-name-err`;
  const linkedInId = `${uid}-linkedin`;
  const portfolioId = `${uid}-portfolio`;
  const githubId = `${uid}-github`;
  const otherId = `${uid}-other`;
  const titlesId = `${uid}-titles`;
  const relocateId = `${uid}-relocate`;
  const expId = `${uid}-exp`;
  const companiesInputId = `${uid}-companies-input`;
  const companiesDescId = `${uid}-companies-desc`;
  const companiesErrId = `${uid}-companies-err`;
  const resumeUploadInputId = `${uid}-resume-upload-input`;

  const toggleEmploymentType = (option: string) => {
    setEmploymentTypes((prev) => (
      prev.includes(option) ? prev.filter((x) => x !== option) : [...prev, option]
    ));
  };

  const announce = useCallback((msg: string) => {
    setLiveMsg(msg);
    window.setTimeout(() => setLiveMsg(""), 3000);
  }, []);

  const addCompany = useCallback(
    (raw: string) => {
      const typed = raw.split(/[,\n]/)[0]?.trim() ?? "";
      const name = LEGIT_COMPANIES.find((company) => company.toLowerCase() === typed.toLowerCase()) ?? "";
      if (!name) return;
      setCompanyInputError(null);
      setTargetCompanies((prev) => {
        if (prev.length >= 10) {
          announce("Maximum of 10 target companies reached.");
          return prev;
        }
        if (prev.some((c) => c.toLowerCase() === name.toLowerCase())) return prev;
        const next = [...prev, name];
        announce(`Added company ${name}.`);
        return next;
      });
    },
    [announce]
  );

  const removeCompany = useCallback(
    (name: string) => {
      setTargetCompanies((prev) => prev.filter((c) => c !== name));
      announce(`Removed company ${name}.`);
    },
    [announce]
  );

  const tryAddLegitCompany = useCallback(
    (raw: string) => {
      const typed = raw.split(/[,\n]/)[0]?.trim() ?? "";
      if (!typed) return false;
      const exact = LEGIT_COMPANIES.find((company) => company.toLowerCase() === typed.toLowerCase());
      if (!exact) {
        setCompanyInputError("Please choose a legitimate company from the suggestions.");
        announce(`Could not add ${typed}. Select a company from the list.`);
        return false;
      }
      addCompany(exact);
      return true;
    },
    [addCompany, announce]
  );

  const handleResumeUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setResumeUploadError(null);
    setResumeUploadInfo(null);
    setResumeFileName(file.name);

    if (file.size > MAX_RESUME_FILE_SIZE) {
      setResumeFile(null);
      setResumeFileName("");
      setResumeUploadError("File is too large. Please upload a file up to 5MB.");
      e.target.value = "";
      return;
    }

    const fileName = file.name.toLowerCase();
    const ext = fileName.includes(".") ? fileName.split(".").pop() : "";
    const allowed = new Set(["pdf", "doc", "docx", "txt"]);
    if (!ext || !allowed.has(ext)) {
      setResumeFile(null);
      setResumeFileName("");
      setResumeUploadError("Unsupported file type. Please upload PDF, DOC, DOCX, or TXT.");
      e.target.value = "";
      return;
    }

    setResumeFile(file);
    setResume("");
    setResumeError(null);
    setResumeUploadInfo(`Stored file ${file.name}. We will keep it for submission.`);
    e.target.value = "";
  };

  const handleRemoveUploadedResume = () => {
    setResumeFile(null);
    setResumeFileName("");
    setResumeUploadInfo(null);
    setResumeUploadError(null);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setResumeError(null);
    setNameError(null);
    let ok = true;
    const hasResumeText = !!resume.trim();
    const hasResumeFile = !!resumeFile;
    if (!hasResumeText && !hasResumeFile) {
      setResumeError("Please paste your resume text or upload your resume file.");
      ok = false;
    } else if (hasResumeText && resume.trim().length < 50) {
      setResumeError("Please enter at least 50 characters.");
      ok = false;
    }
    if (!fullName.trim()) {
      setNameError("Please enter your full name.");
      ok = false;
    }
    if (!ok) return;
    onSubmit({
      resume: resume.trim(),
      resumeFile,
      resumeFileName,
      linkedInUrl: linkedInUrl.trim(),
      portfolioUrl: portfolioUrl.trim(),
      githubUrl: githubUrl.trim(),
      otherLink: otherLink.trim(),
      fullName: fullName.trim(),
      targetJobTitles: targetJobTitles.trim(),
      employmentTypes,
      openToRelocation,
      yearsOfExperience,
      targetCompanies,
    });
  };

  const noResumeProvided = !resume.trim() && !resumeFile;
  const primaryDisabled = noResumeProvided || isSubmitting;
  const showPrimarySpinner = isSubmitting;

  const companySuggestions = LEGIT_COMPANIES.filter((company) => {
    if (!chipInput.trim()) return false;
    if (targetCompanies.includes(company)) return false;
    return company.toLowerCase().includes(chipInput.trim().toLowerCase());
  }).slice(0, 8);

  const sectionTitle = "text-xs font-semibold uppercase tracking-wider text-gray-700";

  useEffect(() => {
    if (!initialData) return;
    setResume(initialData.resume || "");
    setResumeFile(initialData.resumeFile || null);
    setResumeFileName(initialData.resumeFileName || "");
    setLinkedInUrl(initialData.linkedInUrl || "");
    setPortfolioUrl(initialData.portfolioUrl || "");
    setGithubUrl(initialData.githubUrl || "");
    setOtherLink(initialData.otherLink || "");
    setFullName(initialData.fullName || "");
    setTargetJobTitles(initialData.targetJobTitles || "");
    setEmploymentTypes(initialData.employmentTypes || []);
    setOpenToRelocation(!!initialData.openToRelocation);
    setYearsOfExperience(initialData.yearsOfExperience || EXPERIENCE_OPTIONS[0]);
    setTargetCompanies(initialData.targetCompanies || []);
    setChipInput("");
    setCompanyInputError(null);
    setResumeError(null);
    setNameError(null);
    setResumeUploadError(null);
    setResumeUploadInfo(null);
  }, [initialData]);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 font-sans text-gray-900">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Let's build your profile</h1>
          <p className="mt-2 text-sm text-gray-500">A few details help us personalize outreach and suggestions.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white p-8 shadow-md"
          noValidate
        >
          {/* Section 1 */}
          <section aria-labelledby={`${uid}-s1`}>
            <h2 id={`${uid}-s1`} className={sectionTitle}>
              Your Resume or Background
            </h2>
            <div className="mt-4">
              <label htmlFor={resumeId} className="mb-1.5 block text-sm font-medium text-gray-800">
                Resume / Background Summary <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <label
                  htmlFor={resumeUploadInputId}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                >
                  {resumeFile ? "Re-upload Resume" : "Upload Resume"}
                </label>
                <input
                  id={resumeUploadInputId}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleResumeUpload}
                  className="sr-only"
                />
                <span className="text-xs text-gray-500">Supported: PDF, DOC, DOCX, TXT (max 5MB).</span>
                {resumeFileName && <span className="text-xs text-gray-500">Selected: {resumeFileName}</span>}
              </div>
              {!resumeFile && (
                <textarea
                  id={resumeId}
                  name="resume"
                  rows={6}
                  placeholder="Paste your resume text, or describe your skills, experience, and goals..."
                  value={resume}
                  onChange={(e) => setResume(e.target.value)}
                  aria-required="true"
                  aria-invalid={!!resumeError}
                  aria-describedby={`${resumeError ? `${resumeErrId} ` : ""}${resumeUploadError ? `${resumeUploadErrId} ` : ""}${resumeUploadInfo ? `${resumeUploadInfoId} ` : ""}${resumeFile ? "" : resumeHelperId}`.trim()}
                  className="min-h-[7rem] w-full resize-y rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              )}
              {resumeFile && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-3">
                  <p className="text-sm font-medium text-emerald-800">Resume file uploaded</p>
                  <p className="mt-1 text-xs text-emerald-700">{resumeFileName}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRemoveUploadedResume}
                      className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Remove
                    </button>
                    <label
                      htmlFor={resumeUploadInputId}
                      className="inline-flex cursor-pointer items-center rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                    >
                      Re-upload
                    </label>
                  </div>
                </div>
              )}
              {!resumeFile && (
                <p id={resumeHelperId} className="mt-1.5 text-xs text-gray-500">
                  You can paste plain text from your resume or write a short bio.
                </p>
              )}
              {resumeUploadInfo && (
                <p id={resumeUploadInfoId} className="mt-1 text-xs font-medium text-emerald-700">
                  {resumeUploadInfo}
                </p>
              )}
              {resumeUploadError && (
                <p id={resumeUploadErrId} role="alert" className="mt-1 text-xs font-medium text-red-600">
                  {resumeUploadError}
                </p>
              )}
              {resumeError && (
                <p id={resumeErrId} role="alert" className="mt-1 text-xs font-medium text-red-600">
                  {resumeError}
                </p>
              )}
            </div>
          </section>

          <hr className="my-8 border-gray-100" />

          {/* Section 2 */}
          <section aria-labelledby={`${uid}-s2`}>
            <h2 id={`${uid}-s2`} className={sectionTitle}>
              Links
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor={linkedInId} className="mb-1.5 block text-sm font-medium text-gray-800">
                  LinkedIn URL
                </label>
                <div className={inputIconWrap}>
                  <Linkedin className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                  <input
                    id={linkedInId}
                    name="linkedInUrl"
                    type="url"
                    inputMode="url"
                    placeholder="https://linkedin.com/in/yourname"
                    value={linkedInUrl}
                    onChange={(e) => setLinkedInUrl(e.target.value)}
                    className={textInput}
                  />
                </div>
                {urlWarning(linkedInUrl) && (
                  <p className="mt-1 text-xs text-amber-700">Links should start with https://</p>
                )}
              </div>
              <div>
                <label htmlFor={portfolioId} className="mb-1.5 block text-sm font-medium text-gray-800">
                  Portfolio Website
                </label>
                <div className={inputIconWrap}>
                  <Globe className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                  <input
                    id={portfolioId}
                    name="portfolioUrl"
                    type="url"
                    inputMode="url"
                    placeholder="https://yourportfolio.com"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    className={textInput}
                  />
                </div>
                {urlWarning(portfolioUrl) && (
                  <p className="mt-1 text-xs text-amber-700">Links should start with https://</p>
                )}
              </div>
              <div>
                <label htmlFor={githubId} className="mb-1.5 block text-sm font-medium text-gray-800">
                  GitHub URL
                </label>
                <div className={inputIconWrap}>
                  <Github className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                  <input
                    id={githubId}
                    name="githubUrl"
                    type="url"
                    inputMode="url"
                    placeholder="https://github.com/yourusername"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    className={textInput}
                  />
                </div>
                {urlWarning(githubUrl) && (
                  <p className="mt-1 text-xs text-amber-700">Links should start with https://</p>
                )}
              </div>
              <div>
                <label htmlFor={otherId} className="mb-1.5 block text-sm font-medium text-gray-800">
                  Other Link
                </label>
                <div className={inputIconWrap}>
                  <LinkIcon className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                  <input
                    id={otherId}
                    name="otherLink"
                    type="url"
                    inputMode="url"
                    placeholder="Any other relevant link (optional)"
                    value={otherLink}
                    onChange={(e) => setOtherLink(e.target.value)}
                    className={textInput}
                  />
                </div>
                {urlWarning(otherLink) && (
                  <p className="mt-1 text-xs text-amber-700">Links should start with https://</p>
                )}
              </div>
            </div>
          </section>

          <hr className="my-8 border-gray-100" />

          {/* Section 3 */}
          <section aria-labelledby={`${uid}-s3`}>
            <h2 id={`${uid}-s3`} className={sectionTitle}>
              Quick Info
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label htmlFor={nameId} className="mb-1.5 block text-sm font-medium text-gray-800">
                  Full Name <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <input
                  id={nameId}
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  aria-required="true"
                  aria-invalid={!!nameError}
                  aria-describedby={nameError ? nameErrId : undefined}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {nameError && (
                  <p id={nameErrId} role="alert" className="mt-1 text-xs font-medium text-red-600">
                    {nameError}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor={titlesId} className="mb-1.5 block text-sm font-medium text-gray-800">
                  Target Job Title(s)
                </label>
                <input
                  id={titlesId}
                  name="targetJobTitles"
                  type="text"
                  placeholder="e.g. Data Engineer, ML Engineer"
                  value={targetJobTitles}
                  onChange={(e) => setTargetJobTitles(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label htmlFor={expId} className="mb-1.5 block text-sm font-medium text-gray-800">
                  Years of Experience
                </label>
                <select
                  id={expId}
                  name="yearsOfExperience"
                  value={yearsOfExperience}
                  onChange={(e) => setYearsOfExperience(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {EXPERIENCE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <p className="mb-1.5 block text-sm font-medium text-gray-800">Employment Type Preference</p>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
                    <label
                      key={option}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800"
                    >
                      <input
                        type="checkbox"
                        checked={employmentTypes.includes(option)}
                        onChange={() => toggleEmploymentType(option)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-end">
                <div className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-3">
                  <input
                    id={relocateId}
                    name="openToRelocation"
                    type="checkbox"
                    checked={openToRelocation}
                    onChange={(e) => setOpenToRelocation(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor={relocateId} className="text-sm font-medium text-gray-800">
                    Open to Relocation
                  </label>
                </div>
              </div>
            </div>
          </section>

          <hr className="my-8 border-gray-100" />

          {/* Section 4 */}
          <section aria-labelledby={`${uid}-s4`}>
            <h2 id={`${uid}-s4`} className={sectionTitle}>
              Target Companies <span className="font-normal normal-case text-gray-400">(optional)</span>
            </h2>
            <p id={companiesDescId} className="mt-2 text-xs text-gray-500">
              Add up to 10 companies from the vetted list. Use the suggestions and press Enter to add.
            </p>
            <div className="mt-3">
              {targetCompanies.length > 0 && (
                <ul className="mb-3 flex flex-wrap gap-2" aria-label="Target companies">
                  {targetCompanies.map((co) => (
                    <li
                      key={co}
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700"
                    >
                      <span>{co}</span>
                      <button
                        type="button"
                        onClick={() => removeCompany(co)}
                        className="rounded p-0.5 text-gray-400 hover:bg-emerald-100 hover:text-gray-600"
                        aria-label={`Remove ${co}`}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <input
                id={companiesInputId}
                name="targetCompaniesInput"
                type="text"
                placeholder="Search and select a legitimate company..."
                value={chipInput}
                onChange={(e) => {
                  setCompanyInputError(null);
                  const v = e.target.value;
                  if (v.includes(",")) {
                    const parts = v.split(",");
                    parts.slice(0, -1).forEach((p) => tryAddLegitCompany(p));
                    setChipInput(parts[parts.length - 1] ?? "");
                  } else {
                    setChipInput(v);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (tryAddLegitCompany(chipInput)) {
                      setChipInput("");
                    }
                  }
                }}
                aria-describedby={`${companiesDescId}${companyInputError ? ` ${companiesErrId}` : ""}`}
                disabled={targetCompanies.length >= 10}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-100"
              />
              {companySuggestions.length > 0 && targetCompanies.length < 10 && (
                <ul className="mt-2 flex flex-wrap gap-2" aria-label="Suggested companies">
                  {companySuggestions.map((company) => (
                    <li key={company}>
                      <button
                        type="button"
                        onClick={() => {
                          addCompany(company);
                          setChipInput("");
                        }}
                        className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                      >
                        {company}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {companyInputError && (
                <p id={companiesErrId} className="mt-2 text-xs font-medium text-amber-700">
                  {companyInputError}
                </p>
              )}
            </div>
            <div
              className="sr-only"
              aria-live="polite"
              aria-atomic="true"
            >
              {liveMsg}
            </div>
          </section>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={primaryDisabled}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {showPrimarySpinner ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Building...</span>
                </>
              ) : (
                "Build My Profile →"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
