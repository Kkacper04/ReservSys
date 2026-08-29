#!/bin/bash
set -e

echo "Initializing and seeding database..."
python seed.py

echo "Starting FastAPI server..."
exec uvicorn main:app --host 0.0.0.0 --port 8000
