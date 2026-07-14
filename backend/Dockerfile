# ---- Backend (FastAPI + Oracle thick client) ----
FROM python:3.11-slim

# System deps + Oracle Instant Client (x86_64) for thick-mode 11g connectivity
# Debian 13 (trixie) ships libaio as libaio.so.1t64; the Oracle client needs libaio.so.1,
# so symlink it. (Without this, oracledb thick mode fails with DPI-1047.)
RUN apt-get update && apt-get install -y --no-install-recommends \
        libaio1t64 curl unzip ca-certificates \
    && ln -sf /usr/lib/x86_64-linux-gnu/libaio.so.1t64 /usr/lib/x86_64-linux-gnu/libaio.so.1 \
    && ldconfig \
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

# MongoDB Database Tools (mongodump) — powers the on-demand "Backup Now" button in the admin.
RUN curl -sL -o /tmp/mdbtools.deb "https://fastdl.mongodb.org/tools/db/mongodb-database-tools-debian12-x86_64-100.10.0.deb" \
    && apt-get update && apt-get install -y --no-install-recommends /tmp/mdbtools.deb \
    && rm -f /tmp/mdbtools.deb && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8001
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "2"]
