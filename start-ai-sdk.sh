#!/bin/bash
# Start Denodo AI SDK on port 8008

echo "Starting Denodo AI SDK..."
cd denodo-ai-sdk
python -m uvicorn api.main:app --host 0.0.0.0 --port 8008
