# SchemeMatch AI — Setup & Run Guide

> **Purpose:** Set up the SchemeMatch AI development environment on Windows, run the local AI model, configure the application services, and prepare the project for a later deployment.  
> **Product concept:** SchemeMatch AI — Reverse-Matching Government Scheme Eligibility & Document Gap Engine  
> **Primary development environment:** Windows 10/11 + PowerShell  
> **Status:** Initial setup guide; adapt commands to the actual repository once its structure is created.

---

## 1. Setup Decisions

This guide uses the following starting assumptions:

- **Frontend:** HTML, Tailwind CSS, JavaScript
- **Backend:** Python + FastAPI
- **Local AI:** Ollama running Qwen 2.5 7B
- **Research/search:** Open WebUI or another explicitly configured search integration
- **PDF text extraction:** PyMuPDF
- **Authentication and persistence:** Supabase, where these features are implemented
- **Development first:** Run locally on the developer's Windows laptop; keep configuration portable for later deployment

These are implementation defaults, not proof that each integration already exists in the repository. Check the current code before creating new files or replacing working code.

## 2. Prerequisites

Install or confirm the following:

1. **Python 3.11 or a compatible version supported by the project's dependencies.**
2. **Ollama for Windows.**
3. **Git for Windows** to track changes.
4. **Visual Studio Code / Google Antigravity** for editing and running the project.
5. **A Supabase project** only if the current implementation uses Supabase authentication or persistence.
6. **Node.js LTS** only if the chosen Tailwind CSS workflow or other frontend tooling requires it. A static HTML/JavaScript frontend does not inherently require Node.js.

Use official installation sources. Do not download installers from unofficial mirrors.

### Verify the tools

Open a new PowerShell terminal and run:

```powershell
py --version
python --version
git --version
ollama --version
```

If a command is not recognised, finish installing that tool, reopen the terminal, and check again. Do not continue by silently substituting a different toolchain.

## 3. Open the Project Correctly

1. Open the **SchemeMatch AI project root folder** in Antigravity, not just an individual source file.
2. Inspect the existing folders and files before creating anything.
3. Keep `prd.md` and `setup.md` in the project root so the coding agent can refer to them.
4. If a repository already has a different structure, preserve it where practical and update these commands rather than creating a duplicate application structure.

A possible structure for a new project is:

```text
yojna-lens/
├── prd.md
├── setup.md
├── .gitignore
├── .env.example
├── frontend/
│   ├── index.html
│   ├── assets/
│   ├── styles/
│   └── js/
├── backend/
│   ├── requirements.txt
│   ├── .env.example
│   ├── app/
│   │   ├── main.py
│   │   ├── api/
│   │   ├── services/
│   │   ├── rules/
│   │   └── models/
│   └── tests/
└── docs/
```

Treat this as a suggested structure only. Do not create empty folders just to match this tree if an existing architecture is already in use.

## 4. Start and Verify Ollama

Open PowerShell. If Ollama is installed and running, check the models already available:

```powershell
ollama list
```

Look for the installed Qwen model. The expected model tag in this guide is `qwen2.5:7b`, but the local tag may differ. **Use the exact tag shown by `ollama list` in the application configuration.** Do not download a duplicate model unnecessarily.

If that model is not present and you have decided to use this exact model, pull it with:

```powershell
ollama pull qwen2.5:7b
```

Test it directly:

```powershell
ollama run qwen2.5:7b
```

Enter a simple test prompt. Exit the interactive session when finished. Then check the local Ollama service:

```powershell
ollama ps
```

Ollama normally exposes its local API at:

```text
http://localhost:11434
```

Do not expose port `11434` directly to the public internet. The model endpoint should remain local or be placed behind an appropriately secured service if remote access is ever required.

## 5. Configure the Python Backend

The following steps assume the backend directory is named `backend/` and contains `requirements.txt`. Adjust the path if the actual repository differs.

From the project root, run:

```powershell
cd backend
py -3.11 -m venv .venv
```

Activate the virtual environment:

```powershell
.\.venv\Scripts\Activate.ps1
```

If PowerShell blocks activation, allow scripts for **this terminal process only** and retry:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

Install the project's pinned dependencies:

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Use a checked-in `requirements.txt` with compatible, tested dependency versions. Do not repeatedly install arbitrary latest versions while debugging. The backend will likely need FastAPI, Uvicorn, an HTTP client, environment configuration, and PDF-processing dependencies, but the repository's actual requirements file is the source of truth.

