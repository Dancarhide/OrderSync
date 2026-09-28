---
sidebar_position: 7
title: Suite de Gestión Empresarial
---

# OrderSync — Suite de Gestión Empresarial (ERP/OMS)

**Versión del Documento:** 1.0.0  
**Clasificación:** Arquitectura Funcional y Flujos Operativos  
**Última Actualización:** Septiembre 2026  
**Módulo:** Inventario, Proveedores, Clientes y Seguridad de Usuarios (RBAC)  
**Estándar de Cumplimiento:** ISO 27001:2022 / Control de Acceso Basado en Roles

---

## 1. Resumen Ejecutivo

Para trascender de un simple monitor de eventos y actuar como un auténtico **Sistema de Gestión de Pedidos Empresarial (OMS)** y núcleo liviano de **Planificación de Recursos Empresariales (ERP)**, OrderSync incorpora cuatro módulos integrados:
1. **Inventario Central Unificado:** Deducción atómica multi-canal y registro dinámico de nuevos SKUs.
2. **Directorio Estratégico de Proveedores:** Gestión de la cadena de suministro, tiempos de entrega y órdenes de compra automáticas.
3. **Registro de Clientes con Cifrado ISO 27001:** Almacenamiento a nivel de columna con enmascaramiento por roles para salvaguarda de datos personales.
4. **Control de Acceso Basado en Roles (RBAC):** Privilegios diferenciados que aseguran que solo Administradores autorizados puedan crear cuentas en el sistema.

---

## 2. Inventario Central Unificado (Inventario Central)

OrderSync mantiene una base de datos central de catálogo sincronizada en tiempo real entre todos los canales:

### 2.1 Deducción Atómica de Stock
Al confirmarse una orden en Shopify o Amazon, el backend ejecuta una deducción SQL protegida:
```sql
UPDATE inventory 
SET stock_quantity = GREATEST(0, stock_quantity - $1),
    updated_at = CURRENT_TIMESTAMP
WHERE sku = $2
RETURNING *;
```
Esto elimina cualquier condición de carrera y asegura que el stock nunca sea negativo incluso durante ráfagas de compras simultáneas.

### 2.2 Registro Dinámico de SKUs y Productos (`POST /api/inventory`)
Permite al personal registrar nuevos productos directamente desde el panel:
- **Campos:** Código SKU, Nombre de Producto, Existencias Iniciales, Proveedor Asignado, Costo Unitario ($) y Precio de Venta ($).
- **Validación:** Conversión automática a mayúsculas y control de duplicidad de SKUs.
- **Ingesta Inmediata:** Los productos recién guardados quedan listos de inmediato para ser consumidos por simulaciones de venta.

---

## 3. Directorio de Proveedores y Cadena de Suministro

Gestiona los socios estratégicos que abastecen el inventario del almacén:

| Nombre del Proveedor | Categoría Principal | Sede Central | Tiempo de Entrega | Calificación de Confiabilidad | Acción |
|---|---|---|---|---|---|
| **Apex Global Electronics** | Cómputo y Periféricos | EE. UU. (Texas) | 3 días | 4.8 / 5.0 | Solicitar Surtido (+25) |
| **Shenzhen Acoustic Labs** | Audio y Dispositivos Inalámbricos | China | 7 días | 4.6 / 5.0 | Solicitar Surtido (+25) |
| **Nordic Ergonomic Gear** | Mobiliario Ergonómico | Suecia | 5 días | 4.9 / 5.0 | Solicitar Surtido (+25) |
| **Pacific Rim Componentes** | Fuentes y Cables de Alimentación | Taiwán | 4 días | 4.7 / 5.0 | Solicitar Surtido (+25) |

Los operadores pueden solicitar reabastecimiento directo con un clic, generando una orden de compra que eleva las existencias en inventario.

---

## 4. Directorio de Clientes y Cifrado ISO 27001

La información de identificación personal (PII) de los compradores se maneja con estricto apego a normas internacionales de privacidad (CCPA / GDPR):

### 4.1 Seguridad de Almacenamiento
- **Algoritmo Criptográfico:** Cifrado a nivel de aplicación **AES-256-GCM** con vector de inicialización (IV) y etiqueta de autenticación (auth tag).
- **Almacenamiento en Base de Datos:** Los nombres, domicilios y teléfonos se almacenan como cadenas binarias (`BYTEA`).

### 4.2 Enmascaramiento por Roles
- **Operadores Estándar:** Visualizan identidades ofuscadas por defecto (`C*** M*** [Cifrado]`, `*** Houston, TX ***`, `+1-***-***-****`).
- **Administradores:** Tienen a su disposición el botón "Descifrar Datos Autorizados", que desbloquea temporalmente los datos claros con fines de auditoría y soporte.

---

## 5. Control de Acceso Basado en Roles (RBAC) y Seguridad

OrderSync aplica una jerarquía administrativa estricta:

```
┌────────────────────────────────────────────────────────┐
│              Control de Acceso Basado en Roles         │
├──────────────────────────┬─────────────────────────────┤
│    Rol Administrador     │        Rol Operador         │
├──────────────────────────┼─────────────────────────────┤
│ • Acceso total al panel  │ • Rastreo de pedidos en vivo│
│ • Crear usuarios nuevos  │ • Visualización de stock    │
│ • Asignar roles (RBAC)   │ • Avance y control de rutas │
│ • Descifrar datos PII    │ • Vista de clientes ofuscada│
│ • Configurar credenciales│ • Creación de cuentas: NO   │
└──────────────────────────┴─────────────────────────────┘
```

Solo los usuarios autenticados con rol **Administrador** pueden acceder al formulario de alta de cuentas y ejecutar `POST /api/users`. Cualquier intento no autorizado es rechazado de inmediato con `HTTP 403 Forbidden`.
