const linkedinInput = document.getElementById("linkedinInput");
const linkedinPdfInput = document.getElementById("linkedinPdfInput");
const pdfStatus = document.getElementById("pdfStatus");

const personName = document.getElementById("personName");
const personRole = document.getElementById("personRole");
const personEmail = document.getElementById("personEmail");
const personLocation = document.getElementById("personLocation");
const githubUrl = document.getElementById("githubUrl");
const portfolioTitle = document.getElementById("portfolioTitle");
const projectsInput = document.getElementById("projectsInput");
const githubStatus = document.getElementById("githubStatus");

const htmlInput = document.getElementById("htmlInput");
const fileNameInput = document.getElementById("fileName");
const previewFrame = document.getElementById("previewFrame");

const generateBtn = document.getElementById("generateBtn");
const loadSampleBtn = document.getElementById("loadSampleBtn");
const clearLinkedinBtn = document.getElementById("clearLinkedinBtn");
const fetchGithubBtn = document.getElementById("fetchGithubBtn");

const runBtn = document.getElementById("runBtn");
const saveBtn = document.getElementById("saveBtn");
const downloadBtn = document.getElementById("downloadBtn");
const shareBtn = document.getElementById("shareBtn");
const exportBtn = document.getElementById("exportBtn");
const clearBtn = document.getElementById("clearBtn");
const recentList = document.getElementById("recentList");

const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".tab-panel");

const STORAGE_KEY = "portfolioAiRecent";
const PARSER_PANEL_ID = "parserPreviewPanel";

let lastParsedData = null;

if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
}

/* ---------------- Tabs ---------------- */
function switchTab(tabName) {
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === tabName));
  panels.forEach((panel) => panel.classList.toggle("active", panel.id === tabName));
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => switchTab(tab.dataset.tab));
});

