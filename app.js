const htmlInput = document.getElementById("htmlInput");
const fileNameInput = document.getElementById("fileName");
const previewFrame = document.getElementById("previewFrame");
const fullPreviewFrame = document.getElementById("fullPreviewFrame");
const fileInput = document.getElementById("fileInput");

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

const generateBtn = document.getElementById("generateBtn");
const loadSampleBtn = document.getElementById("loadSampleBtn");
const clearLinkedinBtn = document.getElementById("clearLinkedinBtn");

const runBtn = document.getElementById("runBtn");
const saveBtn = document.getElementById("saveBtn");
const downloadBtn = document.getElementById("downloadBtn");
const clearBtn = document.getElementById("clearBtn");
const installBtn = document.getElementById("installBtn");
const themeToggle = document.getElementById("themeToggle");
const recentList = document.getElementById("recentList");

const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".tab-panel");
const templateButtons = document.querySelectorAll(".template-btn");

const STORAGE_KEY = "portfolioAiRecent";
const THEME_KEY = "portfolioAiTheme";

let deferredPrompt = null;

/* Tabs */
function switchTab(tabName) {
  tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  });

  panels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === tabName);
  });
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => switchTab(tab.dataset.tab));
});

/* Preview */
function runPreview() {
  const html = htmlInput.value || "";
  previewFrame.srcdoc = html;
  fullPreviewFrame.srcdoc = html;
}

htmlInput.addEventListener("input", runPreview);

/* Theme */
function applyTheme(theme) {
  const isLight = theme === "light";
  document.body.classList.toggle("light", isLight);
  themeToggle.textContent = isLight ? "🌞" : "🌙";
  localStorage.setItem(THEME_KEY, theme);
}

themeToggle.addEventListener("click", () => {
  const isLight = document.body.classList.contains("light");
  applyTheme(isLight ? "dark" : "light");
});

/* Storage */
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

function saveDraft() {
  const name = (fileNameInput.value.trim() || "portfolio-ai.html").trim();
  const html = htmlInput.value;

  if (!html.trim()) {
    alert("Please enter some HTML before saving.");
    return;
  }

  const files = getRecentFiles();
  const updatedFiles = [
    {
      name,
      html,
      savedAt: new Date().toLocaleString()
    },
    ...files.filter((file) => file.name !== name)
  ].slice(0, 20);

  saveRecentFiles(updatedFiles);
  renderRecentFiles();
  alert("Draft saved.");
}

function loadRecentFile(index) {
  const files = getRecentFiles();
  const file = files[index];
  if (!file) return;

  fileNameInput.value = file.name;
  htmlInput.value = file.html;
  runPreview();
  switchTab("editor");
}

function deleteRecentFile(index) {
  const files = getRecentFiles();
  files.splice(index, 1);
  saveRecentFiles(files);
  renderRecentFiles();
}

function downloadRecentFile(index) {
  const files = getRecentFiles();
  const file = files[index];
  if (!file) return;
  downloadHtml(file.name, file.html);
}

function renderRecentFiles() {
  const files = getRecentFiles();

  if (!files.length) {
    recentList.innerHTML = `<p class="recent-empty">No recent drafts yet.</p>`;
    return;
  }

  recentList.innerHTML = files.map((file, index) => `
    <div class="recent-item">
      <h3>${escapeHtml(file.name)}</h3>
      <p>Saved: ${escapeHtml(file.savedAt)}</p>
      <div class="recent-actions">
        <button onclick="loadRecentFile(${index})" type="button">Open</button>
        <button onclick="downloadRecentFile(${index})" type="button">Download</button>
        <button class="secondary" onclick="deleteRecentFile(${index})" type="button">Delete</button>
      </div>
    </div>
  `).join("");
}

/* Download */
function normalizeFileName(name) {
  const trimmed = (name || "portfolio-ai.html").trim();
  if (trimmed.endsWith(".html") || trimmed.endsWith(".htm")) return trimmed;
  return `${trimmed}.html`;
}

function downloadHtml(name, html) {
  if (!html.trim()) {
    alert("Nothing to download.");
    return;
  }

  const finalName = normalizeFileName(name);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = finalName;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

function downloadCurrentFile() {
  downloadHtml(fileNameInput.value.trim() || "portfolio-ai.html", htmlInput.value);
}

/* Import / Clear */
function clearEditor() {
  htmlInput.value = "";
  fileNameInput.value = "portfolio-ai.html";
  runPreview();
}

function importFile(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    htmlInput.value = reader.result || "";
    if (file.name) fileNameInput.value = file.name;
    runPreview();
    switchTab("editor");
  };
  reader.readAsText(file);
}