## 6. Environment Variables and Secrets

Create environment files from safe examples if the project includes them. For example, from `backend/`:

```powershell
Copy-Item .env.example .env
```

If the project keeps its example file at the root, copy it from that location instead. Edit `.env` locally and never commit it.

A backend example configuration may use these variable names:

```dotenv
APP_ENV=development
API_HOST=127.0.0.1
API_PORT=8000
FRONTEND_ORIGIN=http://127.0.0.1:5500

OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:7b

SUPABASE_URL=
SUPABASE_ANON_KEY=

# Keep external search disabled until a real integration is configured and tested.
SEARCH_PROVIDER=none
OPENWEBUI_BASE_URL=http://127.0.0.1:3000
```

Important:

- Replace `OLLAMA_MODEL` with the exact tag reported by `ollama list` if it differs.
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` are placeholders. Fill them only when Supabase is configured.
- Never put real API keys, passwords, access tokens, database credentials, or private keys into Markdown files, screenshots, source code, or frontend JavaScript.
- Do not expose Supabase service-role credentials in the browser. If a privileged server-side credential is genuinely required, keep it backend-only, protect it carefully, and document why it is needed.
- `.env` files must be included in `.gitignore`. Commit `.env.example` with placeholder values only.
- Configuration values must be read by the backend from the environment, not hardcoded throughout the codebase.

## 7. Configure Supabase (If Used)

1. Create or open the project's Supabase workspace.
2. Copy the project URL and the least-privileged client key required by the implementation into the local backend environment file.
3. Use versioned database migrations or documented SQL scripts for the schema; do not rely on undocumented manual table changes.
4. Enable and test Row Level Security (RLS) for user-owned records.
5. Test that one account cannot read or modify another account's profile, saved results, or document checklist.
6. Add sign-in and persistence only when they are implemented and tested in the project.

Do not create a database table or claim authentication is functional solely because environment variables exist. For a demo, keep scheme discovery usable without an account unless the product requirements explicitly decide otherwise. Saving private user data should require a clear user choice and appropriate access controls.

## 8. Configure Search and Source Research

SchemeMatch AI needs trustworthy source links for scheme rules. Open WebUI may be part of the local AI workflow, but **having Open WebUI installed does not automatically mean the backend has a working web-search integration**.

Before enabling search:

1. Confirm which search provider or Open WebUI integration is actually configured.
2. Confirm how the backend will call it, which authentication it needs, and what response format it returns.
3. Test that results contain usable source URLs and relevant source details.
4. Prefer official government portals, department pages, notifications, and circulars.
5. Store source metadata alongside extracted scheme rules.
6. Keep search disabled or clearly unavailable until this path works. Do not show mock results as live research.

When a supported search integration has been implemented and tested, update the local environment configuration accordingly. Do not invent environment variables or assume an undocumented Open WebUI endpoint.

## 9. Run the Backend

From the `backend/` directory, with the virtual environment activated and configuration prepared, start FastAPI using the entry point that actually exists in the repository.

For the proposed structure where `backend/app/main.py` defines `app`:

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Verify these endpoints **only if they have been implemented**:

- Health check: `http://127.0.0.1:8000/health`
- API documentation: `http://127.0.0.1:8000/docs`

If the app uses a different module path, follow the existing code and update this command. Do not add a fake health check or empty endpoint just to make the URL work; implement meaningful checks in the backend.

## 10. Run the Frontend

For a simple static frontend, open a second PowerShell terminal. Navigate to the actual frontend folder:

```powershell
cd frontend
python -m http.server 5500 --bind 127.0.0.1
```

Then visit:

```text
http://127.0.0.1:5500
```

This static server is for local development only. If the project uses a different frontend build tool or development server, follow that tool's documented command instead.

Configure the frontend to call the local backend URL from one central configuration value. Do not scatter API base URLs across many JavaScript files. Configure backend CORS for the intended local frontend origin rather than allowing every origin by default.

## 11. Recommended Startup Order

For a normal local development session:

1. Start or verify Ollama.
2. Confirm the selected Qwen model is available.
3. Start the FastAPI backend.
4. Start the frontend development server.
5. Open the frontend in the browser and test the full discovery flow.
6. If the search integration is configured, check that source links work and that the backend does not fabricate results when search is unavailable.

The application should show a clear, user-friendly status if the model or research service is unavailable. It must not silently replace live results with fabricated scheme data.

## 12. Basic Verification Checklist

Before considering the local setup successful, verify each applicable item:

