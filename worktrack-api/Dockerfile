# ============================================================
# WorkTrack API - Dockerfile (multi-stage)
# ============================================================

# ─── Stage 1 : Build des dépendances ─────────────────────
FROM python:3.12-slim AS builder

WORKDIR /app

# Dépendances système pour asyncpg et bcrypt
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# ─── Stage 2 : Image finale ───────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# Dépendances runtime uniquement
RUN apt-get update && apt-get install -y libpq5 && rm -rf /var/lib/apt/lists/*

# Copier les dépendances installées
COPY --from=builder /root/.local /root/.local

# Copier le code source
COPY . .

# S'assurer que les scripts sont dans le PATH
ENV PATH=/root/.local/bin:$PATH

# Utilisateur non-root pour la sécurité
RUN useradd -m -u 1000 worktrack
USER worktrack

EXPOSE 8000

# Démarrage avec uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
