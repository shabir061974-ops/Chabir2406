# ---- Backend (FastAPI + Oracle thick client) ----
FROM python:3.11-slim

# System deps + Oracle Instant Client (x86_64) for thick-mode 11g connectivity
RUN apt-get update && apt-get install -y --no-install-recommends \
        libaio1 curl unzip ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Oracle Instant Client 19 (Basic Lite) for x86_64.
# NOTE: This image targets x86_64 Hostinger VPS. For ARM VPS, swap the URL to the linux.arm64 build.
RUN mkdir -p /opt/oracle \
    && curl -sL -o /tmp/ic.zip "https://download.oracle.com/otn_software/linux/instantclient/1928000/instantclient-basiclite-linux.x64-19.28.0.0.0dbru.zip" \
    && unzip -oq /tmp/ic.zip -d /opt/oracle \
    && rm /tmp/ic.zip \
    && echo /opt/oracle/instantclient_19_28 > /etc/ld.so.conf.d/oracle-instantclient.conf \
    && ldconfig

ENV ORA_CLIENT_LIB=/opt/oracle/instantclient_19_28

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8001
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "2"]
