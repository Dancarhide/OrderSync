import http from 'http';
import crypto from 'crypto';

const WEBHOOK_SECRET = 'secret';
const URL = 'http://127.0.0.1:3000/api/v1/webhooks';

const generatePayload = (channel: string) => {
  const external_order_id = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  return {
    external_order_id,
    status: 'pending',
    total_amount: (Math.random() * 500 + 10).toFixed(2),
    currency: 'USD',
    customer: {
      full_name: channel === 'Shopify' ? 'Jane Smith' : 'John Doe',
      shipping_address: '123 Main St, Houston, TX 77001',
      phone_number: '+1-555-019-8372'
    },
    items: [
      {
        sku: `SKU-${Math.floor(Math.random() * 10000)}`,
        product_name: 'Premium Widget',
        quantity: 1,
        unit_price: 199.99
      }
    ]
  };
};

const simulatePurchase = (channel: string) => {
  const payload = generatePayload(channel);
  const payloadStr = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(payloadStr).digest('hex');

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-signature': signature,
    }
  };

  const endpoint = channel === 'Shopify' ? `${URL}/shopify` : `${URL}/amazon`;
  console.log(`Simulating ${channel} purchase to ${endpoint}...`);

  const req = http.request(endpoint, options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log(`Response (${res.statusCode}): ${data}\n`));
  });

  req.on('error', (e) => console.error(`Problem with request: ${e.message}`));
  req.write(payloadStr);
  req.end();
};

const runSimulation = () => {
  simulatePurchase('Shopify');
  setTimeout(() => simulatePurchase('Amazon'), 2000);
};

runSimulation();
