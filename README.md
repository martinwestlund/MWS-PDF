# MWS_PDF

Beginner-friendly starter project.

## What this folder contains

- `src/` - where your project code will go
- `notes/` - plain-language notes, ideas, and planning
- `.gitignore` - files Git should ignore

## Beginner workflow

1. Write your idea in `notes/plan.md`.
2. Build one tiny step in `src/`.
3. Test that one step.
4. Repeat.

## First project plan template

Use this structure in `notes/plan.md`:

- Goal: What are you trying to build?
- Input: What information goes in?
- Output: What result should come out?
- Steps:
  - Step 1:
  - Step 2:
  - Step 3:
- Done means:

## Helpful mindset

You do not need to know everything before starting.
Break problems into tiny testable pieces and solve one piece at a time.

## Operator Quick Start (Single File)

The prepress checker can run as one file:

1. Copy `src/index.html` to the operator computer (for example, Desktop).
2. Open `index.html` in Chrome.
3. Upload one CortexPlanning XML file (for example, `*.GP.xml`).
4. Upload all single-page PDF files for the run.
5. Click **Run Analysis**.
6. Review grouped page statuses (`OK`, `WARNING`, `MISSING`) and open each page for details/preview.

Notes:

- Internet access to `cdnjs.cloudflare.com` is required to load PDF.js from CDN.
- No install or local backend is required.
