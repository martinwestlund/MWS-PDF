import { parseCortexXml } from "./xmlParser.js";
import { indexPdfFiles, matchExpectedPages } from "./fileMatcher.js";
import { analyzePdfFile, renderPdfPreview } from "./pdfAnalyzer.js";
import { renderResults, renderDetail } from "./uiRenderer.js";

const state = {
  xmlFile: null,
  pdfFiles: [],
  results: [],
};

const xmlInput = document.getElementById("xmlInput");
const pdfInput = document.getElementById("pdfInput");
const runBtn = document.getElementById("runBtn");
const statusMessage = document.getElementById("statusMessage");
const resultsContainer = document.getElementById("resultsContainer");
const detailContainer = document.getElementById("detailContainer");
const previewCanvas = document.getElementById("previewCanvas");

function setStatus(message) {
  statusMessage.textContent = message;
}

function ensurePdfJsReady() {
  if (!window.pdfjsLib) {
    throw new Error("PDF.js failed to load.");
  }
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

xmlInput.addEventListener("change", (event) => {
  state.xmlFile = event.target.files?.[0] || null;
  setStatus(state.xmlFile ? `XML selected: ${state.xmlFile.name}` : "No XML file selected.");
});

pdfInput.addEventListener("change", (event) => {
  state.pdfFiles = Array.from(event.target.files || []);
  setStatus(state.pdfFiles.length ? `${state.pdfFiles.length} PDF file(s) selected.` : "No PDFs selected.");
});

async function runAnalysis() {
  if (!state.xmlFile) {
    throw new Error("Please select an XML file.");
  }
  if (!state.pdfFiles.length) {
    throw new Error("Please select at least one PDF file.");
  }

  ensurePdfJsReady();
  setStatus("Parsing XML...");

  const xmlText = await state.xmlFile.text();
  const expectedPages = parseCortexXml(xmlText);
  if (!expectedPages.length) {
    throw new Error("No expected pages found in XML.");
  }

  setStatus("Matching PDFs...");
  const index = indexPdfFiles(state.pdfFiles);
  const { matched, missing, unexpected } = matchExpectedPages(expectedPages, index);

  const analyzed = [];
  for (let i = 0; i < matched.length; i += 1) {
    const item = matched[i];
    setStatus(`Analyzing PDFs (${i + 1}/${matched.length})...`);
    try {
      const analysis = await analyzePdfFile(item.file);
      analyzed.push({
        ...item,
        issues: analysis.issues,
        metrics: analysis.metrics,
        status: analysis.issues.length ? "warning" : "ok",
      });
    } catch (error) {
      analyzed.push({
        ...item,
        issues: [`PDF analysis failed: ${error.message}`],
        status: "warning",
      });
    }
  }

  const results = [...analyzed, ...missing];
  if (unexpected.length) {
    results.push({
      book: "UNEXPECTED",
      pageNumber: 0,
      filename: `${unexpected.length} file(s) not in XML`,
      issues: unexpected.map((name) => `Unexpected upload: ${name}`),
      status: "warning",
    });
  }

  state.results = results;
  renderResults(state.results, resultsContainer, async (page) => {
    renderDetail(page, detailContainer);
    if (page.file) {
      try {
        await renderPdfPreview(page.file, previewCanvas);
      } catch (error) {
        const ctx = previewCanvas.getContext("2d");
        ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        ctx.font = "14px Arial";
        ctx.fillStyle = "#111";
        ctx.fillText(`Preview failed: ${error.message}`, 12, 24);
      }
    } else {
      const ctx = previewCanvas.getContext("2d");
      ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      ctx.font = "14px Arial";
      ctx.fillStyle = "#111";
      ctx.fillText("No preview available for missing/unexpected item.", 12, 24);
    }
  });

  setStatus(`Done. ${results.length} result item(s).`);
}

runBtn.addEventListener("click", async () => {
  runBtn.disabled = true;
  try {
    await runAnalysis();
  } catch (error) {
    setStatus(`Error: ${error.message}`);
  } finally {
    runBtn.disabled = false;
  }
});
