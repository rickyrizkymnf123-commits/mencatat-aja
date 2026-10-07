// Midtrans Payment Integration Helper

export interface CreateSnapTokenOptions {
  orderId: string;
  grossAmount: number;
  customerDetails: {
    firstName: string;
    email: string;
    phone?: string;
  };
  itemDetails: {
    id: string;
    price: number;
    quantity: number;
    name: string;
  }[];
}

export async function createMidtransTransaction(options: CreateSnapTokenOptions): Promise<{ token?: string; redirectUrl?: string; error?: string }> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) {
    console.warn('MIDTRANS_SERVER_KEY is not configured in env.');
    // Fallback simulation for sandbox/dev mode
    return {
      token: `snap_token_${options.orderId}`,
      redirectUrl: `https://app.sandbox.midtrans.com/snap/v2/vtweb/${options.orderId}`,
    };
  }

  try {
    const authString = Buffer.from(`${serverKey}:`).toString('base64');
    const response = await fetch('https://app.sandbox.midtrans.com/snap/v1/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: options.orderId,
          gross_amount: options.grossAmount,
        },
        credit_card: {
          secure: true,
        },
        customer_details: {
          first_name: options.customerDetails.firstName,
          email: options.customerDetails.email,
          phone: options.customerDetails.phone,
        },
        item_details: options.itemDetails,
      }),
    });

    const data = await response.json();
    if (response.ok && data.token) {
      return { token: data.token, redirectUrl: data.redirect_url };
    }
    return { error: data.error_messages?.[0] || 'Midtrans transaction initialization failed' };
  } catch (err: any) {
    console.error('Midtrans API error:', err);
    return { error: err.message || 'Network error connecting to Midtrans' };
  }
}
