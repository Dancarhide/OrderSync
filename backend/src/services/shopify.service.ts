import { Pool } from 'pg';
import { Server } from 'socket.io';
import { EncryptionService } from './encryption.service';
import dotenv from 'dotenv';

dotenv.config();

export class ShopifyService {
  private static pool: Pool;

  public static init(pool: Pool) {
    this.pool = pool;
  }

  public static getShopDomain(): string {
    return process.env.SHOPIFY_SHOP_DOMAIN || 'ordersync-ygnacmly.myshopify.com';
  }

  public static getAccessToken(): string {
    return (process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || '').trim();
  }

  public static getApiVersion(): string {
    return process.env.SHOPIFY_API_VERSION || '2024-01';
  }

  /**
   * Tests connection with Shopify Admin REST API
   */
  public static async testConnection(): Promise<{ success: boolean; data?: any; error?: string }> {
    const domain = this.getShopDomain();
    const token = this.getAccessToken();

    if (!token) {
      return {
        success: false,
        error: 'SHOPIFY_ADMIN_ACCESS_TOKEN not configured in backend/.env or Settings'
      };
    }

    try {
      const url = `https://${domain}/admin/api/${this.getApiVersion()}/shop.json`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': token,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const errText = await res.text();
        return {
          success: false,
          error: `Shopify responded with code ${res.status}: ${errText}`
        };
      }

      const json: any = await res.json();
      return { success: true, data: json.shop };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error de conexión con Shopify' };
    }
  }

  /**
   * Fetches real orders directly from Shopify Admin REST API
   */
  public static async fetchOrdersFromShopify(limit: number = 50, status: string = 'any'): Promise<any[]> {
    const domain = this.getShopDomain();
    const token = this.getAccessToken();

    if (!token) {
      throw new Error('Falta SHOPIFY_ADMIN_ACCESS_TOKEN en backend/.env');
    }

    const url = `https://${domain}/admin/api/${this.getApiVersion()}/orders.json?status=${status}&limit=${limit}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Shopify API error (${res.status}): ${errText}`);
    }

    const json: any = await res.json();
    return json.orders || [];
  }

  /**
   * Synchronizes an array of Shopify orders into Neon PostgreSQL
   */
  public static async syncOrdersToDatabase(shopifyOrders: any[], io?: Server): Promise<{ imported: number; updated: number }> {
    let imported = 0;
    let updated = 0;

    for (const b of shopifyOrders) {
      const orderNum = b.name ? b.name : (b.order_number ? `#${b.order_number}` : `SHP-${b.id}`);
      const total = parseFloat(b.current_total_price || b.total_price || '0');
      const currency = b.currency || 'USD';
      const status = b.financial_status || 'paid';

      // Customer
      let fullName = 'Shopify Customer';
      if (b.shipping_address && (b.shipping_address.name || b.shipping_address.first_name)) {
        fullName = b.shipping_address.name || `${b.shipping_address.first_name || ''} ${b.shipping_address.last_name || ''}`.trim();
      } else if (b.customer) {
        fullName = `${b.customer.first_name || ''} ${b.customer.last_name || ''}`.trim() || b.customer.email || 'Shopify Customer';
      }

      let shippingAddress = 'Address not specified';
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
      const orderCreatedAt = b.created_at || b.processed_at ? new Date(b.created_at || b.processed_at) : new Date();

      // Check if order exists
      const existing = await this.pool.query('SELECT id, status FROM orders WHERE external_order_id = $1', [orderNum]);

      if (existing.rows.length > 0) {
        const orderId = existing.rows[0].id;
        await this.pool.query(
          'UPDATE orders SET status = $1, total_amount = $2, currency = $3, created_at = COALESCE($5, created_at) WHERE id = $4',
          [status, total, currency, orderId, orderCreatedAt]
        );
        updated++;
      } else {
        // Insert new order
        const insertRes = await this.pool.query(
          `INSERT INTO orders (external_order_id, channel, status, total_amount, currency, sync_latency_ms, created_at)
           VALUES ($1, 'Shopify', $2, $3, $4, 150, $5) RETURNING id`,
          [orderNum, status, total, currency, orderCreatedAt]
        );
        const orderId = insertRes.rows[0].id;

        // Customer PII
        const encName = EncryptionService.encrypt(fullName);
        const encAddress = EncryptionService.encrypt(shippingAddress);
        const encPhone = EncryptionService.encrypt(phone);

        await this.pool.query(
          `INSERT INTO customers (order_id, encrypted_full_name, encrypted_shipping_address, encrypted_phone)
           VALUES ($1, $2, $3, $4)`,
          [orderId, encName, encAddress, encPhone]
        );

        // Line items
        const lineItems = b.line_items || [];
        for (const li of lineItems) {
          const sku = li.sku || `SKU-${li.id}`;
          const prodName = li.title || li.name || 'Shopify Product';
          const qty = Number(li.quantity) || 1;
          const price = parseFloat(li.price || '0');

          await this.pool.query(
            `INSERT INTO order_items (order_id, sku, product_name, quantity, unit_price)
             VALUES ($1, $2, $3, $4, $5)`,
            [orderId, sku, EncryptionService.encryptString(prodName), qty, price]
          );
        }

        // Shipment Route
        const isFulfillmentDone = b.fulfillment_status === 'fulfilled';
        const trackingNum = b.fulfillments?.[0]?.tracking_number || `DHL-${Math.floor(1000 + Math.random() * 9000)}-EXP`;
        const encTracking = EncryptionService.encryptString(trackingNum);
        const encDestination = EncryptionService.encryptString(shippingAddress);

        await this.pool.query(
          `INSERT INTO shipments (order_id, external_order_id, channel, carrier, tracking_number, destination, current_step, is_delivered, estimated_delivery, checkpoints)
           VALUES ($1, $2, 'Shopify', 'DHL Express', $3, $4, $5, $6, $7, $8)`,
          [
            orderId,
            orderNum,
            encTracking,
            encDestination,
            isFulfillmentDone ? 'delivered' : 'processing',
            isFulfillmentDone,
            isFulfillmentDone ? 'Product delivered successfully! (Shopify API)' : 'In preparation',
            JSON.stringify([
              { step: 'processing', title: 'Order Received in Shopify', timestamp: 'Confirmed', done: true },
              { step: 'in_transit', title: 'Dispatched in Transit', timestamp: isFulfillmentDone ? 'Completed' : 'Pending', done: isFulfillmentDone },
              { step: 'out_for_delivery', title: 'Out for Local Delivery', timestamp: isFulfillmentDone ? 'Completed' : 'Pending', done: isFulfillmentDone },
              { step: 'delivered', title: 'Delivered to Recipient', timestamp: isFulfillmentDone ? 'Completed' : 'Pending', done: isFulfillmentDone }
            ])
          ]
        );

        if (io) {
          io.emit('ORDER_SYNCED', {
            id: orderId,
            external_order_id: orderNum,
            channel: 'Shopify',
            status,
            total_amount: total,
            currency,
            customer: { full_name: fullName, shipping_address: shippingAddress, phone }
          });
        }

        imported++;
      }
    }

    return { imported, updated };
  }

  /**
   * Publishes a new product directly to Shopify via Admin REST API
   */
  public static async createProductInShopify(productData: {
    title: string;
    description?: string;
    vendor?: string;
    product_type?: string;
    sku: string;
    price: number;
    cost?: number;
    stock_quantity: number;
    image_url?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const domain = this.getShopDomain();
    const token = this.getAccessToken();

    if (!token) {
      return {
        success: false,
        error: 'Missing SHOPIFY_ADMIN_ACCESS_TOKEN. Please configure the token in Sales Channels.'
      };
    }

    try {
      const url = `https://${domain}/admin/api/${this.getApiVersion()}/products.json`;
      
      const payload: any = {
        product: {
          title: productData.title,
          body_html: productData.description || `<strong>${productData.title}</strong><p>SKU: ${productData.sku}</p>`,
          vendor: productData.vendor || 'Apex Global Electronics',
          product_type: productData.product_type || 'General Merchandise',
          status: 'active',
          variants: [
            {
              price: productData.price ? productData.price.toFixed(2) : '19.99',
              sku: productData.sku,
              inventory_management: 'shopify',
              inventory_quantity: Number(productData.stock_quantity) || 10
            }
          ]
        }
      };

      if (productData.image_url) {
        if (productData.image_url.startsWith('data:image')) {
          const base64Data = productData.image_url.split('base64,')[1];
          if (base64Data) {
            payload.product.images = [{ attachment: base64Data }];
          }
        } else if (productData.image_url.startsWith('http://') || productData.image_url.startsWith('https://')) {
          payload.product.images = [{ src: productData.image_url }];
        }
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        return {
          success: false,
          error: `Shopify responded with HTTP ${res.status}: ${errText}`
        };
      }

      const json: any = await res.json();
      return { success: true, data: json.product };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network error connecting to Shopify Admin API'
      };
    }
  }
}
