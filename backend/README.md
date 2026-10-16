# SchemeMatch AI — FastAPI & Ollama Qwen 2.5 Backend

FastAPI backend service connecting the **SchemeMatch AI** frontend to the local **Ollama** engine running **Qwen 2.5 7B**.

---

## 1. Prerequisites
- **Windows 10/11**
- **Python 3.10+** (Python 3.12 verified)
- **Ollama** installed on Windows (`http://127.0.0.1:11434`)
- **Qwen 2.5 7B** model pulled in Ollama:
  ```powershell
  ollama pull qwen2.5:7b
  ```

---

## 2. Setup Procedure (PowerShell)

### Step 1: Open PowerShell and navigate to the backend directory
```powershell
cd "d:\SchemeMatch AI1\SchemeMatch AI\backend"
```

### Step 2: (Optional but recommended) Create & activate a virtual environment
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### Step 3: Install dependencies
```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

---

## 3. Running the Backend

### Step 1: Ensure Ollama is running in background
In a separate PowerShell window or terminal:
```powershell
ollama serve
```
*(If Ollama is already running in your Windows system tray, this step is already satisfied.)*

Verify Ollama is reachable and has the model:
```powershell
ollama list
```
You should see:
```
NAME          ID              SIZE      MODIFIED
qwen2.5:7b    ...             4.7 GB    ...
```

### Step 2: Start the FastAPI Server
From the `backend/` directory:
```powershell
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
or simply run:
```powershell
python main.py
```

The server will be available at:
- **API URL:** `http://127.0.0.1:8000`
- **Swagger Interactive Docs:** `http://127.0.0.1:8000/docs`
- **Health Check Endpoint:** `http://127.0.0.1:8000/api/health`
- **Chat Endpoint:** `http://127.0.0.1:8000/api/chat`

---

## 4. API Endpoints

### 1. `GET /api/health`
Verifies backend connectivity to Ollama and dynamically detects the installed model.

**Example PowerShell Request:**
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/health" -Method Get | ConvertTo-Json
```

**Response Format:**
```json
{
  "status": "healthy",
  "ollama_connected": true,
  "detected_model": "qwen2.5:7b",
  "available_models": ["qwen2.5:7b"],
  "ollama_url": "http://127.0.0.1:11434",
  "web_search": {
    "connected": false,
    "note": "OpenWebUI web search is not connected to website API. Local Ollama LLM integration active."
  }
}
```

### 2. `POST /api/chat`
Processes citizen questions using a specialized system prompt for Indian Central and State government schemes.

**Example PowerShell Request:**
```powershell
$body = @{
    message = "Am I eligible for Majhi Ladki Bahin Yojana if my family income is 1.8 Lakh in Maharashtra?"
    language = "en"
    citizen_context = @{
        full_name = "Priya Sharma"
        gender = "Female"
        age = 28
        domicile_state = "Maharashtra"
        annual_income = 180000
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/chat" -Method Post -ContentType "application/json" -Body $body | ConvertTo-Json -Depth 5
```

---

## 5. Note on OpenWebUI Web Search
OpenWebUI is installed and its manual web search feature operates within OpenWebUI's own UI/containers.
> **Honest Architecture Note:** OpenWebUI's web search is **not** connected to the SchemeMatch AI website API. The AI responses in the website are generated directly by the local Ollama LLM (`qwen2.5:7b`) using the official gazette guidelines and criteria encoded in the system prompt.
