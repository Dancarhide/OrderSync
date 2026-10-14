import { Request, Response } from 'express';
import crypto from 'crypto';
import { Pool } from 'pg';
import { Server } from 'socket.io';
import { EncryptionService } from '../services/encryption.service';
import { DevOpsService } from '../services/devops.service';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'secret';
const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET || process.env.SHOPIFY_APP_SECRET || '';

interface NormalizedCustomer {
  full_name: string;
  shipping_address: string;
  phone_number: string;
  phone?: string;
}

interface NormalizedItem {
  sku: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

interface NormalizedOrder {
  external_order_id: string;
  channel: 'Shopify' | 'Amazon';
  status: string;
  total_amount: number;
  currency: string;
  customer: NormalizedCustomer;
  items: NormalizedItem[];
}

/**
 * Normalizes either a native Shopify webhook (orders/create) or a generic OrderSync payload.
 */
function normalizePayload(req: Request, channel: 'Shopify' | 'Amazon'): NormalizedOrder {
  const b = req.body || {};

  // Case 1: Real Shopify Webhook payload (has line_items, name or order_number)
  if (b.line_items || b.order_number || b.financial_status) {
    const orderNum = b.name ? b.name : (b.order_number ? `#${b.order_number}` : `SHP-${b.id || Date.now()}`);
    const total = parseFloat(b.current_total_price || b.total_price || '0');
    const currency = b.currency || 'USD';
    const status = b.financial_status || 'paid';

    // Extract customer
    let fullName = 'Customer';
    if (b.shipping_address && (b.shipping_address.name || b.shipping_address.first_name)) {
      fullName = b.shipping_address.name || `${b.shipping_address.first_name || ''} ${b.shipping_address.last_name || ''}`.trim();
    } else if (b.customer) {
      fullName = `${b.customer.first_name || ''} ${b.customer.last_name || ''}`.trim() || b.customer.email || 'Customer';
    }

    let shippingAddress = 'Houston, TX';
    if (b.shipping_address) {
      const parts = [
        b.shipping_address.address1,
        b.shipping_address.city,
        b.shipping_address.province,
        b.shipping_address.zip,
        b.shipping_address.country
      ].filter(Boolean);
      if (parts.length > 0) shippingAddress = parts.join(', ');
    }

    const phone = b.shipping_address?.phone || b.customer?.phone || '+1-555-0100';

    // Extract line items
    const items: NormalizedItem[] = (b.line_items || []).map((li: any) => ({
      sku: li.sku || `SKU-${li.id}`,
      product_name: li.title || li.name || 'Shopify Product',
      quantity: Number(li.quantity) || 1,
      unit_price: parseFloat(li.price || '0')
    }));

    return {
      external_order_id: String(orderNum),
      channel: 'Shopify',
      status,
      total_amount: total,
      currency,
      customer: {
        full_name: fullName,
        shipping_address: shippingAddress,
        phone_number: phone,
        phone: phone
      },
      items
    };
  }

  // Case 2: Generic OrderSync Payload (used by simulator and default tests)
  return {
    external_order_id: b.external_order_id || `ORD-${Date.now()}`,
    channel,
    status: b.status || 'pending',
    total_amount: parseFloat(b.total_amount || '0'),
    currency: b.currency || 'USD',
    customer: {
      full_name: b.customer?.full_name || 'Jane Doe',
      shipping_address: b.customer?.shipping_address || '123 Main St, Houston, TX 77001',
      phone_number: b.customer?.phone_number || b.customer?.phone || '+1-555-019-8372',
      phone: b.customer?.phone || b.customer?.phone_number || '+1-555-019-8372'
    },
    items: (b.items || []).map((item: any) => ({
      sku: item.sku || `SKU-${Date.now()}`,
      product_name: item.product_name || 'Item',
      quantity: Number(item.quantity) || 1,
      unit_price: parseFloat(item.unit_price || '0')
    }))
  };
}

/**
 * Validates HMAC signature for both Shopify and Generic formats.
 */
function verifyHmacSignature(req: Request, rawPayload: string, channel: string): boolean {
  const shopifyHeader = (req.headers['x-shopify-hmac-sha256'] || req.headers['X-Shopify-Hmac-Sha256']) as string;
  const genericHeader = req.headers['x-webhook-signature'] as string;

  // 1. Shopify official verification: Base64 digest using SHOPIFY_WEBHOOK_SECRET or SHOPIFY_APP_SECRET
  if (shopifyHeader) {
    const secretsToTry = [SHOPIFY_WEBHOOK_SECRET, process.env.SHOPIFY_APP_SECRET].filter(Boolean) as string[];
    for (const secret of secretsToTry) {
      const calculated = crypto.createHmac('sha256', secret).update(rawPayload, 'utf8').digest('base64');
      if (calculated === shopifyHeader) {
        return true;
      }
    }
  }

  // 2. Generic HMAC verification: Hex digest using WEBHOOK_SECRET
  if (genericHeader) {
    const calculated = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawPayload, 'utf8').digest('hex');
    if (calculated === genericHeader) {
      return true;
    }
  }

