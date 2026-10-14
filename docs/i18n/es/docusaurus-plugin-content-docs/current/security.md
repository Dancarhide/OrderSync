---
sidebar_position: 2
title: Seguridad y Cumplimiento
---

# OrderSync — Seguridad y Cumplimiento Normativo

**Versión del Documento:** 2.0.0  
**Clasificación:** Confidencial  
**Última Actualización:** Octubre 2026  
**Jurisdicción Principal:** Estado de Texas, EE. UU. (Houston Headquarters)  
**Estándares de Cumplimiento:** TDPSA | Texas Bus. & Com. Code Ch. 521 | ISO/IEC 27001:2022 | CCPA | FTC Safeguards

---

## 1. Descripción General

OrderSync está diseñado desde su base con una arquitectura orientada a la **seguridad primero (Security-by-Design)**. Al operar con sede central en **Houston, Texas**, la plataforma satisface rigurosamente los mandatos de:

1. **TDPSA (Texas Data Privacy and Security Act)** — En vigor desde el 1 de julio de 2024 (*Texas Business and Commerce Code § 541*).
2. **Texas Identity Theft Enforcement and Protection Act** (*Texas Business and Commerce Code Capítulo 521*).
3. **ISO/IEC 27001:2022** — Sistema de Gestión de Seguridad de la Información (SGSI).
4. Directrices de la **Comisión Federal de Comercio de EE. UU. (FTC)** y normativas interestatales equivalentes (como la CCPA de California).

---

## 2. Clasificación de Datos

| Categoría de Datos | Ejemplos | Clasificación | Nivel de Protección | Base Legal |
|---|---|---|---|---|
| **PII del Consumidor** | Nombre completo, dirección física, teléfono | **Confidencial** | Cifrado AES-256-GCM + IV aleatorio | TDPSA § 541.101 & Tex. Sec. 521.052 |
| **Metadatos Financieros** | Monto total, divisa, impuestos, estado de pago | **Interno** | Integridad ACID en Neon PostgreSQL | Retención fiscal 7 años (IRS & Texas Comptroller) |
| **Secretos Criptográficos** | Claves de cifrado AES de 256 bits, JWT Secret | **Restringido** | Variables de entorno / KMS / Auditoría de rotación | ISO 27001 Control A.8.24 |
| **Credenciales y Tokens** | Hashes de contraseñas, secretos TOTP | **Restringido** | `crypt()` con Blowfish (`bf`) / RFC 6238 Base32 | FTC Safeguards & Texas MFA Guidelines |
| **Pay-loads de Webhooks** | Payloads JSON de Shopify y Amazon | **Interno** | Firma HMAC-SHA256, deduplicación natural | Integridad de canal contra Replay Attacks |

---

## 3. Cifrado y Gestión Criptográfica (KMS)

### 3.1 Datos en Reposo — Cifrado a Nivel de Columna (AES-256-GCM)

Toda la Información de Identificación Personal (PII) se cifra en la capa de aplicación con **AES-256-GCM** antes de ser persistida en la base de datos PostgreSQL:

```
Buffer: [IV: 16 bytes] + [Tag de Autenticación: 16 bytes] + [Texto Cifrado]
```

* **Vector de Inicialización (IV):** 16 bytes criptográficamente aleatorios por cada campo cifrado, impidiendo ataques de análisis de frecuencias.
* **Tag de Autenticación:** 16 bytes que validan matemáticamente que los datos no han sufrido manipulación no autorizada.

### 3.2 Monitoreo y Auditoría de Rotación de Claves (KMS)