- [ ] Python and Ollama commands work in a fresh terminal.
- [ ] `ollama list` shows the configured model tag.
- [ ] A direct prompt to the local model returns a response.
- [ ] Backend dependencies install inside the project's virtual environment.
- [ ] Backend starts without configuration or import errors.
- [ ] Frontend opens through a local development server.
- [ ] Frontend can call the backend successfully.
- [ ] CORS allows the configured frontend origin and no unnecessary origins.
- [ ] Missing profile values stay unknown rather than being guessed.
- [ ] Eligibility evaluation uses deterministic, testable backend rules.
- [ ] Every displayed scheme claim has a traceable source in the supported dataset.
- [ ] Search failures are visible and do not produce fake live results.
- [ ] Supabase access controls are tested if user data is stored.
- [ ] Secrets are absent from Git history and frontend assets.

## 13. Tests and Code Quality

When implemented, run tests from `backend/` using the project's test setup. For a pytest-based project, the common command is:

```powershell
pytest
```

Prioritise tests for:

- Eligibility conditions that are met, not met, and unknown.
- Missing profile fields and invalid input types.
- Scheme exceptions and boundary values.
- Required-document checklist generation.
- Source URLs and verification metadata.
- Search/model failures and malformed model output.
- Authentication and user-data isolation, if applicable.

Do not treat a passing UI demo as proof that eligibility rules are correct. Compare results against a manually reviewed set of source-backed test cases.

## 14. Troubleshooting

### `ollama` is not recognised

Confirm Ollama is installed, open a new terminal, and run `ollama --version` again. Do not hardcode a guessed executable path into the application.

### The model cannot be found

Run `ollama list` and use the exact installed model tag in `OLLAMA_MODEL`. Pull a model only if it is genuinely missing.

### The backend cannot connect to Ollama

Confirm Ollama is running and that `OLLAMA_BASE_URL` points to the local service. Test a prompt with the Ollama CLI before debugging the application code.

### Python package installation fails

Confirm the virtual environment is activated and the supported Python version is being used. Read the full error before changing package versions or deleting lock/requirements files.

### PowerShell blocks virtual-environment activation

Use the process-scoped execution-policy command shown in Section 5. Avoid changing the machine-wide execution policy just to activate this project environment.

### The frontend cannot call the backend

Check the backend terminal, API URL, CORS configuration, port numbers, and browser developer console. Do not solve this by enabling all CORS origins in production.

### Search returns no results

Check whether a real search provider is configured, the integration is reachable, and its response is parsed correctly. Keep the product honest about unavailable research.

### Supabase access fails

Check the local environment values, project URL, auth settings, database policies, and RLS rules. Never solve an access issue by exposing privileged credentials in the frontend or disabling access controls globally.

## 15. Deployment Readiness Notes

This setup is designed to keep local development portable, not to imply that production deployment is already configured.

Before deployment:

- Choose a hosting strategy for the Python backend and frontend.
- Decide how the hosted backend will access the model. A Qwen model running on a developer's laptop is not automatically reachable from a hosted server.
- Do not expose a personal laptop or Ollama port directly to the public internet.
- Configure secrets through the hosting provider's secret-management settings.
- Set production CORS origins, HTTPS, authentication, rate limits, and logging policies.
- Keep scheme data and rules versioned, sourced, and reviewable.
- Test model latency, memory use, failure behaviour, and concurrent requests on the intended environment.
- Review privacy, data retention, and account deletion behaviour before accepting real user data.

Do not add paid services or cloud infrastructure without approval. Prefer a local demo path that works with the already installed tools, then document any infrastructure needed for a hosted version.

## 16. Instructions for Antigravity

When following this setup guide:

1. Read `prd.md`, `setup.md`, and any other project-specific instruction files before making changes.
2. Inspect the existing codebase and preserve working code.
3. Check installed tools and existing model names before downloading or reinstalling anything.
4. Use the project's actual paths, dependency files, and application entry points; revise examples when they do not match the repository.
5. Create safe `.env.example` files, never real credentials.
6. Keep AI extraction, source research, deterministic eligibility evaluation, API routes, and UI code separated.
7. Do not claim that search, Supabase, authentication, or a health endpoint works until it has been configured and tested.
8. Never fabricate scheme results to hide an integration failure.
9. Ask before adding paid services, changing the main stack, deleting files, or making irreversible changes.
10. After setup, report the exact commands run, checks passed, issues remaining, and the next manual action required.

---

**End of setup guide.**
