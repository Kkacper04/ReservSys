FROM python:3.11-slim

WORKDIR /app

# Install system dependencies required for PostgreSQL (psycopg2)
RUN apt-get update && apt-get install -y gcc libpq-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN groupadd --system appuser && useradd --system --gid appuser --create-home appuser

COPY --chown=appuser:appuser . .

# Copy and set execution permissions for the entrypoint script
COPY --chown=appuser:appuser entrypoint.sh .
RUN chmod +x entrypoint.sh && chown -R appuser:appuser /app

USER appuser

ENTRYPOINT ["./entrypoint.sh"]
