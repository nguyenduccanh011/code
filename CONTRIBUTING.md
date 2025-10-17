# Contributing

This project follows the guidelines in AGENTS.md (Vietnamese). Below is a short summary in English with actionable steps.

## Workflow
- Solo mode: commit directly to `main` for small, isolated changes; create short-lived branches for larger work. PRs are optional.
- Create focused branches per feature/fix when needed.
- Keep commits clear and scoped; reference issues if applicable.
- Use the plan tool (update_plan) to outline steps for non-trivial tasks.
- Before committing, run tests locally.

## Directory Structure
- `backend/`: server-side Python and helper scripts.
- `src/`: main frontend code (core, indicators, pages, tools, utils).
- `css/`: stylesheets.
- Root HTML files demonstrate and test features.
- `docs/`: project docs and roadmap.

## Naming
- Use English for filenames and code identifiers.
- Add Vietnamese comments where helpful for context.

## Tests
- JavaScript (Node 18+): `node tests/run-js-tests.mjs`
- Python (3.9+): `python -m unittest discover -s backend/tests -p "test_*.py" -v`
- Combined (if PowerShell blocks npm scripts): `cmd /c npm test`
- See `docs/WORKFLOW.md` for execution order and verification steps.

## Backend Environment
Install dependencies:

```
pip install -r backend/requirements.txt
```

## Code Style
- Keep code clear and readable; document non-obvious logic.
- Avoid unrelated changes in the same commit.

## Pull Request Checklist
- [ ] Code builds and runs locally
- [ ] Tests pass (`npm test` or individual commands above)
- [ ] Updated docs if behavior or APIs changed
