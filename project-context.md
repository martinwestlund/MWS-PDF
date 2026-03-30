\# Prepress Checker Tool (MVP)



\## Overview



We are building a local prepress checker tool for newspaper production.



The tool is used before printing to detect common issues in incoming PDF pages.



\## Inputs



1\. CortexPlanning XML file

2\. A set of single-page PDF files



Important:



\* Each PDF represents exactly ONE page

\* Filenames ALWAYS match what is defined in the XML

\* No guessing or fuzzy matching is needed



\## Goal



Create a simple tool that:



\* Parses the XML

\* Extracts all expected pages (book, page number, filename)

\* Matches PDFs to pages

\* Detects common print issues

\* Displays results clearly for press operators



\## Constraints



\* Must run locally (no backend/server)

\* Prefer a single HTML file or very lightweight setup

\* No installation required for end users

\* Must be extremely simple to use (press floor environment)



\## MVP Features



\### 1. XML Parsing



\* Extract:



&#x20; \* Book (e.g. A, B, etc.)

&#x20; \* Page number

&#x20; \* Expected filename

\* Use form names like "A1-A32" to determine page pairs



\### 2. File Matching



\* Match PDFs by filename (case-insensitive)

\* Detect missing PDFs



\### 3. PDF Analysis (basic for now)



\* Low DPI images (approximate detection is OK)

\* High ink coverage / TAC (heuristic)

\* RGB content warnings

\* Small text warnings



\### 4. UI



\* Upload XML

\* Upload multiple PDFs

\* Button to run analysis

\* List pages grouped by book

\* Show:



&#x20; \* Page number

&#x20; \* Filename

&#x20; \* Status (OK / warning / missing)

\* Click page → show preview + issues



\## Technical Notes



\* Use plain JavaScript (no heavy frameworks)

\* Use PDF.js for PDF rendering/analysis

\* Must work in Chrome on macOS

\* Keep everything simple and readable



\## Development Approach



Build step-by-step:



1\. XML parsing

2\. File matching

3\. Basic UI

4\. PDF analysis



Do NOT over-engineer. Focus on a working MVP first.



