const linkedinInput = document.getElementById("linkedinInput");
const linkedinPdfInput = document.getElementById("linkedinPdfInput");
const pdfStatus = document.getElementById("pdfStatus");

const htmlInput = document.getElementById("htmlInput");
const previewFrame = document.getElementById("previewFrame");

const generateBtn = document.getElementById("generateBtn");
const runBtn = document.getElementById("runBtn");

const personName = document.getElementById("personName");
const personRole = document.getElementById("personRole");
const githubUrl = document.getElementById("githubUrl");
const projectsInput = document.getElementById("projectsInput");

/* ------------------ FIX PDF WORKER ------------------ */
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
}

/* ------------------ TABS ------------------ */
const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".tab-panel");

tabs.forEach(tab => {
  tab.onclick = () => {
    tabs.forEach(t => t.classList.remove("active"));
    panels.forEach(p => p.classList.remove("active"));

    tab.classList.add("active");
    document.getElementById(tab.dataset.tab).classList.add("active");
  };
});

/* ------------------ PDF UPLOAD ------------------ */
linkedinPdfInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    pdfStatus.textContent = "Reading PDF...";

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

    let text = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      text += content.items.map(item => item.str).join(" ") + "\n\n";
    }

    linkedinInput.value = text;
    pdfStatus.textContent = "PDF extracted successfully ✅";

  } catch (err) {
    console.error(err);
    pdfStatus.textContent = "PDF failed ❌";
  }
});

/* ------------------ PROJECT PARSER ------------------ */
function parseProjects(text) {
  return text.split("\n").map(line => {
    const parts = line.split("|").map(p => p.trim());
    return {
      name: parts[0] || "",
      desc: parts[1] || "",
      url: parts[2] || ""
    };
  });
}

/* ------------------ GENERATE HTML ------------------ */
function generateHTML(text) {
  const name = personName.value || "Your Name";
  const role = personRole.value || "Professional";
  const github = githubUrl.value;

  const projects = parseProjects(projectsInput.value);

  const projectHTML = projects.map(p => `
    <div>
      <h3>${p.name}</h3>
      <p>${p.desc}</p>
      ${p.url ? `<a href="${p.url}" target="_blank">View</a>` : ""}
    </div>
  `).join("");

  return `
<!DOCTYPE html>
<html>
<head>
<title>${name}</title>
</head>

<body style="font-family:sans-serif;padding:40px">

<h1>${name}</h1>
<p>${role}</p>

${github ? `<p><a href="${github}">GitHub</a></p>` : ""}

<h2>About</h2>
<p>${text.substring(0,300)}</p>

<h2>Projects</h2>
${projectHTML}

</body>
</html>
`;
}

/* ------------------ GENERATE ------------------ */
generateBtn.onclick = () => {
  const text = linkedinInput.value;

  if (!text) {
    alert("Paste or upload LinkedIn data first");
    return;
  }

  htmlInput.value = generateHTML(text);
};

/* ------------------ PREVIEW ------------------ */
runBtn.onclick = () => {
  previewFrame.srcdoc = htmlInput.value;
};