/* Utilities */
function cleanLines(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (tag) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return map[tag];
  });
}

function normalizeUrl(url) {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function extractSection(text, headings) {
  const lines = cleanLines(text);
  const lowerHeadings = headings.map((h) => h.toLowerCase());

  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lowerHeadings.includes(lines[i].toLowerCase())) {
      start = i + 1;
      break;
    }
  }

  if (start === -1) return "";

  const stopWords = [
    "about", "experience", "education", "skills", "certifications",
    "projects", "licenses", "honors", "summary"
  ];

  const collected = [];
  for (let i = start; i < lines.length; i++) {
    const current = lines[i].toLowerCase();
    if (stopWords.includes(current) && !lowerHeadings.includes(current)) break;
    collected.push(lines[i]);
  }

  return collected.join("\n");
}

function inferName(text) {
  const lines = cleanLines(text);
  if (personName.value.trim()) return personName.value.trim();
  return lines[0] || "Your Name";
}

function inferRole(text) {
  if (personRole.value.trim()) return personRole.value.trim();
  const lines = cleanLines(text);
  return lines[1] || "Professional Portfolio";
}

function inferSummary(text) {
  const section = extractSection(text, ["about", "summary"]);
  if (section) return section;
  const lines = cleanLines(text);
  return lines.slice(2, 6).join(" ") || "Experienced professional building high-impact work across technology, leadership, and innovation.";
}

function inferExperience(text) {
  const section = extractSection(text, ["experience"]);
  if (!section) return [];
  return cleanLines(section).slice(0, 8);
}

function inferSkills(text) {
  const section = extractSection(text, ["skills"]);
  if (section) {
    return section
      .split(/,|\n|•|·/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10);
  }
  return ["Leadership", "Strategy", "Execution", "Technology"];
}

function inferEducation(text) {
  const section = extractSection(text, ["education"]);
  if (!section) return [];
  return cleanLines(section).slice(0, 4);
}

function parseProjects(text) {
  const lines = cleanLines(text);
  return lines.map((line) => {
    const parts = line.split("|").map((item) => item.trim());
    return {
      name: parts[0] || "Project",
      description: parts[1] || "",
      url: normalizeUrl(parts[2] || "")
    };
  }).filter((project) => project.name);
}

/* PDF extraction */
async function extractTextFromPdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    fullText += `${pageText}\n\n`;
  }

  return fullText.trim();
}

