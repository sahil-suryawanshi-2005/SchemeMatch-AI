import os
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any, Literal
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Load environment variables from root directory .env or backend/.env
root_env = Path(__file__).resolve().parent.parent / ".env"
local_env = Path(__file__).resolve().parent / ".env"
if root_env.exists():
    load_dotenv(dotenv_path=root_env)
elif local_env.exists():
    load_dotenv(dotenv_path=local_env)
else:
    load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("schemematch-backend")

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
DEFAULT_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")
BACKEND_HOST = os.getenv("BACKEND_HOST", "127.0.0.1")
BACKEND_PORT = int(os.getenv("BACKEND_PORT", "8000"))
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")

app = FastAPI(
    title="SchemeMatch AI Backend",
    description="FastAPI service connecting SchemeMatch AI to local Ollama (Qwen 2.5 7B)",
    version="1.0.0"
)

# CORS Middleware to allow requests from local frontend (Live Server, Vite, static files)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------
class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str

class CitizenContext(BaseModel):
    full_name: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    date_of_birth: Optional[str] = None
    domicile_state: Optional[str] = None
    district_taluka: Optional[str] = None
    residential_category: Optional[str] = None
    ration_card_category: Optional[str] = None
    category_reservation: Optional[str] = None
    is_divyangjan: Optional[bool] = None
    annual_income: Optional[float] = None
    occupation: Optional[str] = None
    land_holding_acres: Optional[float] = None
    npci_dbt_active: Optional[bool] = None

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="Citizen inquiry about schemes, eligibility, or documents")
    conversation_history: Optional[List[ChatMessage]] = Field(default=None, description="Previous conversation turns")
    language: Optional[str] = Field(default="en", description="Target language: en (English), hi (Hindi), mr (Marathi)")
    citizen_context: Optional[CitizenContext] = Field(default=None, description="Citizen demographic and economic profile")

class ChatResponse(BaseModel):
    reply: str
    model: str
    status: str = "success"
    language: str = "en"
    disclaimer: str

class HealthResponse(BaseModel):
    status: str
    ollama_connected: bool
    detected_model: Optional[str]
    available_models: List[str]
    ollama_url: str
    web_search: Dict[str, Any]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
async def query_ollama_models() -> tuple[Optional[str], List[str]]:
    """
    Queries local Ollama tags endpoint to detect available models.
    Prioritizes Qwen 2.5 7B or any Qwen model if available.
    """
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            if resp.status_code == 200:
                data = resp.json()
                models = [m.get("name") for m in data.get("models", []) if m.get("name")]
                if not models:
                    return None, []
                
                # Check for explicit qwen2.5:7b or any qwen variant
                for target in ["qwen2.5:7b", "qwen2.5", "qwen"]:
                    for m in models:
                        if target in m.lower():
                            return m, models
                # Fallback to first available model
                return models[0], models
            return None, []
    except Exception as exc:
        logger.warning(f"Could not reach Ollama at {OLLAMA_BASE_URL}: {exc}")
        return None, []

def construct_system_prompt(language: str = "en", ctx: Optional[CitizenContext] = None) -> str:
    """
    Constructs the specialized Indian Government Welfare Schemes system prompt.
    """
    prompt = (
        "You are SchemeBot AI, an authoritative, helpful, and empathetic Indian Government Welfare Schemes & Citizen Entitlement assistant "
        "integrated into the SchemeMatch AI platform.\n\n"
        "Your expertise spans Central Government (Government of India) and State Government schemes, including Maharashtra.\n"
        "Key schemes include Mukhyamantri Majhi Ladki Bahin Yojana, PM-KISAN Samman Nidhi, PM Surya Ghar Muft Bijli Yojana, "
        "Ayushman Bharat PM-JAY, Pradhan Mantri Awas Yojana (PMAY), PMEGP, Lakhpati Didi, Atal Pension Yojana, and related welfare programs.\n\n"
        "STRICT OPERATIONAL GUIDELINES:\n"
        "1. GROUNDED IN OFFICIAL GAZETTES: Base all explanations on official government notifications, gazette criteria, and authentic department guidelines.\n"
        "2. MISSING INFORMATION & CLARIFYING QUESTIONS: If crucial eligibility parameters (e.g. state domicile, age, annual family income, landholding size, caste/social category, or bank DBT/Aadhaar linking) are missing from the citizen's query or profile, actively ask for them before giving a definitive verdict.\n"
        "3. DISTINGUISH FACTS FROM UNCERTAINTIES: Clearly separate confirmed user profile facts from unverified details or assumptions.\n"
        "4. NO UNCONFIRMED ELIGIBILITY CLAIMS: NEVER claim guaranteed or confirmed eligibility. Use precise phrasing such as 'Based on the details provided, you tentatively satisfy...' or 'Final sanction requires official document verification by the competent revenue authority.'\n"
        "5. DOCUMENT PREREQUISITES & GAP ANALYSIS: Always highlight mandatory documents required (e.g. Aadhaar linked to bank account via NPCI DBT, Domicile Certificate, Revenue/Tehsildar Income Certificate, digital 7/12 land records / Saat Baara, Ration Card, Hamipatra self-declarations).\n"
        "6. STRUCTURE & READABILITY: Provide crisp, clean, structured responses with markdown bullet points, bold key terms, and actionable next steps.\n"
    )

    if language == "hi":
        prompt += (
            "\nLANGUAGE INSTRUCTION: The user has selected Hindi. Answer in polite, clear Hindi (using Devanagari script). "
            "You may keep official scheme names in English or transliterated Hindi for clarity.\n"
        )
    elif language == "mr":
        prompt += (
            "\nLANGUAGE INSTRUCTION: The user has selected Marathi. Answer in polite, clear Marathi (using Devanagari script). "
            "Refer correctly to Maharashtra Government schemes (e.g., मुख्यमंत्री माझी लाडकी बहीण योजना, पीएम किसान, इत्यादी).\n"
        )
    else:
        prompt += "\nLANGUAGE INSTRUCTION: Respond in clear, accessible, professional English.\n"

    if ctx:
        ctx_details = []
        if ctx.full_name: ctx_details.append(f"- Name: {ctx.full_name}")
        if ctx.gender: ctx_details.append(f"- Gender: {ctx.gender}")
        if ctx.age: ctx_details.append(f"- Age: {ctx.age}")
        if ctx.domicile_state: ctx_details.append(f"- State/Domicile: {ctx.domicile_state}")
        if ctx.district_taluka: ctx_details.append(f"- District: {ctx.district_taluka}")
        if ctx.annual_income is not None: ctx_details.append(f"- Annual Household Income: ₹{int(ctx.annual_income):,}")
        if ctx.category_reservation: ctx_details.append(f"- Social Category: {ctx.category_reservation}")
        if ctx.occupation: ctx_details.append(f"- Occupation: {ctx.occupation}")
        if ctx.land_holding_acres is not None: ctx_details.append(f"- Landholding: {ctx.land_holding_acres} acres")
        if ctx.ration_card_category: ctx_details.append(f"- Ration Card: {ctx.ration_card_category}")
        if ctx.npci_dbt_active is not None: ctx_details.append(f"- Bank Aadhaar DBT Active: {'Yes' if ctx.npci_dbt_active else 'No'}")

        if ctx_details:
            prompt += (
                "\nCITIZEN DOSSIER PROVIDED (Use to tailor eligibility evaluation, but explicitly verify any unconfirmed items):\n"
                + "\n".join(ctx_details) + "\n"
            )

    return prompt

# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------
@app.get("/", summary="Backend Index")
async def root():
    return {
        "service": "SchemeMatch AI FastAPI Backend",
        "status": "online",
        "docs": "/docs",
        "health": "/api/health",
        "chat": "/api/chat"
    }

@app.get("/api/health", response_model=HealthResponse, summary="Health & Ollama Connectivity Check")
async def health_check():
    """
    Checks if Ollama is running, detects installed models (prioritizing Qwen 2.5 7B),
    and reports system status and web search integration notes.
    """
    detected_model, available_models = await query_ollama_models()
    is_connected = detected_model is not None

    status_str = "healthy" if is_connected else "degraded"

    return HealthResponse(
        status=status_str,
        ollama_connected=is_connected,
        detected_model=detected_model,
        available_models=available_models,
        ollama_url=OLLAMA_BASE_URL,
        web_search={
            "connected": False,
            "note": "OpenWebUI web search is not connected to website API. Local Ollama LLM integration active."
        }
    )

@app.post("/api/chat", response_model=ChatResponse, summary="Send message to SchemeBot AI (Ollama Qwen 2.5)")
async def chat_endpoint(request: ChatRequest):
    """
    Processes citizen query through local Ollama model using structured GovTech scheme instructions.
    """
    detected_model, available_models = await query_ollama_models()
    
    # Model selection: detected model -> env fallback -> default fallback
    model_to_use = detected_model or DEFAULT_MODEL

    # Construct conversation payload
    system_prompt = construct_system_prompt(request.language or "en", request.citizen_context)
    
    ollama_messages = [{"role": "system", "content": system_prompt}]

    # Append recent conversation history if provided (up to last 10 turns)
    if request.conversation_history:
        for hist in request.conversation_history[-10:]:
            ollama_messages.append({"role": hist.role, "content": hist.content})

    # Append current user message
    ollama_messages.append({"role": "user", "content": request.message})

    payload = {
        "model": model_to_use,
        "messages": ollama_messages,
        "stream": False,
        "options": {
            "temperature": 0.4,
            "top_p": 0.9
        }
    }

    try:
        # Allow sufficient timeout for 7B parameter local model generation
        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(f"{OLLAMA_BASE_URL}/api/chat", json=payload)
            
            if resp.status_code == 404:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Model '{model_to_use}' not found in Ollama. Available models: {available_models}. Run 'ollama pull qwen2.5:7b'."
                )
            
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Ollama returned HTTP {resp.status_code}: {resp.text}"
                )

            data = resp.json()
            reply_text = data.get("message", {}).get("content", "").strip()

            if not reply_text:
                reply_text = "I processed your request, but could not generate a conclusive answer. Please rephrase your question regarding the scheme."

            return ChatResponse(
                reply=reply_text,
                model=model_to_use,
                status="success",
                language=request.language or "en",
                disclaimer="SchemeMatch AI guidance is for informational reference based on gazette criteria. Official approval is subject to verification by the respective department or revenue authority."
            )

    except httpx.ConnectError:
        logger.error(f"Cannot connect to Ollama at {OLLAMA_BASE_URL}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Local AI engine (Ollama) is not reachable at {OLLAMA_BASE_URL}. Please start Ollama using 'ollama serve' in PowerShell."
        )
    except httpx.TimeoutException:
        logger.error("Ollama request timed out after 90 seconds")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="The local Qwen 2.5 model took longer than 90 seconds to respond. Please check system resource usage and retry."
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Unexpected error calling Ollama: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error while generating AI response: {str(exc)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=BACKEND_HOST, port=BACKEND_PORT, reload=True)