  // Allow bypass only in development mode if no signature header is provided
  if (process.env.NODE_ENV === 'development' && !shopifyHeader && !genericHeader) {
    return true;
  }

  return false;
}

export const handleWebhook = (io: Server) => async (req: Request, res: Response): Promise<void> => {
  const t1 = Date.now();
  const channel: 'Shopify' | 'Amazon' = req.path.includes('shopify') ? 'Shopify' : 'Amazon';

  const rawPayload = (req as any).rawBody || JSON.stringify(req.body);

  // 1. Verify HMAC Signature
  const isValid = verifyHmacSignature(req, rawPayload, channel);
  if (!isValid && process.env.NODE_ENV !== 'development') {
    res.status(401).json({ error: 'Invalid HMAC signature' });
    return;
  }

  // Intercept Shopify Refund Webhook (X-Shopify-Topic: refunds/create or payload with refund_line_items)
  const topic = (req.headers['x-shopify-topic'] || req.headers['X-Shopify-Topic'] || '') as string;
  if (topic === 'refunds/create' || req.body?.refund_line_items) {
    return processShopifyRefundPayload(io, req.body, res);
  }

  // Intercept Shopify Fulfillment / Shipment Status Webhooks (fulfillments/create, fulfillments/update, orders/fulfilled, orders/updated)
  if (
    topic.startsWith('fulfillments/') || 
    topic === 'orders/fulfilled' || 
    (topic === 'orders/updated' && (req.body?.fulfillment_status === 'fulfilled' || req.body?.fulfillments?.length > 0))
  ) {
    return processShopifyFulfillmentPayload(io, req.body, topic, res);
  }

  // 2. Normalize payload
  const orderData = normalizePayload(req, channel);
  const { external_order_id, status, total_amount, currency, customer, items } = orderData;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 3. Check Idempotency (Prevent duplicate orders and duplicate stock deduction - SRS Criterio 3)
    const existingOrder = await client.query('SELECT id FROM orders WHERE external_order_id = $1', [external_order_id]);
    if (existingOrder.rows.length > 0) {
      await client.query('ROLLBACK');
      res.status(200).json({ message: 'Order already synced (idempotent)' });
      return;
    }

    // 4. Insert Order
    const orderRes = await client.query(
      `INSERT INTO orders (external_order_id, channel, status, total_amount, currency)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [external_order_id, channel, status, total_amount, currency]
    );
    const orderId = orderRes.rows[0].id;

    // 5. Encrypt and Insert Customer PII (ISO 27001 AES-256-GCM)
    const encName = EncryptionService.encrypt(customer.full_name);
    const encAddress = EncryptionService.encrypt(customer.shipping_address);
    const encPhone = EncryptionService.encrypt(customer.phone_number);

    await client.query(
      `INSERT INTO customers (order_id, encrypted_full_name, encrypted_shipping_address, encrypted_phone)
       VALUES ($1, $2, $3, $4)`,
      [orderId, encName, encAddress, encPhone]
    );

    // 6. Insert Order Items & Update Unified Inventory Stock (RFS-03)
    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, sku, product_name, quantity, unit_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, item.sku, EncryptionService.encryptString(item.product_name), item.quantity, item.unit_price]
      );

      // Deduct stock from inventory table atomically to avoid overselling
      await client.query(
        `INSERT INTO inventory (sku, product_name, stock_quantity)
         VALUES ($1, $2, 0)
         ON CONFLICT (sku) DO UPDATE 
         SET stock_quantity = GREATEST(0, inventory.stock_quantity - $3),
             updated_at = CURRENT_TIMESTAMP`,
        [item.sku, item.product_name, item.quantity]
      );
    }

    // 7. Calculate End-to-End Latency (T2 - T1) and update order
    const t2 = Date.now();
    const sync_latency_ms = t2 - t1;
    await client.query('UPDATE orders SET sync_latency_ms = $1 WHERE id = $2', [sync_latency_ms, orderId]);

    // 7b. Automatically register delivery route for the new order (Encrypted Destination & Tracking)
    const carrier = channel === 'Shopify' ? 'DHL Express' : 'Amazon Logistics';
    const trackingNum = channel === 'Shopify' 
      ? `DHL-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-EXP`
      : `TBA-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-AMZ`;

    const encTracking = EncryptionService.encryptString(trackingNum);
    const encDestination = EncryptionService.encryptString(customer.shipping_address || 'Houston, TX');

    await client.query(
      `INSERT INTO shipments (order_id, external_order_id, channel, carrier, tracking_number, destination, current_step, is_delivered, estimated_delivery, checkpoints)
       VALUES ($1, $2, $3, $4, $5, $6, 'processing', false, 'Mañana 14:00 hrs', $7)`,
      [
        orderId,
        external_order_id,
        channel,
        carrier,
        encTracking,
        encDestination,
        JSON.stringify([
          { step: 'processing', title: 'Orden Recibida y en Empaque', timestamp: 'Ahora mismo', done: true },
          { step: 'in_transit', title: 'Despachado en Ruta', timestamp: 'Pendiente', done: false },
          { step: 'out_for_delivery', title: 'En Reparto Local', timestamp: 'Pendiente', done: false },
          { step: 'delivered', title: 'Entregado al Destinatario', timestamp: 'Pendiente', done: false }
        ])
      ]
    );

    await client.query('COMMIT');

    // 8. Broadcast synchronized order with customer details (at rest encrypted in PostgreSQL via AES-256-GCM)
    const broadcastPayload = {
      id: orderId,
      external_order_id,
      channel,
      status,
      total_amount,
      currency,
      sync_latency_ms,
      customer: {
        full_name: customer.full_name,
        shipping_address: customer.shipping_address,
        phone: customer.phone || customer.phone_number,
        db_encrypted: true
      }
    };

    io.emit('ORDER_SYNCED', broadcastPayload);
    DevOpsService.recordWebhookExecution(sync_latency_ms, true);

    console.log(`[OrderSync] Order ${external_order_id} synced in ${sync_latency_ms}ms via ${channel}`);

    res.status(201).json({
      message: 'Order synced successfully',
      external_order_id,
      latency_ms: sync_latency_ms
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error syncing order:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    client.release();
  }
};

/**
 * Ingests a real or simulated Shopify refund webhook, restocks inventory, updates order status,
 * and broadcasts live updates to the RMA & returns dashboard.
 */
export async function processShopifyRefundPayload(io: Server, payload: any, res: Response): Promise<void> {
  try {
    const rawOrderId = payload?.order_id || payload?.id;
    let orderRes = await pool.query(
      `SELECT o.*, c.encrypted_full_name 
       FROM orders o 
       LEFT JOIN customers c ON c.order_id = o.id 
       WHERE o.external_order_id = $1 OR o.external_order_id = $2 OR o.external_order_id = $3
       LIMIT 1`,
      [`#${rawOrderId}`, `${rawOrderId}`, `#SHPF-${rawOrderId}`]
    );

    if (orderRes.rows.length === 0) {
      orderRes = await pool.query(
        `SELECT o.*, c.encrypted_full_name 
         FROM orders o 
         LEFT JOIN customers c ON c.order_id = o.id 
         WHERE o.channel = 'Shopify' 
         ORDER BY o.created_at DESC 
         LIMIT 1`
      );
    }

    const matchedOrder = orderRes.rows[0];
    let customerName = 'Carlos Mendoza';
    if (matchedOrder?.encrypted_full_name) {
      try {
        customerName = EncryptionService.decrypt(matchedOrder.encrypted_full_name);
      } catch (e) {
        customerName = 'Cliente Shopify';
      }
    } else if (payload?.customer?.first_name) {
      customerName = `${payload.customer.first_name} ${payload.customer.last_name || ''}`.trim();
    }

    let sku = 'SKU-4821';
    let productName = 'Premium Widget';
    let quantity = 1;
    let refundAmount = 199.99;

    const rli = payload?.refund_line_items?.[0];
    if (rli?.line_item) {
      sku = rli.line_item.sku || 'SKU-4821';
      productName = rli.line_item.title || rli.line_item.name || 'Premium Widget';
      quantity = Number(rli.quantity) || 1;
      refundAmount = parseFloat(rli.subtotal || rli.line_item.price || '199.99');
    } else if (matchedOrder?.id) {
      const itemsRes = await pool.query('SELECT * FROM order_items WHERE order_id = $1 LIMIT 1', [matchedOrder.id]);
      if (itemsRes.rows.length > 0) {
        sku = itemsRes.rows[0].sku;
        const rawProd = itemsRes.rows[0].product_name;
        productName = rawProd && rawProd.startsWith('ENC[') ? EncryptionService.decryptString(rawProd) : rawProd;
        quantity = itemsRes.rows[0].quantity;
        refundAmount = parseFloat(itemsRes.rows[0].unit_price) * quantity;
      }
    }

    const returnNumber = `RET-SHPF-${Math.floor(10000 + Math.random() * 90000)}`;
    const extOrderId = matchedOrder?.external_order_id || `#${rawOrderId || Math.floor(1000 + Math.random() * 9000)}`;
    const trackingNum = `DHL-RET-${Math.floor(1000 + Math.random() * 9000)}`;
    const defaultNotes = 'Reembolso en tiempo real procesado por Webhook oficial de Shopify.';

    const insRes = await pool.query(
      `INSERT INTO returns (
        return_number, order_id, external_order_id, channel, customer_name,
        sku, product_name, quantity, refund_amount, currency, reason,
        status, restock_inventory, tracking_number, notes
      ) VALUES ($1, $2, $3, 'Shopify', $4, $5, $6, $7, $8, 'USD', 'DEFECTIVE', 'approved', true, $9, $10)
      RETURNING *`,
      [
        returnNumber,
        matchedOrder?.id || null,
        extOrderId,
        EncryptionService.encryptString(customerName),
        sku,
        EncryptionService.encryptString(productName),
        quantity,
        refundAmount,
        EncryptionService.encryptString(trackingNum),
        EncryptionService.encryptString(defaultNotes)
      ]
    );

    const createdReturn = {
      ...insRes.rows[0],
      customer_name: customerName,
      product_name: productName,
      tracking_number: trackingNum,
      notes: defaultNotes
    };

    // Restock inventory atomically
    await pool.query(
      `UPDATE inventory 
       SET stock_quantity = stock_quantity + $1, updated_at = CURRENT_TIMESTAMP 
       WHERE sku = $2`,
      [quantity, sku]
    );

    // Update order status if matched
    if (matchedOrder?.id) {
      await pool.query(`UPDATE orders SET status = 'refunded' WHERE id = $1`, [matchedOrder.id]);
      io.emit('ORDER_UPDATED', { id: matchedOrder.id, external_order_id: extOrderId, status: 'refunded' });
    }

    io.emit('RETURN_CREATED', createdReturn);
    io.emit('INVENTORY_UPDATED', { sku, restockedQty: quantity });

    console.log(`[Shopify Webhook] Refund processed successfully: ${returnNumber} for order ${extOrderId}`);

    res.status(200).json({
      status: 'success',
      message: 'Shopify refund webhook processed successfully',
      return: createdReturn
    });
  } catch (error) {
    console.error('Error processing Shopify refund webhook:', error);
    res.status(500).json({ error: 'Shopify refund processing failed' });
  }
}