/* ---------------- Utilities ---------------- */
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function normalizeExtractedText(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .replace(/\u2022/g, "\n• ")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitIntoLinesSmart(text) {
  return normalizeExtractedText(text)
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function cleanLines(text) {
  return splitIntoLinesSmart(text);
}

function normalizeUrl(url) {
  const t = (url || "").trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

function extractGithubUsername(url) {
  const raw = (url || "").trim();
  if (!raw) return "";

  try {
    const normalized = normalizeUrl(raw);
    const parsed = new URL(normalized);

    if (!parsed.hostname.includes("github.com")) return "";

    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts[0] || "";
  } catch {
    return "";
  }
}

function findEmail(text) {
  const match = String(text || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0] : "";
}

function inferLocation(text) {
  if (personLocation.value.trim()) return personLocation.value.trim();

  const lines = splitIntoLinesSmart(text);
  const locationPatterns = [
    /hyderabad/i, /india/i, /bengaluru/i, /bangalore/i, /chennai/i,
    /mumbai/i, /delhi/i, /pune/i, /london/i, /usa/i, /uk/i,
    /singapore/i, /dubai/i, /australia/i, /canada/i, /new york/i,
    /california/i, /telangana/i, /andhra/i
  ];

  for (const line of lines.slice(0, 15)) {
    if (locationPatterns.some((rx) => rx.test(line))) {
      return line;
    }
  }

  return "";
}

function inferNameFromText(text) {
  if (personName.value.trim()) return personName.value.trim();

  const lines = splitIntoLinesSmart(text);
  if (!lines.length) return "Your Name";

  const first = lines[0].replace(/^name[:\s-]*/i, "").trim();
  return first || "Your Name";
}

function inferRoleFromText(text) {
  if (personRole.value.trim()) return personRole.value.trim();

  const lines = splitIntoLinesSmart(text);
  if (lines.length < 2) return "Professional";

  const second = lines[1].replace(/^headline[:\s-]*/i, "").trim();
  return second || "Professional";
}

function autofillProfileFields(text) {
  const normalized = normalizeExtractedText(text);
  const name = inferNameFromText(normalized);
  const role = inferRoleFromText(normalized);
  const email = findEmail(normalized);
  const location = inferLocation(normalized);

  if (!personName.value.trim() && name) personName.value = name;
  if (!personRole.value.trim() && role) personRole.value = role;
  if (!personEmail.value.trim() && email) personEmail.value = email;
  if (!personLocation.value.trim() && location) personLocation.value = location;
}

function headingMatch(line, headings) {
  const normalized = line.toLowerCase().replace(/:$/, "").trim();
  return headings.includes(normalized);
}

function extractSection(text, headings) {
  const lines = cleanLines(text);
  const wanted = headings.map((h) => h.toLowerCase());

  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (headingMatch(lines[i], wanted)) {
      start = i + 1;
      break;
    }
  }

  if (start === -1) return "";

  const stopWords = [
    "about", "experience", "education", "skills", "projects",
    "certifications", "licenses", "licenses & certifications",
    "summary", "honors", "contact", "publications"
  ];

  const out = [];
  for (let i = start; i < lines.length; i++) {
    const current = lines[i].toLowerCase().replace(/:$/, "").trim();
    if (stopWords.includes(current) && !wanted.includes(current)) break;
    out.push(lines[i]);
  }

  return out.join("\n").trim();
}

function inferName(text) {
  return inferNameFromText(text);
}

function inferRole(text) {
  return inferRoleFromText(text);
}

function inferSummary(text) {
  const section = extractSection(text, ["about", "summary"]);
  if (section) return section.replace(/\s{2,}/g, " ").trim();

  const lines = cleanLines(text).slice(2, 8);
  return lines.join(" ").trim() || "Professional summary";
}

function splitBulletish(sectionText) {
  return String(sectionText || "")
    .split(/\n|•|·/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function inferExperience(text) {
  const lines = cleanLines(text);
  const expSection = extractSection(text, ["experience"]);
  const sourceLines = expSection ? cleanLines(expSection) : lines;

  const datePattern = /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}\b/i;
  const blocks = [];
  let current = [];

  for (const line of sourceLines) {
    const isHeadingBreak = /^(education|skills|certifications|licenses|about|projects|summary)$/i.test(line);
    if (isHeadingBreak) break;

    const looksLikeRoleBlock =
      datePattern.test(line) ||
      / at /i.test(line) ||
      /\|/.test(line) ||
      /manager|engineer|lead|director|architect|analyst|consultant|developer|program|project|specialist|head/i.test(line);

    if (looksLikeRoleBlock && current.length >= 2) {
      blocks.push(current.join(" "));
      current = [line];
    } else {
      current.push(line);
    }
  }

  if (current.length) blocks.push(current.join(" "));

  const cleaned = blocks
    .map((b) => b.replace(/\s{2,}/g, " ").trim())
    .filter(Boolean)
    .filter((b) => b.length > 25)
    .slice(0, 12);

  if (cleaned.length) return cleaned;

  return sourceLines
    .filter((line) => line.length > 20)
    .slice(0, 10);
}

function inferSkills(text) {
  const section = extractSection(text, ["skills"]);
  if (!section) return [];

  return section
    .split(/,|\n|•|·/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 14);
}

function inferEducation(text) {
  const section = extractSection(text, ["education"]);
  if (section) {
    return cleanLines(section)
      .filter((line) => line.length > 3)
      .slice(0, 8);
  }

  const lines = cleanLines(text);
  const eduKeywords = [
    /b\.?tech/i, /bachelor/i, /master/i, /m\.?tech/i, /mba/i,
    /university/i, /college/i, /institute/i, /school/i, /degree/i
  ];

  return lines
    .filter((line) => eduKeywords.some((rx) => rx.test(line)))
    .slice(0, 8);
}

function inferCertifications(text) {
  const section = extractSection(text, [
    "certifications",
    "licenses & certifications",
    "licenses",
    "certification"
  ]);

  if (section) {
    return cleanLines(section)
      .filter((line) => line.length > 3)
      .slice(0, 10);
  }

  const lines = cleanLines(text);
  const certKeywords = [
    /certified/i, /certification/i, /aws/i, /azure/i, /gcp/i,
    /pmp/i, /scrum/i, /oracle/i, /microsoft/i, /google/i, /cloud/i
  ];

  return lines
    .filter((line) => certKeywords.some((rx) => rx.test(line)))
    .slice(0, 10);
}

function parseProjects(text) {
  return cleanLines(text)
    .map((line) => {
      const [name = "", description = "", url = ""] = line.split("|").map((s) => s.trim());
      return {
        name,
        description,
        url: normalizeUrl(url)
      };
    })
    .filter((p) => p.name);
}

/* ---------------- Parser View ---------------- */
function ensureParserPanel() {
  let panel = document.getElementById(PARSER_PANEL_ID);
  if (panel) return panel;

  const generatorPanel = document.getElementById("generator");
  if (!generatorPanel) return null;

  panel = document.createElement("div");
  panel.id = PARSER_PANEL_ID;
  panel.style.marginTop = "16px";
  panel.style.padding = "16px";
  panel.style.borderRadius = "20px";
  panel.style.border = "1px solid rgba(255,255,255,0.12)";
  panel.style.background = "rgba(255,255,255,0.05)";
  panel.style.color = "var(--text, #fff)";
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px;">
      <h3 style="margin:0;font-size:1.05rem;">Detected Profile Parser View</h3>
      <button type="button" id="refreshParserBtn" style="border:none;border-radius:12px;padding:10px 14px;cursor:pointer;font-weight:700;background:linear-gradient(135deg,#5b8cff,#8b5cf6);color:#fff;">Refresh Parser</button>
    </div>
    <div id="parserPreviewContent"></div>
  `;

  generatorPanel.appendChild(panel);

  const refreshBtn = document.getElementById("refreshParserBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      const text = linkedinInput.value.trim();
      if (!text) return;
      autofillProfileFields(text);
      renderParserPreview(text);
    });
  }

  return panel;
}

function renderParserPreview(text) {
  const panel = ensureParserPanel();
  if (!panel) return;

  const content = document.getElementById("parserPreviewContent");
  if (!content) return;

  const parsed = {
    name: inferName(text),
    role: inferRole(text),
    summary: inferSummary(text),
    experience: inferExperience(text),
    education: inferEducation(text),
    skills: inferSkills(text),
    certifications: inferCertifications(text)
  };

  lastParsedData = parsed;

  function renderList(items) {
    if (!items || !items.length) return `<p style="margin:0;color:#a9b7d0;">Not detected</p>`;
    return `<ul style="margin:0;padding-left:18px;line-height:1.7;">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
  }

  content.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
      <div style="padding:14px;border-radius:16px;background:rgba(255,255,255,0.04);">
        <h4 style="margin:0 0 8px;">Name</h4>
        <p style="margin:0;color:#dbe7ff;">${escapeHtml(parsed.name || "Not detected")}</p>
      </div>
      <div style="padding:14px;border-radius:16px;background:rgba(255,255,255,0.04);">
        <h4 style="margin:0 0 8px;">Role</h4>
        <p style="margin:0;color:#dbe7ff;">${escapeHtml(parsed.role || "Not detected")}</p>
      </div>
      <div style="padding:14px;border-radius:16px;background:rgba(255,255,255,0.04);grid-column:1 / -1;">
        <h4 style="margin:0 0 8px;">Summary</h4>
        <p style="margin:0;color:#dbe7ff;line-height:1.7;">${escapeHtml(parsed.summary || "Not detected")}</p>
      </div>
      <div style="padding:14px;border-radius:16px;background:rgba(255,255,255,0.04);">
        <h4 style="margin:0 0 8px;">Experience</h4>
        ${renderList(parsed.experience)}
      </div>
      <div style="padding:14px;border-radius:16px;background:rgba(255,255,255,0.04);">
        <h4 style="margin:0 0 8px;">Education</h4>
        ${renderList(parsed.education)}
      </div>
      <div style="padding:14px;border-radius:16px;background:rgba(255,255,255,0.04);">
        <h4 style="margin:0 0 8px;">Skills</h4>
        ${renderList(parsed.skills)}
      </div>
      <div style="padding:14px;border-radius:16px;background:rgba(255,255,255,0.04);">
        <h4 style="margin:0 0 8px;">Certifications</h4>
        ${renderList(parsed.certifications)}
      </div>
    </div>
  `;
}

/* ---------------- Better PDF extraction ---------------- */
async function extractPdfTextPreserveLines(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  const pagesText = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    const rows = [];
    for (const item of content.items) {
      const str = item.str ? String(item.str).trim() : "";
      if (!str) continue;

      const y = Math.round(item.transform[5]);
      const x = Math.round(item.transform[4] || 0);
      rows.push({ y, x, str });
    }

    rows.sort((a, b) => {
      if (Math.abs(b.y - a.y) > 2) return b.y - a.y;
      return a.x - b.x;
    });

    const grouped = [];
    for (const row of rows) {
      const last = grouped[grouped.length - 1];
      if (!last || Math.abs(last.y - row.y) > 3) {
        grouped.push({ y: row.y, parts: [row] });
      } else {
        last.parts.push(row);
      }
    }

    const lines = grouped.map((group) => {
      group.parts.sort((a, b) => a.x - b.x);
      return group.parts.map((p) => p.str).join(" ").replace(/\s{2,}/g, " ").trim();
    });

    pagesText.push(lines.join("\n"));
  }

  let text = pagesText.join("\n\n");

  text = text
    .replace(/\s{2,}/g, " ")
    .replace(/(Experience|Education|Skills|Certifications|Licenses & Certifications|About)\s+/gi, "\n$1\n")
    .replace(/([A-Z][a-z]+ \d{4} ?[–-] ?(?:Present|[A-Z][a-z]+ \d{4}))/g, "\n$1\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}

/* ---------------- PDF Upload ---------------- */
if (linkedinPdfInput) {
  linkedinPdfInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!window.pdfjsLib) {
      pdfStatus.textContent = "PDF library failed to load. Refresh and try again.";
      return;
    }

    try {
      pdfStatus.textContent = "Reading PDF...";
      const normalized = await extractPdfTextPreserveLines(file);
      linkedinInput.value = normalized;
      autofillProfileFields(normalized);
      renderParserPreview(normalized);
      pdfStatus.textContent = "PDF extracted successfully.";
    } catch (err) {
      console.error(err);
      pdfStatus.textContent = "Failed to read PDF.";
    }
  });
}

if (linkedinInput) {
  linkedinInput.addEventListener("blur", () => {
    const text = linkedinInput.value.trim();
    if (!text) return;
    autofillProfileFields(text);
    renderParserPreview(text);
  });
}

/* ---------------- GitHub Fetch ---------------- */
async function fetchGithubReposToProjects() {
  const username = extractGithubUsername(githubUrl.value);

  if (!username) {
    return { ok: false, reason: "no-github" };
  }

  try {
    githubStatus.textContent = "Fetching repos...";

    const response = await fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=100`,
      {
        headers: { "Accept": "application/vnd.github+json" }
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        githubStatus.textContent = "GitHub user not found. Generating without repos.";
        return { ok: false, reason: "not-found" };
      }
      if (response.status === 403) {
        githubStatus.textContent = "GitHub API rate limit hit. Generating without repos.";
        return { ok: false, reason: "rate-limit" };
      }
      githubStatus.textContent = "GitHub fetch failed. Generating without repos.";
      return { ok: false, reason: `http-${response.status}` };
    }

    const repos = await response.json();

    if (!Array.isArray(repos) || repos.length === 0) {
      githubStatus.textContent = "No public repos found. Generating without repos.";
      return { ok: false, reason: "empty" };
    }

    const filteredRepos = repos
      .filter((repo) => !repo.fork)
      .sort((a, b) => {
        const aScore = (a.stargazers_count || 0) + (a.forks_count || 0);
        const bScore = (b.stargazers_count || 0) + (b.forks_count || 0);
        return bScore - aScore;
      });

    if (!filteredRepos.length) {
      githubStatus.textContent = "No suitable repos found. Generating without repos.";
      return { ok: false, reason: "no-suitable" };
    }

    const existing = parseProjects(projectsInput.value);
    const existingNames = new Set(existing.map((p) => p.name.toLowerCase()));

    const repoProjects = filteredRepos
      .filter((repo) => !existingNames.has(String(repo.name || "").toLowerCase()))
      .map((repo) => {
        const description = repo.description || "GitHub project";
        const finalUrl = repo.homepage && repo.homepage.trim()
          ? repo.homepage.trim()
          : repo.html_url;

        return `${repo.name} | ${description} | ${finalUrl}`;
      });

    const mergedLines = [
      ...existing.map((p) => `${p.name} | ${p.description || ""} | ${p.url || ""}`),
      ...repoProjects
    ].filter(Boolean);

    projectsInput.value = mergedLines.join("\n");
    githubStatus.textContent = `Loaded ${filteredRepos.length} GitHub repos.`;
    return { ok: true, count: filteredRepos.length };
  } catch (error) {
    console.error(error);
    githubStatus.textContent = "GitHub fetch failed. Generating without repos.";
    return { ok: false, reason: "network" };
  }
}

