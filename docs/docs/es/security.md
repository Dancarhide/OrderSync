---
sidebar_position: 2
title: Seguridad y Cumplimiento
---

# OrderSync — Seguridad y Cumplimiento Normativo

**Versión del Documento:** 1.0.0  
**Clasificación:** Confidencial  
**Última Actualización:** Septiembre 2026  
**Estándares de Cumplimiento:** ISO 27001:2022 | CCPA | Marco de Privacidad de EE. UU.

---

## 1. Descripción General

OrderSync está diseñado desde su base con una arquitectura orientada a la **seguridad primero**. Todos los componentes cumplen con el estándar **ISO/IEC 27001:2022** del Sistema de Gestión de Seguridad de la Información (SGSI), así como con las leyes de privacidad de EE. UU. aplicables, incluidas la **Ley de Privacidad del Consumidor de California (CCPA)** y las directrices de protección de datos de la Comisión Federal de Comercio (FTC) de los EE. UU.

Este documento describe los controles técnicos y procedimentales implementados para proteger la confidencialidad, integridad y disponibilidad de todos los datos procesados por la plataforma OrderSync.

---

## 2. Clasificación de Datos

| Categoría de Datos | Ejemplos | Clasificación | Nivel de Protección |
|---|---|---|---|
| PII del Cliente | Nombre completo, dirección, teléfono | **Confidencial** | Cifrado AES-256-GCM |
| Metadatos del Pedido | ID de pedido, canal, estado, monto | **Interno** | Controles de acceso estándar a BD |
| Secretos del Sistema | Claves de cifrado, credenciales de BD | **Restringido** | Solo Variables de Entorno |
| Payloads de Webhooks | Cuerpos POST crudos de Shopify/Amazon | **Interno** | Verificados por HMAC, Transitorios |

---

## 3. Cifrado

### 3.1 Datos en Reposo — Cifrado a Nivel de Columna (AES-256-GCM)

Toda la Información de Identificación Personal (PII) se cifra **en la capa de aplicación** antes de almacenarse en la base de datos. La extensión `pgcrypto` de PostgreSQL está habilitada como capa de seguridad adicional. El algoritmo de cifrado es **AES-256-GCM** (Estándar de Cifrado Avanzado con Modo Contador Galois), que proporciona tanto confidencialidad como autenticación de integridad de datos.

**Campos Cifrados (tabla `customers`):**

| Columna | Tipo de Dato | Protección |
|---|---|---|
| `encrypted_full_name` | `BYTEA` | AES-256-GCM |
| `encrypted_shipping_address` | `BYTEA` | AES-256-GCM |
| `encrypted_phone` | `BYTEA` | AES-256-GCM |

Cada valor cifrado se almacena como un buffer binario que contiene:
```
[IV: 16 bytes] + [Tag de Autenticación: 16 bytes] + [Texto cifrado]
```

El **Vector de Inicialización (IV)** se genera aleatoriamente para cada operación de cifrado, garantizando que los valores de texto plano idénticos produzcan textos cifrados diferentes.

### 3.2 Datos en Tránsito — TLS

Toda la comunicación entre los componentes del sistema utiliza **Seguridad de la Capa de Transporte (TLS)**:
- Endpoints de recepción de webhooks: Solo HTTPS.
- Conexiones de base de datos: Conexiones PostgreSQL cifradas con TLS.
- Conexiones WebSocket: WSS (WebSocket Seguro) en implementaciones de producción.

---

## 4. Gestión de Secretos

> **Política de cero credenciales codificadas.** No aparecen contraseñas, claves API, claves de cifrado ni cadenas de conexión de bases de datos en ningún lugar del código fuente ni en el historial de control de versiones.

Todos los secretos se inyectan en tiempo de ejecución a través de **variables de entorno**:

| Variable | Propósito |
|---|---|
| `DATABASE_URL` | Cadena de conexión de PostgreSQL |
| `ENCRYPTION_KEY` | Clave AES de 256 bits (codificada en hex, 64 caracteres) |
| `WEBHOOK_SECRET` | Secreto compartido HMAC-SHA256 para validación de webhooks |
| `NODE_ENV` | Entorno de la aplicación (`development` / `production`) |

En producción, estas variables deben gestionarse a través de un gestor de secretos dedicado (p. ej., **AWS Secrets Manager**, **HashiCorp Vault** o **Azure Key Vault**).

---

## 5. Seguridad de Webhooks

### 5.1 Verificación de Firma HMAC-SHA256

Cada solicitud de webhook entrante se autentica antes de que se realice cualquier procesamiento. El backend calcula un resumen HMAC-SHA256 del cuerpo de la solicitud sin procesar usando el `WEBHOOK_SECRET` compartido y lo compara con el encabezado `x-webhook-signature` proporcionado por el remitente.

```
HMAC-SHA256(WEBHOOK_SECRET, cuerpo_crudo) === x-webhook-signature
```

Las solicitudes con firmas inválidas o ausentes se rechazan con HTTP `401 No Autorizado`.

### 5.2 Idempotencia y Deduplicación

Para prevenir registros de pedidos duplicados por ataques de repetición o reintentos de red, todos los endpoints de webhooks aplican **idempotencia estricta** usando el `external_order_id` como clave de deduplicación natural. Si ya existe un pedido con ese ID en la base de datos, el sistema devuelve HTTP `200 OK` sin volver a procesar, y no se crea ningún registro duplicado.

---

## 6. Control de Acceso

| Capa | Mecanismo de Control |
|---|---|
| Red | Aislamiento de red de Docker entre contenedores |
| Base de Datos | Cuenta de servicio dedicada con acceso de mínimo privilegio |
| API | Firma HMAC por fuente de webhook |
| Interfaz de Usuario | Enmascaramiento de PII (visualización enmascarada: `J*** S*** [Cifrado]`) |

---

## 7. Registro de Auditoría

El sistema registra los siguientes eventos con fines de seguimiento de auditoría, alineado con el control **A.8.15 (Registro)** del Anexo A de ISO 27001:
- Cada solicitud de webhook entrante (marca de tiempo, canal, ID de pedido, estado HTTP devuelto).
- Cada transacción de escritura en la base de datos (creación de pedido, éxito/fallo del cifrado).
- Todos los eventos de conexión y desconexión de WebSocket.

---

## 8. Resumen de Cumplimiento

| Estándar | Estado | Notas |
|---|---|---|
| **ISO 27001:2022** | Cumplido | Controles SGSI implementados: A.8.3, A.8.11, A.8.15, A.8.24 |
| **CCPA** | Cumplido | PII cifrado y con control de acceso |
| **Directrices de Protección de Datos de la FTC** | Cumplido | Sin PII almacenado en texto plano |
| **OWASP Top 10** | Mitigado | Inyección, fallos criptográficos y mala configuración de seguridad abordados |
