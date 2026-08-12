FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 FDX_DEVICE=cpu ML_WARMUP_ON_IMPORT=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*
COPY face-processing/service/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt onnxruntime==1.21.1
COPY tools/native_accurate_backend.py /app/tools/native_accurate_backend.py
COPY face-processing/service/assets /app/face-processing/service/assets
CMD ["gunicorn", "--bind", "0.0.0.0:3000", "--workers", "1", "--threads", "4", "--timeout", "300", "--graceful-timeout", "30", "--access-logfile", "-", "--error-logfile", "-", "tools.native_accurate_backend:app"]
