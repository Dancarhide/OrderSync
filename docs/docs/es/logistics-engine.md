---
sidebar_position: 5
title: Motor Autónomo de Despacho y Rutas
---

# OrderSync — Motor Autónomo de Despacho Logístico y Rutas de Alto Volumen

**Versión del Documento:** 1.0.0  
**Clasificación:** Especificación Técnica / Defensa de Proyecto  
**Última Actualización:** Septiembre 2026  
**Módulo:** Logística, Trazabilidad de Rutas y Despacho de Flota  
**Estándar de Cumplimiento:** ISO 27001:2022 / Lineamientos de APIs de Transportistas

---

## 1. Resumen Ejecutivo

En entornos de comercio electrónico de alto volumen que procesan cientos o miles de transacciones diarias a través de Shopify y Amazon, la actualización manual de guías de envío pedido por pedido resulta totalmente inviable.

El **Motor Autónomo de Logística y Rutas de OrderSync** resuelve esta problemática mediante una arquitectura de telemetría multi-nivel:
1. Un **Daemon de Despacho Automatizado en Segundo Plano** que sondea periódicamente y avanza los envíos activos a lo largo de los hitos reales de transporte.
2. Una **API de Sincronización Masiva Atómica** que permite a los supervisores de almacén despachar decenas o cientos de paquetes simultáneamente con consistencia ACID en una sola transacción.
3. Un **Simulador de Ráfagas Masivas** capaz de generar de 10 a 50 pedidos concurrentes distribuidos entre Shopify y Amazon para comprobar la resiliencia del sistema ante picos extremos de demanda.

---

## 2. Máquina de Estados del Ciclo de Vida de la Ruta

Cada despacho registrado en la base de datos PostgreSQL de OrderSync obedece a una máquina de estados determinista de 4 fases:

```
[ Fase 1: En Empaque ]
  └── Estado: 'processing'
  └── Título: 'Orden Recibida y en Empaque'
  └── Hito 1: Activo
            │
            ▼
[ Fase 2: En Tránsito ]
  └── Estado: 'in_transit'
  └── Título: 'Despachado en Ruta Troncal'
  └── Transportista: DHL Express / Amazon Logistics / FedEx
            │
            ▼
[ Fase 3: En Reparto Local ]
  └── Estado: 'out_for_delivery'
  └── Título: 'Asignado a Reparto de Última Milla'
  └── Ventana de Llegada: 'Hoy antes de las 18:00 hrs'
            │
            ▼
[ Fase 4: Entregado ]
  └── Estado: 'delivered'
  └── Indicador: is_delivered = true
  └── Registro Temporal: delivered_at = CURRENT_TIMESTAMP
  └── Título: 'Entregado y Confirmado al Destinatario'
```

---

## 3. Arquitectura del Motor y Componentes

### 3.1 Daemon Autónomo de Despacho en Segundo Plano
El daemon opera mediante un bucle de intervalo nativo en Node.js (`setInterval(..., 5000)`) gobernado por la variable de estado global `autoDispatchActive`.

```typescript
// Bucle del Motor de Despacho en Segundo Plano
setInterval(async () => {
  if (!autoDispatchActive) return;

  const pendientes = await pool.query(
    "SELECT id, current_step, checkpoints FROM shipments WHERE is_delivered = false ORDER BY updated_at ASC LIMIT 10"
  );

  for (const envio of pendientes.rows) {
    const siguientePaso = getNextTransitMilestone(envio.current_step);
    const entregado = siguientePaso === 'delivered';
    
    // Actualización atómica en Neon PostgreSQL
    const resActualizacion = await pool.query(...);
    
    // Notificación en tiempo real mediante WebSocket
    io.emit('SHIPMENT_UPDATED', resActualizacion.rows[0]);
  }
}, 5000);
```

### 3.2 API de Despacho Masivo de Alto Rendimiento (`POST /api/shipments/batch-advance`)
Diseñada para jefes de muelle de carga que requieren despachar un pallet completo o la carga de un camión transportista en un solo instante.
- **Alcance:** Actualiza hasta 100 envíos no entregados en una única consulta SQL atómica.
- **SLA de Latencia:** Procesamiento inferior a `< 150 ms` gracias al pooling de conexiones seguras de Neon PostgreSQL.
- **Emisión en Tiempo Real:** Emite el evento `SHIPMENTS_BATCH_UPDATED` a todos los clientes web activos, reflejando el nuevo estado de forma instantánea.

### 3.3 Simulador de Ráfagas Omnicanal de Alta Demanda (`POST /api/orders/simulate-batch`)
Emula eventos de tráfico masivo (como Black Friday o Prime Day):
- Genera ráfagas de 10 a 50 órdenes concurrentes distribuidas equitativamente entre Shopify (`#SHPF-XXXXX`) y Amazon (`AMZ-XXXXXX-XXXXX`).
- Selecciona dinámicamente productos reales del inventario central y descuenta existencias de forma atómica (`GREATEST(0, stock_quantity - 1)`).
- Cifra la información personal sintética de los clientes con **AES-256-GCM** y genera su respectiva guía en la tabla `shipments`.
- Notifica la finalización del lote a través del evento WebSocket `BATCH_SYNC_COMPLETED`.

---

## 4. Soporte Multi-Transportista

El motor incorpora nomenclaturas estandarizadas de rastreo y modelos logísticos representativos del mercado estadounidense:

| Transportista | Formato de Guía | Modelo Logístico Habitual | SLA de Entrega |
|---|---|---|---|
| **DHL Express** | `DHL-XXXX-XXXX-EXP` | Enlace Houston Gateway → Tránsito Internacional | 24 - 48 hrs |
| **Amazon Logistics** | `TBA-XXXX-XXXX-AMZ` | Centro de Surtido FBA → Prime Mismo Día / Día Siguiente | 12 - 24 hrs |
| **FedEx Express** | `FDX-XXXX-XXXX-USA` | Hub Regional Dallas → Tránsito Terrestre Comercial | 48 - 72 hrs |
| **Flota Houston Propia** | `HOU-FLEET-XXXX` | Entrega Urbana de Última Milla en Área Metropolitana | Mismo Día (< 8 hrs) |

---

## 5. Diseño Frontend para Alta Capacidad

El panel en Angular implementa controles de nivel empresarial para operar sobre cientos de pedidos sin degradar el rendimiento:
1. **Interruptor Dinámico en Vivo:** Badge visual parpadeante que indica en tiempo real si el motor autónomo está encendido o en pausa.
2. **Búsqueda Instantánea y Filtros:** Búsqueda por número de guía, orden o destino, complementada con filtros por fase de ruta (`Todos`, `Empaque`, `En Tránsito`, `En Reparto`, `Entregados`).
3. **Paginación Reactiva:** Navegación segmentada de 10 en 10 registros que previene la saturación del DOM de la página.
4. **Stepper Visual de 4 Segmentos:** Indicador de avance progresivo con animaciones suaves que reflejan el avance físico del paquete.
