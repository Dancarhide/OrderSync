---
sidebar_position: 4
title: DevOps y Despliegue
---

# OrderSync — Guía de DevOps y Despliegue

**Versión del Documento:** 1.0.0  
**Clasificación:** Interna  
**Última Actualización:** Septiembre 2026  
**Entorno Objetivo:** Contenedores Linux/Windows mediante Docker

---

## 1. Descripción General

OrderSync se entrega como una aplicación completamente contenedorizada usando **Docker** y **Docker Compose**. El pipeline de CI/CD se gestiona a través de **GitHub Actions** e incluye verificación automatizada de compilación, aserciones de latencia de webhooks de extremo a extremo, y Pruebas de Seguridad de Aplicaciones Estáticas (SAST) mediante **CodeQL**.

---

## 2. Prerrequisitos

Antes de desplegar OrderSync, asegúrese de que las siguientes herramientas estén instaladas en el servidor host:

| Herramienta | Versión Mínima | Propósito |
|---|---|---|
| Docker | 24.0+ | Motor de contenedores |
| Docker Compose | 2.0+ (Plugin V2) | Orquestación multi-contenedor |
| Node.js | 20 LTS | Solo para desarrollo local |
| Git | 2.40+ | Control de versiones |

---

## 3. Variables de Entorno

Todos los secretos y valores de configuración se inyectan a través de variables de entorno. **Nunca confirme estos valores en el control de versiones.**

Cree un archivo `.env` en la raíz del proyecto para el desarrollo local:

```env
# Base de Datos
POSTGRES_USER=postgres
POSTGRES_PASSWORD=su_contraseña_segura_aquí
POSTGRES_DB=ordersync

# Backend
DATABASE_URL=postgres://postgres:su_contraseña_segura_aquí@postgres:5432/ordersync
NODE_ENV=development
PORT=3000
WEBHOOK_SECRET=su_secreto_hmac_aquí

# Cifrado — debe ser exactamente 64 caracteres hexadecimales (32 bytes = clave de 256 bits)
ENCRYPTION_KEY=su_clave_hex_256bit_aquí
```

> **Nota de Seguridad:** En producción, use un gestor de secretos dedicado (AWS Secrets Manager, HashiCorp Vault o Azure Key Vault) e inyecte las variables en tiempo de ejecución. No use archivos `.env` en producción.

---

## 4. Ejecución Local con Docker Compose

### 4.1 Compilar e Iniciar Todos los Servicios

```bash
docker-compose up -d --build
```

Este comando:
1. Descargará la imagen base `postgres:15-alpine`.
2. Compilará la imagen Node.js del backend desde `backend/Dockerfile`.
3. Compilará la imagen Angular del frontend desde `frontend/Dockerfile`.
4. Iniciará los tres contenedores con verificaciones de estado y orden de dependencias correctos.

### 4.2 Verificar que los Servicios Estén Corriendo

```bash
docker-compose ps
```

Salida esperada:

| NOMBRE | ESTADO | PUERTOS |
|---|---|---|
| `ordersync-postgres` | running (healthy) | 0.0.0.0:5432->5432/tcp |
| `ordersync-backend` | running | 0.0.0.0:3000->3000/tcp |
| `ordersync-frontend` | running | 0.0.0.0:4200->4200/tcp |

### 4.3 Acceder a la Aplicación

| Servicio | URL |
|---|---|
| **Panel Angular** | http://localhost:4200 |
| **API Backend** | http://localhost:3000 |
| **Verificación de Salud** | http://localhost:3000/health |

### 4.4 Detener Todos los Servicios

```bash
docker-compose down
```

Para eliminar también el volumen de datos persistente de PostgreSQL:
```bash
docker-compose down -v
```

---

## 5. Pipeline CI/CD (GitHub Actions)

El pipeline en `.github/workflows/ci-cd-pipeline.yml` se ejecuta automáticamente en cada **Pull Request** y **Push a `main`**.

### 5.1 Etapas del Pipeline

```
PR / Push a main
       │
       ├─── 1. build-and-test ──► Compilar Backend (tsc) + Compilar Frontend (ng build)
       │
       ├─── 2. sast-scan ────────► Análisis CodeQL (JavaScript/TypeScript)
       │
       └─── 3. webhook-latency ──► Iniciar Backend + Ejecutar Simulador + Verificar Respuesta
```

### 5.2 Detalle de Etapas

**Etapa 1 — Compilación y Pruebas:**
- Instala las dependencias para `backend/` y `frontend/`.
- Compila el backend TypeScript (`npm run build`).
- Compila el frontend Angular (`npm run build`).
- Falla el pipeline si alguna compilación produce errores.

**Etapa 2 — Escaneo de Seguridad SAST:**
- Ejecuta el motor de análisis estático **CodeQL** de GitHub contra todos los archivos fuente de JavaScript y TypeScript.
- Detecta vulnerabilidades como: inyección SQL, criptografía insegura, contaminación de prototipos y travesía de rutas.
- Los resultados aparecen en la pestaña **Security > Code Scanning** del repositorio de GitHub.

