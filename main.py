from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from database import engine
from models import models
from routers import auth, inventory, requests

app = FastAPI(title="School Sports Inventory Management System")

# Создаем таблицы
models.Base.metadata.create_all(bind=engine)

# Настройка статических файлов и шаблонов
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключаем роутеры
app.include_router(auth.router, prefix="/api")
app.include_router(inventory.router, prefix="/api")
app.include_router(requests.router, prefix="/api")

@app.get("/")
async def root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/login")
async def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@app.get("/requests")
async def requests_page(request: Request):
    return templates.TemplateResponse("requests.html", {"request": request})

@app.get("/inventory")
async def inventory_page(request: Request):
    return templates.TemplateResponse("inventory.html", {"request": request})