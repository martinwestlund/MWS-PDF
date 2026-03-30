function statusFromIssues(issues, missing) {
  if (missing) {
    return "missing";
  }
  return issues.length ? "warning" : "ok";
}

export function groupByBook(results) {
  const grouped = new Map();
  for (const item of results) {
    if (!grouped.has(item.book)) {
      grouped.set(item.book, []);
    }
    grouped.get(item.book).push(item);
  }

  for (const pages of grouped.values()) {
    pages.sort((a, b) => a.pageNumber - b.pageNumber);
  }

  return new Map([...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

export function renderResults(results, container, onSelect) {
  container.innerHTML = "";

  if (!results.length) {
    container.innerHTML = "<p>No pages parsed from XML.</p>";
    return;
  }

  const grouped = groupByBook(results);

  for (const [book, pages] of grouped.entries()) {
    const section = document.createElement("section");
    section.className = "book-section";
    section.innerHTML = `<h3>Book ${book}</h3>`;

    const list = document.createElement("div");
    list.className = "page-list";

    for (const page of pages) {
      const status = statusFromIssues(page.issues || [], page.status === "missing");
      const row = document.createElement("div");
      row.className = "page-row";
      row.innerHTML = `
        <strong>P${page.pageNumber}</strong>
        <span>${page.filename}</span>
        <span class="badge ${status}">${status.toUpperCase()}</span>
      `;

      const openBtn = document.createElement("button");
      openBtn.type = "button";
      openBtn.textContent = "Open";
      openBtn.addEventListener("click", () => onSelect(page));
      row.appendChild(openBtn);

      list.appendChild(row);
    }

    section.appendChild(list);
    container.appendChild(section);
  }
}

export function renderDetail(page, container) {
  const issueItems = (page.issues || [])
    .map((issue) => `<li>${issue}</li>`)
    .join("");

  const formPair = page.formRange
    ? `${page.formRange.left.book}${page.formRange.left.pageNumber} - ${page.formRange.right.book}${page.formRange.right.pageNumber}`
    : "N/A";

  container.innerHTML = `
    <p><strong>Book:</strong> ${page.book}</p>
    <p><strong>Page:</strong> ${page.pageNumber}</p>
    <p><strong>Filename:</strong> ${page.filename}</p>
    <p><strong>Form Pair:</strong> ${formPair}</p>
    <p><strong>Status:</strong> ${page.status || (page.issues?.length ? "warning" : "ok")}</p>
    <h3>Issues</h3>
    ${issueItems ? `<ul>${issueItems}</ul>` : "<p>No issues detected.</p>"}
  `;
}
