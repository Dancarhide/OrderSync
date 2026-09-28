# OrderSync - Omnichannel Logistics & Order Synchronization Engine

OrderSync es una plataforma integral de sincronización y orquestación logística de órdenes multicanal (Shopify, ERP, etc.) diseñada con estándares de seguridad **ISO 27001** y especificación de requerimientos de software **ISO 29148**.

---

## 🚀 Arquitectura y Tecnologías

- **Frontend:**
  - Angular 19 (Standalone Components, SSR ready)
  - Tailwind CSS & Heroicons
  - Internacionalización i18n (Español / English)
  - Dashboard analítico con KPIs, métricas de rendimiento y vista satelital/logística
- **Backend:**
  - Node.js & Express con TypeScript
  - Cifrado de datos PII con **AES-256-GCM**
  - Autenticación JWT y control de acceso basado en roles (RBAC)
  - Ingestión de webhooks con firma criptográfica HMAC y deduplicación
- **Base de Datos:**
  - PostgreSQL gestionado en la nube con **Neon Serverless Postgres**
  - Pooler de conexiones y migraciones estructuradas
- **DevOps & Seguridad:**
  - Docker & Docker Compose
  - GitHub Actions CI/CD con análisis SAST (CodeQL) y aserción de latencia
  - Documentación técnica con Docusaurus

---

## 📁 Estructura del Proyecto

```text
OrderSync/
├── .github/workflows/    # Pipelines de CI/CD (Build, Test, SAST CodeQL)
├── backend/              # API REST Express + TypeScript + Neon Postgres
│   ├── src/controllers/  # Controladores de autenticación y webhooks
│   ├── src/services/     # Cifrado AES-256-GCM y lógica de negocio
│   └── .env.example      # Plantilla de variables de entorno
├── database/             # Scripts SQL y migraciones de esquema
├── docs/                 # Documentación técnica Docusaurus (i18n ES/EN)
├── frontend/             # SPA Angular 19 + Tailwind CSS
└── docker-compose.yml    # Orquestación de contenedores
```

---

## 🛠️ Puesta en Marcha Local

### Prerrequisitos
- Node.js >= 18.x
- npm >= 9.x

### 1. Backend
```bash
cd backend
cp .env.example .env    # Configura tus credenciales de Neon Postgres y JWT
npm install
npm run dev
```
El servidor backend se ejecutará en `http://localhost:3000`.

### 2. Frontend
```bash
cd frontend
npm install
npm start
```
La aplicación cliente se ejecutará en `http://localhost:4200`.

### 3. Documentación
```bash
cd docs
npm install
npm start
```

---

## 🔒 Seguridad y Cumplimiento
- **ISO 27001:** Protección de PII (Personally Identifiable Information) mediante clave simétrica AES-256-GCM y hashes criptográficos de contraseñas.
- **Validación de Webhooks:** Verificación de integridad con HMAC-SHA256 para evitar spoofing o repetición de payloads de Shopify.
- **Escaneo Continuo de Código:** GitHub Actions ejecuta CodeQL en cada Pull Request y push a la rama principal.

---

## 📄 Licencia
Privado / Propietario. Todos los derechos reservados.
