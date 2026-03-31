from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from services.risk_service import load_risk_model
from utils.constants import RISK_MODEL_PATH
from utils.logger import get_logger

logger = get_logger(__name__)


# ──────────────────────────────────────────
#  Lifespan — runs on startup / shutdown
#  Models will be loaded here in Phase 3 & 4
# ──────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 FinSure ML Service starting up...")

    from services.categorizer_service import load_categorizer
    from services.risk_service import load_risk_model
    from utils.constants import CATEGORIZER_MODEL_PATH, LABEL_ENCODER_PATH, RISK_MODEL_PATH

    logger.info(f"🔍 Looking for model at: {CATEGORIZER_MODEL_PATH}")
    logger.info(f"🔍 Looking for encoder at: {LABEL_ENCODER_PATH}")
    logger.info(f"🔍 Looking for risk model at: {RISK_MODEL_PATH}")

   
    app.state.categorizer, app.state.label_encoder = load_categorizer()
    app.state.risk_model = load_risk_model()

    logger.info("✅ Startup complete. Ready to accept requests.")
    yield

    logger.info("🛑 FinSure ML Service shutting down...")


# ──────────────────────────────────────────
#  App Init
# ──────────────────────────────────────────
app = FastAPI(
    title="FinSure ML Service",
    description="PDF parsing, transaction categorization, FRI scoring & insurance recommendations",
    version="1.0.0",
    lifespan=lifespan,
)

# ──────────────────────────────────────────
#  CORS  (Node.js backend talks to this)
# ──────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000"],  # Node.js backend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────
#  Routers — uncomment as phases are built
# ──────────────────────────────────────────
from routes.parse_route        import router as parse_router
from routes.categorize_route   import router as categorize_router
from routes.risk_route         import router as risk_router
from routes.recommendation_route import router as recommendation_router
from routes.analyze_route          import router as analyze_router

app.include_router(parse_router,          prefix="/parse",     tags=["Parsing"])
app.include_router(categorize_router,     prefix="/categorize",tags=["Categorization"])
app.include_router(risk_router,           prefix="/risk-score", tags=["Risk Scoring"])
app.include_router(recommendation_router, prefix="/recommend",  tags=["Recommendations"])
app.include_router(analyze_router,        prefix="/analyze",    tags=["Full Analysis"])


# ──────────────────────────────────────────
#  Health Check
# ──────────────────────────────────────────
@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "service": "FinSure ML Service",
        "version": "1.0.0",
    }


# ──────────────────────────────────────────
#  Run directly: python main.py
# ──────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
    
