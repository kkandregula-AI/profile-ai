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

function cleanLines(text) {
  return text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
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

    if (!parsed.hostname.includes("github.com")) {
      return "";
    }

    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts[0] || "";
  } catch {
    return "";
  }
}

function extractSection(text, headings) {
  const lines = cleanLines(text);
  const wanted = headings.map((h) => h.toLowerCase());

  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (wanted.includes(lines[i].toLowerCase())) {
      start = i + 1;
      break;
    }
  }

  if (start === -1) return "";

  const stopWords = ["about", "experience", "education", "skills", "projects", "certifications", "summary"];
  const out = [];

  for (let i = start; i < lines.length; i++) {
    const cur = lines[i].toLowerCase();
    if (stopWords.includes(cur) && !wanted.includes(cur)) break;
    out.push(lines[i]);
  }

  return out.join("\n");
}

function inferName(text) {
  return personName.value.trim() || cleanLines(text)[0] || "Your Name";
}

function inferRole(text) {
  return personRole.value.trim() || cleanLines(text)[1] || "Professional";
}

function inferSummary(text) {
  return extractSection(text, ["about", "summary"]) || cleanLines(text).slice(2, 6).join(" ") || "Professional summary";
}

function inferExperience(text) {
  const section = extractSection(text, ["experience"]);
  return section ? cleanLines(section).slice(0, 8) : [];
}

function inferSkills(text) {
  const section = extractSection(text, ["skills"]);
  if (!section) return [];
  return section.split(/,|\n|•|·/).map((s) => s.trim()).filter(Boolean).slice(0, 10);
}

function inferEducation(text) {
  const section = extractSection(text, ["education"]);
  return section ? cleanLines(section).slice(0, 4) : [];
}

