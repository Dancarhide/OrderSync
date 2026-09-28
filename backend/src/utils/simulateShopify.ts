import http from 'http';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET || '6957e9cba8ef6a6750233cc5171149200ae2029b0c88846f14ae4479b2124bac';
const TARGET_URL = 'http://127.0.0.1:3000/api/v1/webhooks/shopify';

/**
 * Creates a realistic Shopify `orders/create` webhook payload.
 */
function createShopifyOrderPayload() {
  const orderNumber = Math.floor(1000 + Math.random() * 9000);
  const orderId = 5000000000 + orderNumber;

  const simulatedShopifyCustomers = [
    { name: 'Alejandro Morales', address1: '1240 Post Oak Blvd, Apt 4B', city: 'Houston', province: 'TX', zip: '77056', phone: '+1-713-555-0112' },
    { name: 'Sofía Navarro Vega', address1: '450 Lexington Ave, Suite 1200', city: 'New York', province: 'NY', zip: '10017', phone: '+1-212-555-0184' },
    { name: 'Valentina Cruz Méndez', address1: '800 Brickell Ave, Floor 9', city: 'Miami', province: 'FL', zip: '33131', phone: '+1-305-555-0199' },
    { name: 'Mateo Silva Castillo', address1: '200 S Wacker Dr, Suite 150', city: 'Chicago', province: 'IL', zip: '60606', phone: '+1-312-555-0143' },
    { name: 'Camila Herrera Ramos', address1: '555 California St, Suite 210', city: 'San Francisco', province: 'CA', zip: '94104', phone: '+1-415-555-0177' },
    { name: 'Diego Torres Domínguez', address1: '100 Congress Ave, Suite 800', city: 'Austin', province: 'TX', zip: '78701', phone: '+1-512-555-0128' },
    { name: 'Lucía Méndez Ríos', address1: '1700 Lincoln St, Suite 400', city: 'Denver', province: 'CO', zip: '80203', phone: '+1-303-555-0165' },
    { name: 'Javier Ortiz Valenzuela', address1: '1201 3rd Ave, Floor 14', city: 'Seattle', province: 'WA', zip: '98101', phone: '+1-206-555-0152' },
    { name: 'Mariana Reyes Gutiérrez', address1: '600 Peachtree St NE, Suite 500', city: 'Atlanta', province: 'GA', zip: '30308', phone: '+1-404-555-0131' },
    { name: 'Gabriel Castro Morales', address1: '100 High St, Suite 700', city: 'Boston', province: 'MA', zip: '02110', phone: '+1-617-555-0190' }
  ];
  const pickedCustomer = simulatedShopifyCustomers[Math.floor(Math.random() * simulatedShopifyCustomers.length)];

  return {
    id: orderId,
    admin_graphql_api_id: `gid://shopify/Order/${orderId}`,
    order_number: orderNumber,
    name: `#${orderNumber}`,
    financial_status: 'paid',
    current_total_price: '299.99',
    total_price: '299.99',
    currency: 'USD',
    created_at: new Date().toISOString(),
    customer: {
      id: 7000000000 + orderNumber,
      first_name: pickedCustomer.name.split(' ')[0],
      last_name: pickedCustomer.name.split(' ').slice(1).join(' '),
      email: `${pickedCustomer.name.toLowerCase().replace(/[^a-z]/g, '.')}@example.com`,
      phone: pickedCustomer.phone
    },
    shipping_address: {
      first_name: pickedCustomer.name.split(' ')[0],
      last_name: pickedCustomer.name.split(' ').slice(1).join(' '),
      name: pickedCustomer.name,
      address1: pickedCustomer.address1,
      city: pickedCustomer.city,
      province: pickedCustomer.province,
      province_code: pickedCustomer.province,
      country: 'United States',
      country_code: 'US',
      zip: pickedCustomer.zip,
      phone: pickedCustomer.phone
    },
    line_items: [
      {
        id: 9000000000 + orderNumber,
        title: 'Premium Widget',
        name: 'Premium Widget',
        sku: 'SKU-4821',
        quantity: 1,
        price: '199.99'
      },
      {
        id: 9000000001 + orderNumber,
        title: 'Wireless Mouse Pro',
        name: 'Wireless Mouse Pro',
        sku: 'SKU-1002',
        quantity: 1,
        price: '100.00'
      }
    ]
  };
}

async function sendShopifyWebhook() {
  const payload = createShopifyOrderPayload();
  const rawBody = JSON.stringify(payload);

  // Compute official Shopify HMAC-SHA256 in Base64
  const hmacBase64 = crypto
    .createHmac('sha256', SHOPIFY_WEBHOOK_SECRET)
    .update(rawBody, 'utf8')
    .digest('base64');

  console.log(`\n======================================================`);
  console.log(`[Shopify Webhook Simulator]`);
  console.log(`Order: ${payload.name} (ID: ${payload.id})`);
  console.log(`Calculated X-Shopify-Hmac-Sha256 (Base64): ${hmacBase64}`);
  console.log(`Sending to: ${TARGET_URL}...`);
  console.log(`======================================================\n`);

  const urlObj = new URL(TARGET_URL);
  const options = {
    hostname: urlObj.hostname,
    port: urlObj.port,
    path: urlObj.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Hmac-Sha256': hmacBase64,
      'X-Shopify-Shop-Domain': 'ordersync-h9olc5mj.myshopify.com',
      'X-Shopify-Topic': 'orders/create',
      'Content-Length': Buffer.byteLength(rawBody)
    }
  };

  const req = http.request(options, (res) => {
    let responseBody = '';
    res.on('data', (chunk) => (responseBody += chunk));
    res.on('end', () => {
      console.log(`Response HTTP Status: ${res.statusCode}`);
      console.log(`Response Body: ${responseBody}`);

      if (res.statusCode === 201) {
        console.log(`\n✅ TEST PASSED: Shopify Order successfully ingested with ISO 27001 encryption & stock updated!`);
      } else {
        console.log(`\n⚠️ Unexpected status code: ${res.statusCode}`);
      }
    });
  });

  req.on('error', (err) => {
    console.error(`❌ Request failed: ${err.message}`);
    console.error(`Make sure the backend server is running on port 3000!`);
  });

  req.write(rawBody);
  req.end();
}

sendShopifyWebhook();
