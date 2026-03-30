function parseFormRange(rangeText) {
  if (!rangeText) {
    return null;
  }

  const match = String(rangeText).match(/([A-Za-z]+)\s*(\d+)\s*-\s*([A-Za-z]+)?\s*(\d+)/);
  if (!match) {
    return null;
  }

  const leftBook = match[1].toUpperCase();
  const leftPage = Number.parseInt(match[2], 10);
  const rightBook = (match[3] || leftBook).toUpperCase();
  const rightPage = Number.parseInt(match[4], 10);

  if (Number.isNaN(leftPage) || Number.isNaN(rightPage)) {
    return null;
  }

  return {
    left: { book: leftBook, pageNumber: leftPage },
    right: { book: rightBook, pageNumber: rightPage },
    raw: rangeText,
  };
}

function parsePageNumberFromName(name) {
  const match = String(name || "").match(/(\d+)/);
  if (!match) {
    return NaN;
  }
  return Number.parseInt(match[1], 10);
}

function text(element, selector) {
  return element.querySelector(selector)?.textContent?.trim() || "";
}

export function parseCortexXml(xmlText) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "application/xml");
  const parseErr = xmlDoc.querySelector("parsererror");
  if (parseErr) {
    throw new Error("Invalid XML file.");
  }

  const pageNodes = Array.from(
    xmlDoc.querySelectorAll("publications > publication > editions > edition > zones > zone > books > book > pages > page")
  );
  const pages = [];

  for (const pageNode of pageNodes) {
    const bookNode = pageNode.closest("book");
    const zoneNode = pageNode.closest("zone");

    const book = (text(bookNode, "name") || text(bookNode, "code") || "UNKNOWN").toUpperCase();
    const zoneName = text(zoneNode, "name");
    const pageName = text(pageNode, "name");
    const numberText = text(pageNode, "number");
    const pageNumber = Number.parseInt(numberText, 10);
    const safePage = Number.isNaN(pageNumber) ? parsePageNumberFromName(pageName) : pageNumber;

    const structureExpectedName = text(pageNode, "structureExpectedName");
    const filenameStem = structureExpectedName || pageName;
    if (!filenameStem) {
      continue;
    }

    const filename = filenameStem.toLowerCase().endsWith(".pdf") ? filenameStem : `${filenameStem}.pdf`;
    const filenameCandidates = Array.from(
      new Set(
        [filenameStem, pageName, structureExpectedName, filename]
          .filter(Boolean)
          .map((value) => String(value).trim())
      )
    );

    let formRange = null;
    const formName = text(zoneNode, "forms > form > name");
    if (formName) {
      formRange = parseFormRange(formName);
    } else if (zoneName) {
      formRange = parseFormRange(zoneName);
    }

    pages.push({
      book,
      pageNumber: Number.isNaN(safePage) ? -1 : safePage,
      filename,
      filenameLower: filename.toLowerCase(),
      filenameCandidates,
      formRange,
      sourceTag: pageNode.tagName,
    });
  }

  const deduped = [];
  const seen = new Set();
  for (const page of pages) {
    const key = `${page.book}::${page.pageNumber}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(page);
    }
  }

  deduped.sort((a, b) => {
    if (a.book !== b.book) {
      return a.book.localeCompare(b.book);
    }
    return a.pageNumber - b.pageNumber;
  });

  return deduped;
}