**Etapa 3 — Aserción de Latencia de Webhooks:**
- Levanta una instancia real de PostgreSQL como contenedor de servicio de GitHub Actions.
- Ejecuta el script de migración de base de datos (`001_initial_schema.sql`).
- Inicia el servidor backend y ejecuta el simulador de compras (`npm run simulate:purchase`).
- Verifica que el webhook se procese exitosamente, validando el pipeline completo de extremo a extremo.

---

## 6. Migraciones de Base de Datos

Las migraciones del esquema de base de datos se encuentran en `database/migrations/`. Se ejecutan automáticamente cuando el contenedor Docker de PostgreSQL se inicia por primera vez (montadas a través de `/docker-entrypoint-initdb.d/`).

| Archivo | Descripción |
|---|---|
| `001_initial_schema.sql` | Crea las tablas `orders`, `customers`, `order_items` y habilita `pgcrypto`. |

Para migraciones posteriores, agregue nuevos archivos SQL numerados (p. ej., `002_add_index.sql`) y aplíquelos manualmente o a través de una herramienta de migración como `Flyway` o `node-pg-migrate`.

---

## 7. Monitoreo y Observabilidad

OrderSync incorpora una suite completa de observabilidad y telemetría diseñada para entornos Kubernetes, Prometheus, Datadog y paneles de control SRE:

### 7.1 Sondas de Producción y Endpoints de Métricas

| Endpoint | Protocolo / Formato | Propósito | Estado Esperado |
|---|---|---|---|
| `GET /health` | JSON | SLA integral, latencia ping a base de datos, memoria del proceso y tiempo activo | `200 OK` (o `503 Service Unavailable`) |
| `GET /ready` | JSON | Sonda de Disponibilidad Kubernetes (Validación `SELECT 1;` contra PostgreSQL) | `200 OK` |
| `GET /live` | JSON | Sonda de Vida Kubernetes (Respuesta activa del kernel Node.js) | `200 OK` |
| `GET /metrics` | Prometheus (RFC 0.0.4) | Exposición estandarizada de métricas para scraping por Prometheus / Grafana | `200 OK` |
| `GET /api/devops/telemetry` | JSON | Reporte de telemetría en tiempo real consumido por la Consola de Administración Angular | `200 OK` |
| `POST /api/devops/ping-db` | JSON | Benchmark en tiempo real de latencia ida y vuelta contra PostgreSQL | `200 OK` |
| `GET /api/devops/logs` | JSON | Flujo en vivo de eventos recientes del runtime y auditoría de seguridad ISO 27001 | `200 OK` |

### 7.2 Exposición de Métricas Prometheus (`GET /metrics`)

Las siguientes métricas estandarizadas se exportan en `/metrics`:
```promql
ordersync_uptime_seconds            # Tiempo total de actividad del servicio en segundos
ordersync_memory_rss_bytes          # Memoria física ocupada (Resident Set Size)
ordersync_memory_heap_used_bytes    # Memoria Heap utilizada por V8
ordersync_database_ping_latency_ms  # Duración ida y vuelta de consulta contra PostgreSQL
ordersync_database_pool_total       # Total de conexiones en el pool
ordersync_database_pool_idle        # Conexiones inactivas disponibles
ordersync_webhook_requests_total    # Contador de webhooks procesados
ordersync_webhook_avg_latency_ms    # Tiempo promedio de sincronización de extremo a extremo
ordersync_websocket_clients_active  # Clientes Socket.io activos conectados en tiempo real
ordersync_health_status             # Estado binario de salud (1=saludable, 0=degradado/caído)
```

### 7.3 Integraciones de Monitoreo Empresarial

| Herramienta | Propósito |
|---|---|
| **Prometheus / Grafana** | Scraping de métricas vía `/metrics` y tableros con alertas |
| **Datadog / New Relic** | APM, rastreo distribuido de peticiones y tasas de error |
| **PagerDuty** | Notificaciones críticas cuando la latencia supera el SLA de 500 ms |
| **Sentry** | Detección y rastreo de excepciones no controladas en el backend |
| **AWS CloudWatch / GCP Monitoring** | Métricas a nivel de servidor y contenedores |

---

## 8. Portal de Documentación Técnica (Docusaurus)

OrderSync incluye un portal de documentación empresarial integrado construido con **Docusaurus v3**, con soporte nativo bilingüe (Inglés / Español) y exportación a PDF:

### 8.1 Ejecución Local de la Documentación
```bash
# Desde la raíz del proyecto
cd docs
npm start
```
El portal de documentación iniciará en `http://localhost:3001` (o el siguiente puerto disponible).

### 8.2 Alternancia de Idiomas en Docusaurus
- Idioma predeterminado en inglés: `http://localhost:3001/`
- Idioma en español para Latinoamérica: `http://localhost:3001/es/`
- Los usuarios pueden alternar dinámicamente mediante el selector desplegable en la barra de navegación superior.

### 8.3 Compilación Estática para Producción
```bash
cd docs
npm run build
```
Genera un paquete estático optimizado bajo `docs/build/` listo para su alojamiento en GitHub Pages, Cloudflare Pages o AWS S3.
