// pages/api/cart/cart.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin'; // Use supabaseAdmin for admin access
import { v4 as uuidv4 } from 'uuid';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { product_id, quantity, user_id } = req.body;

    // Log incoming request data
    console.log('[DEBUG] Received request to add item to cart:', { product_id, quantity, user_id });

    const createdAt = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('cart') // Use your cart table
      .insert([{
        cartid: uuidv4(), // Use uuidv4 to generate a UUID in JS
        userid: user_id,
        product_id: product_id,
        quantity: quantity,
        created_at: createdAt,
      }]);

    // Check for errors in insertion
    if (error) {
      console.error('[DEBUG] Failed to add item to cart:', error);
      return res.status(500).json({ error: 'Failed to add item to cart' });
    }

    // Log success
    console.log('[DEBUG] Item successfully added to cart:', data);
    return res.status(200).json({ success: true });
  }

  // Handle unsupported methods
  res.status(405).json({ error: 'Method Not Allowed' });
}