/* Portfolio generation */
function generatePortfolioHtml(profileText) {
  const name = inferName(profileText);
  const role = inferRole(profileText);
  const summary = inferSummary(profileText);
  const experience = inferExperience(profileText);
  const skills = inferSkills(profileText);
  const education = inferEducation(profileText);

  const email = personEmail.value.trim();
  const location = personLocation.value.trim();
  const github = normalizeUrl(githubUrl.value);
  const title = portfolioTitle.value.trim() || `${name} Portfolio`;
  const projects = parseProjects(projectsInput.value);

  const expHtml = experience.length
    ? experience.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
    : `<li>Delivered impactful work across leadership, technology, and growth initiatives.</li>`;

  const skillsHtml = skills.length
    ? skills.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join("")
    : `<span class="chip">Professional</span>`;

  const eduHtml = education.length
    ? education.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
    : `<li>Education details can be added here.</li>`;

  const projectHtml = projects.length
    ? projects.map((project) => `
      <div class="project-card">
        <h3>${escapeHtml(project.name)}</h3>
        ${project.description ? `<p>${escapeHtml(project.description)}</p>` : ""}
        ${project.url ? `<a href="${escapeHtml(project.url)}" target="_blank" rel="noopener noreferrer">View Project</a>` : ""}
      </div>
    `).join("")
    : `<div class="project-card">
        <h3>Projects can be added here</h3>
        <p>Add deployed app links or GitHub project URLs in Portfolio AI.</p>
      </div>`;

  const contactBits = [
    email ? `<span>${escapeHtml(email)}</span>` : "",
    location ? `<span>${escapeHtml(location)}</span>` : "",
    github ? `<a class="inline-link" href="${escapeHtml(github)}" target="_blank" rel="noopener noreferrer">GitHub Profile</a>` : ""
  ].filter(Boolean).join(" • ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, Arial, sans-serif;
      color: #f8fbff;
      background:
        radial-gradient(circle at top left, rgba(91,140,255,0.25), transparent 25%),
        radial-gradient(circle at bottom right, rgba(139,92,246,0.2), transparent 25%),
        linear-gradient(135deg, #081120, #0f1b33 60%, #13203a);
      min-height: 100vh;
    }
    .wrap {
      max-width: 1100px;
      margin: 0 auto;
      padding: 48px 20px;
    }
    .hero {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 28px;
      padding: 32px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.35);
      backdrop-filter: blur(18px);
    }
    .eyebrow {
      display: inline-block;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(91,140,255,0.16);
      color: #d9e6ff;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.4px;
      margin-bottom: 14px;
    }
    h1 {
      margin: 0;
      font-size: clamp(2rem, 4vw, 4rem);
      line-height: 1.05;
    }
    .role {
      margin: 12px 0 8px;
      color: #c4d5ff;
      font-size: 1.2rem;
      font-weight: 600;
    }
    .contact {
      color: #9fb2d6;
      margin: 0 0 18px;
      font-size: 0.95rem;
    }
    .summary {
      margin: 0;
      color: #e4edff;
      line-height: 1.75;
      max-width: 780px;
      font-size: 1rem;
    }
    .inline-link {
      color: #cfe0ff;
      text-decoration: none;
    }
    .grid {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 18px;
      margin-top: 20px;
    }
    .card {
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 24px;
      padding: 24px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.25);
      backdrop-filter: blur(14px);
    }
    h2 {
      margin: 0 0 14px;
      font-size: 1.1rem;
    }
    h3 {
      margin: 0 0 8px;
      font-size: 1rem;
    }
    ul {
      margin: 0;
      padding-left: 18px;
      color: #dbe7ff;
      line-height: 1.8;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .chip {
      padding: 10px 14px;
      border-radius: 999px;
      background: linear-gradient(135deg, #5b8cff, #8b5cf6);
      font-size: 0.92rem;
      font-weight: 700;
      color: white;
    }
    .projects-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .project-card {
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 20px;
      padding: 18px;
      background: rgba(255,255,255,0.05);
    }
    .project-card p {
      margin: 0 0 12px;
      color: #dbe7ff;
      line-height: 1.6;
    }
    .project-card a {
      display: inline-block;
      color: white;
      text-decoration: none;
      font-weight: 700;
      padding: 10px 14px;
      border-radius: 12px;
      background: linear-gradient(135deg, #5b8cff, #8b5cf6);
    }
    .footer {
      text-align: center;
      color: #93a7ce;
      margin-top: 22px;
      font-size: 0.9rem;
    }
    @media (max-width: 800px) {
      .grid, .projects-grid { grid-template-columns: 1fr; }
      .hero, .card { padding: 22px; }
      .wrap { padding: 24px 14px; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <span class="eyebrow">Portfolio AI Generated</span>
      <h1>${escapeHtml(name)}</h1>
      <p class="role">${escapeHtml(role)}</p>
      ${contactBits ? `<p class="contact">${contactBits}</p>` : ""}
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
        <ul>
          <li>Strong professional profile generated from pasted LinkedIn or uploaded PDF content.</li>
          <li>Customize this section further in Portfolio AI editor.</li>
          <li>Add projects, links, and certifications as needed.</li>
        </ul>
      </div>
    </section>

    <section class="card" style="margin-top: 18px;">
      <h2>Projects</h2>
      <div class="projects-grid">
        ${projectHtml}
      </div>
    </section>

    <div class="footer">Built with Portfolio AI</div>
  </div>
</body>
</html>`;
}

/* Templates */
function loadTemplate(type) {
  let template = "";

  if (type === "modern") {
    template = `<!DOCTYPE html>
<html>
<head>
  <title>Modern Portfolio</title>
  <style>
    body{font-family:Arial,sans-serif;margin:0;padding:40px;background:#0f172a;color:#fff}
    .card{max-width:720px;margin:auto;padding:32px;border-radius:24px;background:#1e293b}
    h1{margin-top:0}
  </style>
</head>
<body>
  <div class="card">
    <h1>Your Name</h1>
    <p>AI/ML • Product • Program Leadership</p>
    <p>Replace this with your portfolio summary.</p>
  </div>
</body>
</html>`;
  }

  if (type === "minimal") {
    template = `<!DOCTYPE html>
<html>
<head><title>Minimal Portfolio</title></head>
<body style="font-family:Arial;padding:40px;max-width:900px;margin:auto;">
  <h1>Your Name</h1>
  <p>Role / Headline</p>
  <hr />
  <h2>About</h2>
  <p>Short portfolio summary.</p>
</body>
</html>`;
  }

  if (type === "executive") {
    template = `<!DOCTYPE html>
<html>
<head>
  <title>Executive Portfolio</title>
  <style>
    body{margin:0;font-family:Georgia,serif;background:#f8fafc;color:#0f172a}
    .wrap{max-width:960px;margin:auto;padding:48px 24px}
    .hero{padding:32px;background:#fff;border-radius:24px;box-shadow:0 10px 30px rgba(0,0,0,.08)}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hero">
      <h1>Your Name</h1>
      <p>Executive | Strategy | Transformation</p>
      <p>Introduce your leadership profile here.</p>
    </div>
  </div>
</body>
</html>`;
  }

  if (type === "gradient") {
    template = `<!DOCTYPE html>
<html>
<head>
  <title>Gradient Hero</title>
  <style>
    body{margin:0;font-family:Inter,Arial,sans-serif;background:linear-gradient(135deg,#5b8cff,#8b5cf6);color:#fff;padding:56px 24px}
    .box{max-width:860px;margin:auto}
    h1{font-size:56px;margin:0 0 12px}
  </style>
</head>
<body>
  <div class="box">
    <h1>Your Portfolio</h1>
    <p>Beautifully simple one-page portfolio template.</p>
  </div>
</body>
</html>`;
  }

  htmlInput.value = template;
  fileNameInput.value = `${type}-portfolio.html`;
  runPreview();
  switchTab("editor");
}

templateButtons.forEach((btn) => {
  btn.addEventListener("click", () => loadTemplate(btn.dataset.template));
});

/* Sample data */
function loadSampleProfile() {
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
  personEmail.value = "";
  personLocation.value = "India";
  githubUrl.value = "https://github.com/kkandregula-ai";
  portfolioTitle.value = "Krishnamurthy Kandregula Portfolio";
  projectsInput.value = `Portfolio AI | AI-powered portfolio generator | https://kkandregula-ai.github.io/portfolio-ai/
Expo Feedback App | Judge scoring and event feedback app | https://example.com/expo-feedback
ReelRocket | AI reels app for small businesses | https://github.com/kkandregula-ai/reelrocket`;
  pdfStatus.textContent = "No PDF uploaded yet.";
}

function clearGenerator() {
  linkedinInput.value = "";
  personName.value = "";
  personRole.value = "";
  personEmail.value = "";
  personLocation.value = "";
  githubUrl.value = "";
  portfolioTitle.value = "";
  projectsInput.value = "";
  if (linkedinPdfInput) linkedinPdfInput.value = "";
  pdfStatus.textContent = "No PDF uploaded yet.";
}

/* PDF upload */
if (linkedinPdfInput) {
  linkedinPdfInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!window.pdfjsLib) {
      pdfStatus.textContent = "PDF library failed to load.";
      return;
    }

    try {
      pdfStatus.textContent = "Extracting text from PDF...";
      const extractedText = await extractTextFromPdf(file);
      linkedinInput.value = extractedText;
      pdfStatus.textContent = "LinkedIn PDF text extracted successfully.";
      switchTab("generator");
    } catch (error) {
      console.error(error);
      pdfStatus.textContent = "Failed to read PDF. Please try another file.";
    }
  });
}

/* Events */
generateBtn.addEventListener("click", () => {
  const text = linkedinInput.value.trim();

  if (!text) {
    alert("Please paste LinkedIn text or upload a LinkedIn PDF first.");
    return;
  }

  const generatedHtml = generatePortfolioHtml(text);
  htmlInput.value = generatedHtml;

  const inferredName = inferName(text).toLowerCase().replace(/\s+/g, "-");
  fileNameInput.value = `${inferredName || "portfolio-ai"}.html`;

  runPreview();
  switchTab("editor");
});

loadSampleBtn.addEventListener("click", loadSampleProfile);
clearLinkedinBtn.addEventListener("click", clearGenerator);

runBtn.addEventListener("click", () => {
  runPreview();
  switchTab("preview");
});

saveBtn.addEventListener("click", saveDraft);
downloadBtn.addEventListener("click", downloadCurrentFile);
clearBtn.addEventListener("click", clearEditor);

fileInput.addEventListener("change", (event) => {
  importFile(event.target.files[0]);
  event.target.value = "";
});

/* PWA install */
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  installBtn.style.display = "inline-flex";
});

installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) {
    alert("Install option is not available right now.");
    return;
  }

  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.style.display = "none";
});

/* Globals for recent buttons */
window.loadRecentFile = loadRecentFile;
window.deleteRecentFile = deleteRecentFile;
window.downloadRecentFile = downloadRecentFile;

/* Service worker */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  });
}

/* Init */
(function init() {
  const savedTheme = localStorage.getItem(THEME_KEY) || "dark";
  applyTheme(savedTheme);
  loadSampleProfile();
  runPreview();
  renderRecentFiles();
})();