if (fetchGithubBtn) {
  fetchGithubBtn.addEventListener("click", async () => {
    await fetchGithubReposToProjects();
  });
}

/* ---------------- Generate HTML ---------------- */
function generateHTML(text) {
  const name = inferName(text);
  const role = inferRole(text);
  const summary = inferSummary(text);
  const experience = inferExperience(text);
  const skills = inferSkills(text);
  const education = inferEducation(text);
  const certifications = inferCertifications(text);
  const projects = parseProjects(projectsInput.value);

  const email = personEmail.value.trim();
  const location = personLocation.value.trim();
  const github = normalizeUrl(githubUrl.value);
  const title = portfolioTitle.value.trim() || `${name} Portfolio`;

  const expHtml = (experience.length ? experience : ["Add your experience here."])
    .map((item) => `<div class="timeline-item"><p>${escapeHtml(item)}</p></div>`)
    .join("");

  const eduHtml = (education.length ? education : ["Add your education here."])
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");

  const certHtml = (certifications.length ? certifications : ["Add certifications here if applicable."])
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");

  const skillsHtml = (skills.length ? skills : ["Leadership", "Strategy", "Technology"])
    .map((item) => `<span class="chip">${escapeHtml(item)}</span>`)
    .join("");

  const projectsHtml = (projects.length ? projects : [{
    name: "Projects",
    description: "No GitHub projects added. You can still use this portfolio without GitHub.",
    url: ""
  }]).map((p) => `
    <div class="project">
      <h3>${escapeHtml(p.name)}</h3>
      <p>${escapeHtml(p.description || "")}</p>
      ${p.url ? `<a href="${escapeHtml(p.url)}" target="_blank" rel="noopener noreferrer">Open Project</a>` : ""}
    </div>
  `).join("");

  const contacts = [
    email ? escapeHtml(email) : "",
    location ? escapeHtml(location) : "",
    github ? `<a href="${escapeHtml(github)}" target="_blank" rel="noopener noreferrer">GitHub</a>` : ""
  ].filter(Boolean).join(" • ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
<style>
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{
  margin:0;
  font-family:Inter,Arial,sans-serif;
  font-size:16px;
  line-height:1.6;
  color:#eef4ff;
  background:
    radial-gradient(circle at top left, rgba(91,140,255,.18), transparent 25%),
    radial-gradient(circle at bottom right, rgba(139,92,246,.16), transparent 25%),
    linear-gradient(135deg,#07101e,#0d1830 58%,#132442);
}
.wrap{max-width:1120px;margin:0 auto;padding:42px 20px}
.hero{
  padding:34px 30px;
  border-radius:30px;
  background:linear-gradient(135deg,rgba(91,140,255,.18),rgba(139,92,246,.14));
  border:1px solid rgba(255,255,255,.12);
  box-shadow:0 24px 70px rgba(0,0,0,.28);
  margin-bottom:20px;
}
.hero h1{
  margin:0;
  font-size:clamp(2.2rem,5vw,3.8rem);
  line-height:1.1;
}
.role{
  margin:10px 0 8px;
  color:#c8d8ff;
  font-size:1.12rem;
  font-weight:600;
}
.contact{
  margin:0 0 16px;
  color:#9fb2d6;
  font-size:.96rem;
}
.summary{
  margin:0;
  color:#e6eeff;
  line-height:1.8;
  max-width:860px;
}
.grid{
  display:grid;
  grid-template-columns:1.05fr .95fr;
  gap:18px;
}
.card{
  background:rgba(255,255,255,.07);
  border:1px solid rgba(255,255,255,.12);
  border-radius:26px;
  padding:24px;
  box-shadow:0 18px 50px rgba(0,0,0,.18);
}
h2{
  margin:0 0 16px;
  font-size:1.15rem;
  color:#ffffff;
}
ul{
  margin:0;
  padding-left:20px;
  color:#dbe7ff;
}
li{margin-bottom:10px}
.chips{
  display:flex;
  flex-wrap:wrap;
  gap:10px;
}
.chip{
  padding:10px 14px;
  border-radius:999px;
  background:linear-gradient(135deg,#5b8cff,#8b5cf6);
  color:white;
  font-size:.92rem;
  font-weight:700;
}
.timeline-item{
  padding:14px 16px;
  border-left:3px solid #7ea4ff;
  background:rgba(255,255,255,.04);
  border-radius:14px;
  margin-bottom:12px;
}
.timeline-item p{
  margin:0;
  color:#e2ebff;
}
.projects{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:16px;
}
.project{
  border:1px solid rgba(255,255,255,.12);
  border-radius:20px;
  padding:18px;
  background:rgba(255,255,255,.05);
}
.project h3{
  margin:0 0 8px;
  color:#fff;
}
.project p{
  margin:0 0 12px;
  color:#d8e5ff;
}
.project a{
  display:inline-block;
  padding:10px 14px;
  border-radius:12px;
  background:linear-gradient(135deg,#5b8cff,#8b5cf6);
  color:#fff;
  text-decoration:none;
  font-weight:700;
}
.section{
  margin-top:18px;
}
.footer{
  text-align:center;
  color:#91a5cc;
  margin-top:22px;
  font-size:.92rem;
}
@media (max-width:820px){
  .grid,.projects{grid-template-columns:1fr}
  .wrap{padding:22px 14px}
  .hero,.card{padding:20px}
  body{font-size:15px}
}
</style>
</head>
<body>
<div class="wrap">
  <section class="hero">
    <h1>${escapeHtml(name)}</h1>
    <p class="role">${escapeHtml(role)}</p>
    ${contacts ? `<p class="contact">${contacts}</p>` : ""}
    <p class="summary">${escapeHtml(summary)}</p>
  </section>

  <section class="grid">
    <div class="card">
      <h2>Professional Experience</h2>
      ${expHtml}
    </div>

    <div class="card">
      <h2>Core Skills</h2>
      <div class="chips">${skillsHtml}</div>
    </div>

    <div class="card">
      <h2>Education</h2>
      <ul>${eduHtml}</ul>
    </div>

    <div class="card">
      <h2>Certifications</h2>
      <ul>${certHtml}</ul>
    </div>
  </section>

  <section class="card section">
    <h2>Projects</h2>
    <div class="projects">${projectsHtml}</div>
  </section>

  <section class="card section">
    <h2>Professional Summary</h2>
    <p class="summary">${escapeHtml(summary)}</p>
  </section>

  <div class="footer">Built with Portfolio AI</div>
</div>
</body>
</html>`;
}

/* ---------------- Preview ---------------- */
function runPreview() {
  previewFrame.srcdoc = htmlInput.value || "";
}

/* ---------------- Drafts ---------------- */
function getRecentFiles() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecentFiles(files) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
}

function renderRecentFiles() {
  if (!recentList) return;

  const files = getRecentFiles();

  if (!files.length) {
    recentList.innerHTML = `<p class="status">No recent drafts yet.</p>`;
    return;
  }

  recentList.innerHTML = files.map((file, i) => `
    <div class="recent-item">
      <h4>${escapeHtml(file.name)}</h4>
      <p>Saved: ${escapeHtml(file.savedAt)}</p>
      <div class="recent-actions">
        <button type="button" onclick="loadRecentFile(${i})">Open</button>
        <button type="button" onclick="downloadRecentFile(${i})">Download</button>
        <button type="button" class="secondary" onclick="deleteRecentFile(${i})">Delete</button>
      </div>
    </div>
  `).join("");
}

function saveDraft() {
  const name = fileNameInput.value.trim() || "portfolio-ai.html";
  const html = htmlInput.value.trim();

  if (!html) {
    alert("Nothing to save.");
    return;
  }

  const files = getRecentFiles();
  const updated = [
    { name, html, savedAt: new Date().toLocaleString() },
    ...files.filter((f) => f.name !== name)
  ].slice(0, 20);

  saveRecentFiles(updated);
  renderRecentFiles();
  alert("Draft saved.");
}

window.loadRecentFile = function(index) {
  const file = getRecentFiles()[index];
  if (!file) return;
  fileNameInput.value = file.name;
  htmlInput.value = file.html;
  runPreview();
  switchTab("editor");
};

window.downloadRecentFile = function(index) {
  const file = getRecentFiles()[index];
  if (!file) return;
  downloadHtml(file.name, file.html);
};

window.deleteRecentFile = function(index) {
  const files = getRecentFiles();
  files.splice(index, 1);
  saveRecentFiles(files);
  renderRecentFiles();
};

/* ---------------- Download ---------------- */
function normalizeFileName(name) {
  const n = (name || "portfolio-ai.html").trim();
  return /\.(html|htm)$/i.test(n) ? n : `${n}.html`;
}

function downloadHtml(name, html) {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = normalizeFileName(name);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ---------------- Shareable Link ---------------- */
function encodeHtmlToHash(html) {
  return btoa(unescape(encodeURIComponent(html)));
}

function decodeHtmlFromHash(hash) {
  try {
    return decodeURIComponent(escape(atob(hash)));
  } catch {
    return "";
  }
}

async function createShareLink() {
  const html = htmlInput.value.trim();

  if (!html) {
    alert("Generate or edit HTML first.");
    return;
  }

  const url = `${location.origin}${location.pathname}#share=${encodeURIComponent(encodeHtmlToHash(html))}`;

  if (navigator.share) {
    try {
      await navigator.share({ title: "Portfolio AI", url });
      return;
    } catch {}
  }

  await navigator.clipboard.writeText(url);
  alert("Shareable link copied.");
}

/* ---------------- Export PNG ---------------- */
function createOffscreenRenderRoot() {
  let root = document.getElementById("pngRenderRoot");
  if (!root) {
    root = document.createElement("div");
    root.id = "pngRenderRoot";
    root.style.position = "fixed";
    root.style.left = "-100000px";
    root.style.top = "0";
    root.style.width = "1200px";
    root.style.background = "#ffffff";
    root.style.zIndex = "-1";
    document.body.appendChild(root);
  }
  return root;
}

async function exportPreviewAsPng() {
  try {
    const html = htmlInput.value.trim();
    if (!html) {
      alert("Generate or edit HTML first.");
      return;
    }

    const root = createOffscreenRenderRoot();
    root.innerHTML = "";

    const iframe = document.createElement("iframe");
    iframe.style.width = "1200px";
    iframe.style.height = "1800px";
    iframe.style.border = "0";
    iframe.setAttribute("sandbox", "allow-same-origin");
    root.appendChild(iframe);

    iframe.srcdoc = html;

    await new Promise((resolve) => {
      iframe.onload = () => setTimeout(resolve, 1200);
    });

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    if (!doc || !doc.body) {
      alert("Failed to prepare preview for PNG export.");
      return;
    }

    const canvas = await html2canvas(doc.body, {
      backgroundColor: "#ffffff",
      useCORS: true,
      scale: 2,
      width: Math.max(doc.body.scrollWidth, 1200),
      height: doc.body.scrollHeight,
      windowWidth: Math.max(doc.body.scrollWidth, 1200),
      windowHeight: doc.body.scrollHeight
    });

    const dataUrl = canvas.toDataURL("image/png");
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    if (isIOS) {
      const win = window.open();
      if (win) {
        win.document.write(`<title>portfolio-preview.png</title><img src="${dataUrl}" style="max-width:100%;height:auto;display:block;margin:0 auto;" />`);
        win.document.close();
      } else {
        alert("Popup blocked. Please allow popups to export PNG on iPhone.");
      }
      return;
    }

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "portfolio-preview.png";
    a.click();
  } catch (err) {
    console.error(err);
    alert("Failed to export PNG.");
  }
}

/* ---------------- Events ---------------- */
if (generateBtn) {
  generateBtn.addEventListener("click", async () => {
    const text = linkedinInput.value.trim();

    if (!text) {
      alert("Paste LinkedIn text or upload a PDF first.");
      return;
    }

    autofillProfileFields(text);
    renderParserPreview(text);

    const hasGithub = !!extractGithubUsername(githubUrl.value);

    generateBtn.disabled = true;
    generateBtn.textContent = "Generating...";

    try {
      if (hasGithub) {
        await fetchGithubReposToProjects();
      } else if (githubStatus) {
        githubStatus.textContent = "GitHub not provided. Generating portfolio without repos.";
      }

      const html = generateHTML(text);
      htmlInput.value = html;

      const safeName = inferName(text).toLowerCase().replace(/\s+/g, "-") || "portfolio-ai";
      fileNameInput.value = `${safeName}.html`;

      runPreview();
      switchTab("editor");
    } catch (error) {
      console.error(error);
      alert("Something went wrong while generating the portfolio.");
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = "Generate Portfolio";
    }
  });
}

if (runBtn) {
  runBtn.addEventListener("click", () => {
    runPreview();
    switchTab("preview");
  });
}

if (saveBtn) saveBtn.addEventListener("click", saveDraft);
if (downloadBtn) downloadBtn.addEventListener("click", () => downloadHtml(fileNameInput.value, htmlInput.value));
if (shareBtn) shareBtn.addEventListener("click", createShareLink);
if (exportBtn) exportBtn.addEventListener("click", exportPreviewAsPng);

if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    htmlInput.value = "";
    runPreview();
  });
}

if (loadSampleBtn) {
  loadSampleBtn.addEventListener("click", () => {
    linkedinInput.value = `Krishnamurthy Kandregula
AI/ML Program Manager | Product Strategy | Mainframes | Digital Transformation

About
Experienced AI/ML and IT program leader with expertise in enterprise modernization, product thinking, digital transformation, and delivery leadership.

Experience
Program Manager - Enterprise Technology
Led cross-functional teams to deliver modernization and AI initiatives.
Senior Delivery Leader - IT Transformation
Managed strategic programs and large-scale execution across enterprise platforms.

Skills
AI/ML, Product Management, Program Management, Mainframes, Cloud, Digital Transformation, Leadership

Education
B.Tech in Computer Science

Certifications
AWS Certified Cloud Practitioner
Scrum Master Certification`;

    personName.value = "Krishnamurthy Kandregula";
    personRole.value = "AI/ML Program Manager";
    personEmail.value = "";
    personLocation.value = "India";
    githubUrl.value = "";
    portfolioTitle.value = "Krishnamurthy Kandregula Portfolio";
    projectsInput.value = "";
    if (githubStatus) githubStatus.textContent = "Sample loaded. GitHub is optional.";
    if (pdfStatus) pdfStatus.textContent = "No PDF uploaded.";

    renderParserPreview(linkedinInput.value);
  });
}

if (clearLinkedinBtn) {
  clearLinkedinBtn.addEventListener("click", () => {
    linkedinInput.value = "";
    personName.value = "";
    personRole.value = "";
    personEmail.value = "";
    personLocation.value = "";
    githubUrl.value = "";
    portfolioTitle.value = "";
    projectsInput.value = "";
    if (githubStatus) githubStatus.textContent = "No GitHub repos fetched.";
    if (pdfStatus) pdfStatus.textContent = "No PDF uploaded.";

    const panel = document.getElementById(PARSER_PANEL_ID);
    if (panel) {
      const content = document.getElementById("parserPreviewContent");
      if (content) content.innerHTML = `<p style="margin:0;color:#a9b7d0;">Paste LinkedIn text or upload PDF to detect sections.</p>`;
    }
  });
}

/* ---------------- Init from shared link ---------------- */
(function init() {
  ensureParserPanel();

  const content = document.getElementById("parserPreviewContent");
  if (content) {
    content.innerHTML = `<p style="margin:0;color:#a9b7d0;">Paste LinkedIn text or upload PDF to detect sections.</p>`;
  }

  const match = location.hash.match(/^#share=(.+)$/);
  if (match) {
    const decoded = decodeHtmlFromHash(decodeURIComponent(match[1]));
    if (decoded) {
      htmlInput.value = decoded;
      runPreview();
      switchTab("preview");
    }
  }

  renderRecentFiles();
})();