function parseProjects(text) {
  return cleanLines(text).map((line) => {
    const [name = "", description = "", url = ""] = line.split("|").map((s) => s.trim());
    return {
      name,
      description,
      url: normalizeUrl(url)
    };
  }).filter((p) => p.name);
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
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item) => item.str).join(" ") + "\n\n";
      }

      linkedinInput.value = text.trim();
      pdfStatus.textContent = "PDF extracted successfully.";
    } catch (err) {
      console.error(err);
      pdfStatus.textContent = "Failed to read PDF.";
    }
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
        headers: {
          "Accept": "application/vnd.github+json"
        }
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
      })
      .slice(0, 6);

    if (!filteredRepos.length) {
      githubStatus.textContent = "No suitable repos found. Generating without repos.";
      return { ok: false, reason: "no-suitable" };
    }

    const lines = filteredRepos.map((repo) => {
      const description = repo.description || "GitHub project";
      const finalUrl = repo.homepage && repo.homepage.trim()
        ? repo.homepage.trim()
        : repo.html_url;

      return `${repo.name} | ${description} | ${finalUrl}`;
    });

    projectsInput.value = lines.join("\n");
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
  const projects = parseProjects(projectsInput.value);

  const email = personEmail.value.trim();
  const location = personLocation.value.trim();
  const github = normalizeUrl(githubUrl.value);
  const title = portfolioTitle.value.trim() || `${name} Portfolio`;

  const expHtml = (experience.length ? experience : ["Add your experience here."])
    .map((item) => `<li>${escapeHtml(item)}</li>`).join("");

  const eduHtml = (education.length ? education : ["Add your education here."])
    .map((item) => `<li>${escapeHtml(item)}</li>`).join("");

  const skillsHtml = (skills.length ? skills : ["Leadership", "Strategy", "Technology"])
    .map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join("");

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
body{
  margin:0;
  font-family:Inter,Arial,sans-serif;
  color:#f8fbff;
  background:
    radial-gradient(circle at top left, rgba(91,140,255,.25), transparent 25%),
    radial-gradient(circle at bottom right, rgba(139,92,246,.2), transparent 25%),
    linear-gradient(135deg,#081120,#0f1b33 60%,#13203a);
}
.wrap{max-width:1100px;margin:0 auto;padding:42px 20px}
.hero,.card{
  background:rgba(255,255,255,.08);
  border:1px solid rgba(255,255,255,.12);
  border-radius:28px;
  padding:28px;
  box-shadow:0 24px 60px rgba(0,0,0,.25);
  backdrop-filter:blur(16px)
}
.hero{margin-bottom:18px}
h1{margin:0;font-size:clamp(2rem,4vw,4rem)}
.role{margin:10px 0;color:#c4d5ff;font-size:1.2rem;font-weight:600}
.contact{margin:0 0 14px;color:#9fb2d6}
.summary{margin:0;color:#e4edff;line-height:1.75}
.grid{display:grid;grid-template-columns:1.1fr .9fr;gap:18px;margin-top:18px}
h2{margin:0 0 14px}
ul{margin:0;padding-left:18px;line-height:1.8;color:#dbe7ff}
.chips{display:flex;flex-wrap:wrap;gap:10px}
.chip{
  padding:10px 14px;
  border-radius:999px;
  background:linear-gradient(135deg,#5b8cff,#8b5cf6);
  font-size:.92rem;
  font-weight:700
}
.projects{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.project{
  border:1px solid rgba(255,255,255,.12);
  border-radius:18px;
  padding:18px;
  background:rgba(255,255,255,.05)
}
.project h3{margin:0 0 8px}
.project p{margin:0 0 12px;line-height:1.6;color:#dbe7ff}
.project a{
  display:inline-block;
  padding:10px 14px;
  border-radius:12px;
  background:linear-gradient(135deg,#5b8cff,#8b5cf6);
  color:white;
  text-decoration:none;
  font-weight:700
}
.footer{text-align:center;color:#93a7ce;margin-top:20px}
@media (max-width:800px){
  .grid,.projects{grid-template-columns:1fr}
  .wrap{padding:22px 14px}
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
      <h2>Experience</h2>
      <ul>${expHtml}</ul>
    </div>
    <div class="card">
      <h2>Skills</h2>
      <div class="chips">${skillsHtml}</div>
    </div>
    <div class="card">
      <h2>Education</h2>
      <ul>${eduHtml}</ul>
    </div>
    <div class="card">
      <h2>About</h2>
      <p class="summary">${escapeHtml(summary)}</p>
    </div>
  </section>

  <section class="card" style="margin-top:18px">
    <h2>Projects</h2>
    <div class="projects">${projectsHtml}</div>
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
async function exportPreviewAsPng() {
  try {
    const doc = previewFrame.contentDocument || previewFrame.contentWindow.document;

    if (!doc || !doc.body) {
      alert("Run Preview first.");
      return;
    }

    const canvas = await html2canvas(doc.body, {
      backgroundColor: "#ffffff",
      useCORS: true,
      scale: 2
    });

    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "portfolio-preview.png";
    a.click();
  } catch (err) {
    console.error(err);
    alert("Failed to export PNG.");
  }
}

/* ---------------- Events ---------------- */
generateBtn.addEventListener("click", async () => {
  const text = linkedinInput.value.trim();

  if (!text) {
    alert("Paste LinkedIn text or upload a PDF first.");
    return;
  }

  const hasGithub = !!extractGithubUsername(githubUrl.value);

  generateBtn.disabled = true;
  generateBtn.textContent = "Generating...";

  try {
    if (hasGithub) {
      await fetchGithubReposToProjects();
    } else {
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

runBtn.addEventListener("click", () => {
  runPreview();
  switchTab("preview");
});

saveBtn.addEventListener("click", saveDraft);
downloadBtn.addEventListener("click", () => downloadHtml(fileNameInput.value, htmlInput.value));
shareBtn.addEventListener("click", createShareLink);
exportBtn.addEventListener("click", exportPreviewAsPng);

clearBtn.addEventListener("click", () => {
  htmlInput.value = "";
  runPreview();
});

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
B.Tech in Computer Science`;

  personName.value = "Krishnamurthy Kandregula";
  personRole.value = "AI/ML Program Manager";
  personLocation.value = "India";
  githubUrl.value = "";
  portfolioTitle.value = "Krishnamurthy Kandregula Portfolio";
  projectsInput.value = "";
  githubStatus.textContent = "Sample loaded. GitHub is optional.";
});

/* ---------------- Init from shared link ---------------- */
(function init() {
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