/**
 * Handles Shopify Fulfillment webhooks (fulfillments/create, fulfillments/update, orders/fulfilled, orders/updated)
 * to automatically advance shipment stages directly from Shopify without manual buttons.
 */
export async function processShopifyFulfillmentPayload(io: Server, payload: any, topic: string, res: Response): Promise<void> {
  try {
    const rawOrderId = payload?.order_id || payload?.id;
    const orderName = payload?.name ? String(payload.name) : (payload?.order_number ? `#${payload.order_number}` : (rawOrderId ? `#${rawOrderId}` : ''));
    
    // Look up matching order or shipment
    const shipRes = await pool.query(
      `SELECT s.*, o.external_order_id as order_code 
       FROM shipments s
       LEFT JOIN orders o ON s.order_id = o.id
       WHERE s.external_order_id = $1 
          OR s.external_order_id = $2
          OR o.external_order_id = $1 
          OR o.external_order_id = $2
          OR (s.channel = 'Shopify' AND s.is_delivered = false)
       ORDER BY s.created_at DESC LIMIT 1`,
      [orderName, String(rawOrderId)]
    );

    if (shipRes.rows.length === 0) {
      res.status(200).json({ message: 'No matching shipment found for fulfillment' });
      return;
    }

    const current = shipRes.rows[0];
    let nextStep: 'processing' | 'in_transit' | 'out_for_delivery' | 'delivered' = current.current_step;
    let isDelivered = current.is_delivered;
    let estDelivery = current.estimated_delivery;

    const shipmentStatus = String(payload?.shipment_status || payload?.status || '').toLowerCase();
    const fulfillmentStatus = String(payload?.fulfillment_status || '').toLowerCase();

    if (shipmentStatus === 'delivered' || shipmentStatus === 'confirmed_delivery') {
      nextStep = 'delivered';
      isDelivered = true;
      estDelivery = '¡Producto entregado con éxito! (Confirmado Shopify)';
    } else if (shipmentStatus === 'out_for_delivery') {
      nextStep = 'out_for_delivery';
      isDelivered = false;
      estDelivery = 'En unidad de reparto local (Llega hoy)';
    } else if (shipmentStatus === 'in_transit' || fulfillmentStatus === 'fulfilled' || topic === 'orders/fulfilled' || topic.includes('fulfillment')) {
      if (current.current_step === 'processing') {
        nextStep = 'in_transit';
        estDelivery = 'En ruta interestatal con transportista (Shopify)';
      } else if (current.current_step === 'in_transit') {
        nextStep = 'out_for_delivery';
        estDelivery = 'En reparto hacia el domicilio (Shopify API)';
      } else {
        nextStep = 'delivered';
        isDelivered = true;
        estDelivery = '¡Entregado a destinatario! (Shopify API)';
      }
    }

    const stepOrder = ['processing', 'in_transit', 'out_for_delivery', 'delivered'];
    const targetIdx = stepOrder.indexOf(nextStep);

    const titles: Record<string, string> = {
      processing: 'Orden Procesada y Empacada (Shopify)',
      in_transit: 'Despachado y en Tránsito (Shopify API)',
      out_for_delivery: 'En Reparto Local (Llega hoy)',
      delivered: '¡Entregado a destinatario! (Confirmado Shopify)'
    };

    const checkpoints = stepOrder.map((stepKey, idx) => ({
      step: stepKey,
      title: titles[stepKey],
      timestamp: idx <= targetIdx ? (idx === targetIdx ? 'Recién actualizado vía Shopify' : 'Completado') : 'Pendiente',
      done: idx <= targetIdx
    }));

    const trackingNumber = payload?.tracking_number || payload?.fulfillments?.[0]?.tracking_number || null;
    const trackingCompany = payload?.tracking_company || payload?.fulfillments?.[0]?.tracking_company || null;

    const encTracking = trackingNumber ? EncryptionService.encryptString(trackingNumber) : null;

    const updateRes = await pool.query(
      `UPDATE shipments 
       SET current_step = $1, 
           is_delivered = $2, 
           estimated_delivery = $3, 
           checkpoints = $4,
           carrier = COALESCE($5, carrier),
           tracking_number = COALESCE($6, tracking_number),
           delivered_at = CASE WHEN $2 = true THEN CURRENT_TIMESTAMP ELSE delivered_at END
       WHERE id = $7
       RETURNING *`,
      [nextStep, isDelivered, estDelivery, JSON.stringify(checkpoints), trackingCompany, encTracking, current.id]
    );

    const updatedShipment = {
      ...updateRes.rows[0],
      destination: EncryptionService.decryptString(updateRes.rows[0].destination),
      tracking_number: EncryptionService.decryptString(updateRes.rows[0].tracking_number)
    };

    io.emit('SHIPMENT_UPDATED', updatedShipment);
    console.log(`[Shopify Fulfillment API] Shipment for order ${orderName || current.external_order_id} advanced to ${nextStep}`);

    res.status(200).json({
      status: 'success',
      message: `Shipment advanced via Shopify API to: ${nextStep}`,
      shipment: updatedShipment
    });
  } catch (error) {
    console.error('Error processing Shopify fulfillment webhook:', error);
    res.status(500).json({ error: 'Shopify fulfillment processing failed' });
  }
}