El servicio [`KeyManagementService`](file:///d:/Proyectos/OrderSync/backend/src/services/kms.service.ts) expone telemetría en tiempo real:

* **Endpoint:** `GET /api/security/key-status`
  * Valida longitud de 256 bits y entropía de la clave.
  * Genera huella digital enmascarada (`SHA256:...`) para trazabilidad sin revelar el secreto.
  * Verifica el control ISO 27001 **A.8.24** (*Use of Cryptography*).
* **Endpoint de Rotación:** `POST /api/security/rotate-keys`
  * Audita y registra la verificación periódica de claves requerida cada 90 días.

---

## 4. Marco de Texas: Derechos del Consumidor (TDPSA)

Conforme al **Texas Business and Commerce Code § 541.051**, los consumidores tienen derechos explícitos sobre su información personal. OrderSync proporciona endpoints y herramientas en el panel para responder a Solicitudes del Titular de los Datos (*Data Subject Requests - DSR*):

### 4.1 Derecho de Supresión y Olvido (Right to Erasure)

* **Endpoint:** `POST /api/customers/:id/anonymize`
* **Acción:** Reemplaza los datos personales cifrados con placeholders anonimizados (`ANONYMIZED_TDPSA_CONSUMER`, `REDACTED_PER_TEXAS_DATA_PRIVACY_ACT`, `000-000-0000`).
* **Exención Fiscal:** Conforme a TDPSA § 541.055, los identificadores del pedido y montos contables se preservan disociados para auditorías tributarias del Contralor de Cuentas Públicas de Texas.
* **Registro Inmutable:** Inserta un evento con tipo `TDPSA_RIGHT_TO_ERASURE` en `security_audit_logs`.

### 4.2 Derecho a la Portabilidad de Datos (Data Portability)

* **Endpoint:** `GET /api/customers/:id/export`
* **Acción:** Genera un paquete descargable en formato JSON legible por máquina que incluye:
  * Metadatos legales de la jurisdicción de Texas.
  * Perfil del cliente desencriptado para su entrega formal.
  * Historial consolidado de pedidos y artículos adquiridos.
  * Firma digital y checksum SHA-256 de verificación de autenticidad.

---

## 5. Protocolo de Notificación de Brechas de Texas (Sec. 521.053)

Bajo el **Texas Business & Commerce Code § 521.053** (*Notification Required Following Breach of Security of Computerized Data*):

* **Plazo Máximo:** Notificación a los afectados en el menor tiempo posible y a más tardar a los **60 días naturales** posteriores al descubrimiento de una brecha que involucre PII sensible.
* **Notificación al Fiscal General:** Obligatoria si la brecha involucra a **500 o más residentes de Texas**, a través del portal oficial del Procurador General de Texas (*Office of the Attorney General - OAG*).
* **Canal Directo:** Notificación gestionada por el Oficial de Privacidad (`privacy-officer@ordersync.app`).

---

## 6. Blindaje del Servidor Express (Cabeceras y Rate Limiting)

Para mitigar riesgos del **OWASP Top 10** y ataques de denegación de servicio (DoS):

### 6.1 Cabeceras de Seguridad con Helmet
* **HSTS (HTTP Strict Transport Security):** Fuerza conexiones exclusivas mediante TLS.
* **X-Content-Type-Options:** Previene ataques de MIME-type sniffing (`nosniff`).
* **X-Frame-Options:** Previene ataques de *Clickjacking* configurado en `SAMEORIGIN`.

### 6.2 Limitación de Tasa (Rate Limiting)
* **Protección contra Fuerza Bruta en Autenticación:**
  * Endpoint: `/api/login`
  * Límite: Máximo 20 intentos por IP cada 15 minutos. Superado el límite, se bloquea la IP temporalmente emitiendo respuesta HTTP 429.
* **Protección Global de API:**
  * Endpoints: `/api/*`
  * Límite: 600 solicitudes por cada 15 minutos por cliente.

---

## 7. Autenticación Multifactor (MFA / 2FA)

La plataforma implementa autenticación en dos factores basada en **TOTP (RFC 6238)** para administradores:

* **Algoritmo:** HMAC-SHA1 con ventana de tiempo de 30 segundos y tolerancia de drift de ±1 ciclo.
* **Generación de Secreto:** Cadenas de 160 bits en formato Base32 compatibles con Google Authenticator y Microsoft Authenticator.
* **Endpoints:**
  * `GET /api/auth/mfa/status`: Consulta el estado 2FA de la cuenta.
  * `POST /api/auth/mfa/setup`: Genera el secreto y la URL `otpauth://`.
  * `POST /api/auth/mfa/verify`: Valida el código de 6 dígitos y activa el blindaje.
  * `POST /api/auth/mfa/disable`: Desactiva 2FA previa confirmación.

---

## 8. Registro de Auditoría de Seguridad (Security Audit Trail)

Todos los eventos de seguridad se registran en la tabla `security_audit_logs` de PostgreSQL:

* **Control ISO 27001:** **A.8.15 (Logging)**.
* **Eventos Registrados:**
  * `TDPSA_RIGHT_TO_ERASURE`: Solicitudes de olvido ejecutadas.
  * `TDPSA_DATA_PORTABILITY_EXPORT`: Descargas de paquetes de portabilidad.
  * `KMS_KEY_ROTATION_AUDITED`: Auditorías de rotación de claves criptográficas.
  * `MFA_ACTIVATED` / `MFA_DISABLED`: Cambios en factores de autenticación.
* **Consulta:** Accesible en el panel de **Settings > Texas Security & TDPSA** mediante el endpoint `GET /api/security/audit-logs`.

---

## 9. Matriz de Cumplimiento Normativo

| Marco Regulatorio | Cláusula / Control | Implementación en OrderSync | Estado |
|---|---|---|---|
| **TDPSA** | Tex. Bus. & Com. Code § 541.051 | Endpoints de derecho al olvido y exportación de portabilidad en JSON | **Cumplido** |
| **Texas Code Ch. 521** | Tex. Bus. & Com. Code § 521.052 | Cifrado en reposo AES-256-GCM para toda PII | **Cumplido** |
| **Texas Code Ch. 521** | Tex. Bus. & Com. Code § 521.053 | Protocolo de notificación obligatoria en < 60 días al OAG | **Cumplido** |
| **ISO 27001:2022** | Anexo A.8.24 (Criptografía) | Claves de 256 bits, IV aleatorio por registro y KMS healthcheck | **Cumplido** |
| **ISO 27001:2022** | Anexo A.8.15 (Registro de Auditoría) | Tabla inmutable `security_audit_logs` con trazabilidad completa | **Cumplido** |
| **FTC Safeguards** | 16 CFR Part 314 | Autenticación multifactor TOTP y rate limiting contra fuerza bruta | **Cumplido** |
| **OWASP Top 10** | A01 / A02 / A07 | Helmet HTTP headers, RBAC con JWT y verificación HMAC de webhooks | **Mitigado** |
