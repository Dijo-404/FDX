FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 FDX_DEVICE=cpu
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*
COPY face-processing/ml/requirements-local.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt onnxruntime==1.21.1
COPY tools/native_accurate_backend.py /app/tools/native_accurate_backend.py
COPY face-processing/ml/assets /app/face-processing/ml/assets
CMD ["python", "/app/tools/native_accurate_backend.py"]
