function normalizeName(name) {
  return String(name || "").trim().toLowerCase();
}

function withoutPdfExtension(name) {
  return normalizeName(name).replace(/\.pdf$/i, "");
}

export function indexPdfFiles(files) {
  const map = new Map();
  for (const file of files || []) {
    const filenameKey = normalizeName(file.name);
    if (!filenameKey) {
      continue;
    }
    const stemKey = withoutPdfExtension(file.name);
    if (!map.has(filenameKey)) {
      map.set(filenameKey, file);
    }
    if (stemKey && !map.has(stemKey)) {
      map.set(stemKey, file);
    }
  }
  return map;
}

export function matchExpectedPages(expectedPages, fileIndex) {
  const matched = [];
  const missing = [];
  const used = new Set();

  for (const page of expectedPages) {
    const candidates = [
      ...(page.filenameCandidates || []),
      page.filename,
      withoutPdfExtension(page.filename),
    ]
      .map((entry) => normalizeName(entry))
      .filter(Boolean);

    let file = null;
    let matchedKey = "";
    for (const key of candidates) {
      const direct = fileIndex.get(key);
      if (direct) {
        file = direct;
        matchedKey = key;
        break;
      }
      const stem = withoutPdfExtension(key);
      const byStem = fileIndex.get(stem);
      if (byStem) {
        file = byStem;
        matchedKey = stem;
        break;
      }
    }

    if (file) {
      matched.push({ ...page, file });
      used.add(normalizeName(file.name));
      used.add(withoutPdfExtension(file.name));
      if (matchedKey) {
        used.add(matchedKey);
      }
    } else {
      const expectedHint = (page.filenameCandidates || [])
        .concat(page.filename)
        .filter(Boolean)
        .join(", ");
      missing.push({
        ...page,
        status: "missing",
        issues: [`Expected PDF file is missing. Expected one of: ${expectedHint}`],
      });
    }
  }

  const unexpected = [];
  for (const [key, file] of fileIndex.entries()) {
    if (!used.has(key)) {
      unexpected.push(file.name);
    }
  }

  return { matched, missing, unexpected };
}
