function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rgbToCmyk(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const k = 1 - Math.max(rn, gn, bn);
  if (k >= 1) {
    return { c: 0, m: 0, y: 0, k: 1 };
  }
  const c = (1 - rn - k) / (1 - k);
  const m = (1 - gn - k) / (1 - k);
  const y = (1 - bn - k) / (1 - k);
  return { c, m, y, k };
}

async function buildPageImageData(page) {
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  await page.render({ canvasContext: ctx, viewport }).promise;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { imageData, viewport };
}

function analyzePixels(imageData) {
  const { data, width, height } = imageData;
  const pixelCount = width * height;
  if (!pixelCount) {
    return {
      nonGrayRatio: 0,
      heavyInkRatio: 0,
      darknessRatio: 0,
    };
  }

  const stride = clamp(Math.floor(pixelCount / 35000), 1, 12);
  let sampled = 0;
  let nonGray = 0;
  let heavyInk = 0;
  let darkPixels = 0;

  for (let i = 0; i < data.length; i += 4 * stride) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    sampled += 1;
    const channelDelta = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
    if (channelDelta > 8) {
      nonGray += 1;
    }

    const { c, m, y, k } = rgbToCmyk(r, g, b);
    const totalInk = c + m + y + k;
    if (totalInk > 3.0) {
      heavyInk += 1;
    }

    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (luminance < 45) {
      darkPixels += 1;
    }
  }

  return {
    nonGrayRatio: nonGray / sampled,
    heavyInkRatio: heavyInk / sampled,
    darknessRatio: darkPixels / sampled,
  };
}

async function estimateSmallTextWarning(page) {
  const text = await page.getTextContent();
  let tinyItems = 0;
  let measured = 0;

  for (const item of text.items || []) {
    const tr = item.transform || [];
    if (tr.length < 6) {
      continue;
    }

    const scaleY = Math.hypot(tr[2] || 0, tr[3] || 0);
    if (!Number.isFinite(scaleY) || scaleY <= 0) {
      continue;
    }

    measured += 1;
    if (scaleY < 7.2) {
      tinyItems += 1;
    }
  }

  if (!measured) {
    return { tinyRatio: 0, tinyCount: 0, measured: 0 };
  }

  return { tinyRatio: tinyItems / measured, tinyCount: tinyItems, measured };
}

async function estimateLowDpiWarning(page) {
  const opList = await page.getOperatorList();
  const OPS = window.pdfjsLib?.OPS;
  if (!OPS) {
    return { imageOps: 0, likelyLowDpi: false };
  }

  let imageOps = 0;
  for (const fn of opList.fnArray || []) {
    if (
      fn === OPS.paintImageXObject ||
      fn === OPS.paintInlineImageXObject ||
      fn === OPS.paintImageMaskXObject
    ) {
      imageOps += 1;
    }
  }

  // Lightweight heuristic: many image draw operations on a single page
  // often correlate with placed/rasterized content that can include low-res assets.
  return { imageOps, likelyLowDpi: imageOps >= 22 };
}

export async function analyzePdfFile(file) {
  const bytes = await file.arrayBuffer();
  const loadingTask = window.pdfjsLib.getDocument({ data: bytes });
  const doc = await loadingTask.promise;
  const page = await doc.getPage(1);

  const [pixelData, textStats, dpiStats] = await Promise.all([
    buildPageImageData(page),
    estimateSmallTextWarning(page),
    estimateLowDpiWarning(page),
  ]);

  const pixelStats = analyzePixels(pixelData.imageData);
  const issues = [];

  if (dpiStats.likelyLowDpi) {
    issues.push(`Low DPI warning: high image operation count (${dpiStats.imageOps}).`);
  }
  if (pixelStats.heavyInkRatio > 0.14) {
    issues.push(
      `High TAC warning: ${Math.round(pixelStats.heavyInkRatio * 100)}% of sampled pixels exceed heavy-ink threshold.`
    );
  }
  if (pixelStats.nonGrayRatio > 0.04) {
    issues.push(
      `RGB/color content warning: ${Math.round(pixelStats.nonGrayRatio * 100)}% sampled non-neutral pixels detected.`
    );
  }
  if (textStats.tinyRatio > 0.3 && textStats.tinyCount >= 20) {
    issues.push(
      `Small text warning: ${textStats.tinyCount} text items appear under ~7.2pt equivalent size.`
    );
  }

  await doc.destroy();

  return {
    issues,
    metrics: {
      imageOps: dpiStats.imageOps,
      heavyInkRatio: pixelStats.heavyInkRatio,
      nonGrayRatio: pixelStats.nonGrayRatio,
      tinyTextRatio: textStats.tinyRatio,
    },
  };
}

export async function renderPdfPreview(file, canvasElement) {
  const bytes = await file.arrayBuffer();
  const loadingTask = window.pdfjsLib.getDocument({ data: bytes });
  const doc = await loadingTask.promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: 1.2 });
  const ctx = canvasElement.getContext("2d");
  canvasElement.width = Math.max(1, Math.floor(viewport.width));
  canvasElement.height = Math.max(1, Math.floor(viewport.height));
  await page.render({ canvasContext: ctx, viewport }).promise;
  await doc.destroy();
}
