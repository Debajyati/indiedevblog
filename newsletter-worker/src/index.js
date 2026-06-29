export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method;

    // Handle CORS preflight requests
    if (method === "OPTIONS") {
      return handleCors(request);
    }

    try {
      if (url.pathname === "/api/subscribe/start" && method === "POST") {
        return await handleSubscribeStart(request, env);
      }
      if (url.pathname === "/api/subscribe/verify" && method === "GET") {
        return await handleSubscribeVerify(request, env);
      }
      if (url.pathname === "/api/unsubscribe" && method === "GET") {
        return await handleUnsubscribe(request, env);
      }
      if (url.pathname === "/api/send-bulk" && method === "POST") {
        return await handleSendBulk(request, env);
      }

      return new Response("Not Found", { status: 404 });
    } catch (err) {
      console.error(err);
      return corsResponse(JSON.stringify({ success: false, error: err.message }), 500);
    }
  }
};

// CORS Helper functions
function handleCors(request) {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    }
  });
}

function corsResponse(body, status = 200, contentType = "application/json") {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    }
  });
}

// ----------------------------------------------------
// 1. Initiate Subscription & Send Verification Email
// ----------------------------------------------------
async function handleSubscribeStart(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return corsResponse(JSON.stringify({ success: false, error: "Invalid JSON body" }), 400);
  }

  const { email, name } = body;

  if (!email || !name) {
    return corsResponse(JSON.stringify({ success: false, error: "Name and Email are required." }), 400);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return corsResponse(JSON.stringify({ success: false, error: "Invalid email format." }), 400);
  }

  // Check if subscriber exists and is already confirmed
  const existing = await env.DB.prepare(
    "SELECT id, status FROM subscribers WHERE email = ?"
  ).bind(email).first();

  if (existing && existing.status === 'CONFIRMED') {
    return corsResponse(JSON.stringify({ success: false, error: "You are already subscribed!" }), 400);
  }

  const id = crypto.randomUUID();
  const token = crypto.randomUUID();

  // Upsert subscriber record
  await env.DB.prepare(`
    INSERT INTO subscribers (id, email, name, token, status)
    VALUES (?, ?, ?, ?, 'PENDING_VERIFICATION')
    ON CONFLICT(email) DO UPDATE SET
      name = excluded.name,
      token = excluded.token,
      status = 'PENDING_VERIFICATION'
  `).bind(id, email, name, token).run();

  // Construct Verification Link
  const workerDomain = new URL(request.url).origin;
  const verificationLink = `${workerDomain}/api/subscribe/verify?token=${token}&email=${encodeURIComponent(email)}`;

  // Send Single Email using AutoSend
  const autoSendPayload = {
    from: {
      email: env.SENDER_EMAIL,
      name: env.SENDER_NAME
    },
    to: {
      email: email,
      name: name
    },
    subject: "Confirm your subscription to " + env.SENDER_NAME,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #333;">Welcome to the Newsletter!</h2>
        <p>Hi ${name},</p>
        <p>Thank you for signing up. Please verify your email to start receiving updates about new articles.</p>
        <div style="margin: 30px 0;">
          <a href="${verificationLink}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email Address</a>
        </div>
        <p style="color: #666; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `
  };

  const response = await fetch("https://api.autosend.com/v1/mails/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.AUTOSEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(autoSendPayload)
  });

  const resJson = await response.json();
  if (!response.ok || !resJson.success) {
    throw new Error(resJson.error?.message || "Failed to send verification email via AutoSend");
  }

  return corsResponse(JSON.stringify({ success: true, message: "Verification email sent!" }));
}

// ----------------------------------------------------
// 2. Handle Verification Link Click
// ----------------------------------------------------
async function handleSubscribeVerify(request, env) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const email = url.searchParams.get("email");

  if (!token || !email) {
    return new Response("Invalid request parameters.", { status: 400 });
  }

  // Find subscriber matching email and verification token
  const subscriber = await env.DB.prepare(
    "SELECT id, status FROM subscribers WHERE email = ? AND token = ?"
  ).bind(email, token).first();

  if (!subscriber) {
    return new Response("Verification failed. Link is invalid or has expired.", { status: 403 });
  }

  // Update subscriber state to CONFIRMED
  await env.DB.prepare(`
    UPDATE subscribers
    SET status = 'CONFIRMED', verified_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(subscriber.id).run();

  // Redirect user to the blog's thank you / success page
  return Response.redirect(`${env.BLOG_DOMAIN}/thank-you/`, 302);
}

// ----------------------------------------------------
// 3. Unsubscribe Handler
// ----------------------------------------------------
async function handleUnsubscribe(request, env) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  const token = url.searchParams.get("token");

  if (!email || !token) {
    return new Response("Unauthorized or incomplete request.", { status: 401 });
  }

  // Double check credentials
  const subscriber = await env.DB.prepare(
    "SELECT id FROM subscribers WHERE email = ? AND token = ?"
  ).bind(email, token).first();

  if (!subscriber) {
    return new Response("Unable to find a valid subscription matching these details.", { status: 404 });
  }

  // Mark as unsubscribed
  await env.DB.prepare(`
    UPDATE subscribers
    SET status = 'UNSUBSCRIBED', unsubscribed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(subscriber.id).run();

  return new Response(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Unsubscribed Successfully</title>
      <style>
        body { font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f9fafb; color: #1f2937; }
        .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
        h1 { color: #dc2626; margin-top: 0; }
        p { color: #4b5563; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Unsubscribed</h1>
        <p>You have been successfully removed from our mailing list. You will no longer receive any updates.</p>
        <p><a href="${env.BLOG_DOMAIN}" style="color: #6366f1; text-decoration: none;">Return to Blog</a></p>
      </div>
    </body>
    </html>
  `, { headers: { "Content-Type": "text/html" } });
}

// ----------------------------------------------------
// 4. Bulk Newsletter Dispatch Handler
// ----------------------------------------------------
async function handleSendBulk(request, env) {
  // Simple Authorization header check to verify request comes from CI/CD
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || authHeader !== `Bearer ${env.BULK_SEND_SECRET}`) {
    return corsResponse(JSON.stringify({ success: false, error: "Unauthorized" }), 401);
  }

  // Get metadata of the new article from body
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return corsResponse(JSON.stringify({ success: false, error: "Invalid JSON body" }), 400);
  }

  const { title, description, image, url } = body;
  if (!title || !url) {
    return corsResponse(JSON.stringify({ success: false, error: "Missing article title or url" }), 400);
  }

  // 1. Fetch all confirmed subscribers
  const { results: subscribers } = await env.DB.prepare(
    "SELECT email, name, token FROM subscribers WHERE status = 'CONFIRMED'"
  ).all();

  if (subscribers.length === 0) {
    return corsResponse(JSON.stringify({ success: true, message: "No active subscribers found. Skipping send." }));
  }

  // 2. Prepare recipient payloads (chunks of 100 as AutoSend's limit)
  const workerDomain = new URL(request.url).origin;
  const chunkSize = 100;
  let batchReports = [];

  for (let i = 0; i < subscribers.length; i += chunkSize) {
    const chunk = subscribers.slice(i, i + chunkSize);

    const recipients = chunk.map(sub => {
      const unsubLink = `${workerDomain}/api/unsubscribe?email=${encodeURIComponent(sub.email)}&token=${sub.token}`;
      return {
        email: sub.email,
        name: sub.name,
        dynamicData: {
          name: sub.name,
          unsubscribeLink: unsubLink
        }
      };
    });

    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; color: #374151;">
        ${image ? `<img src="${image}" alt="${title}" style="width: 100%; height: auto; display: block;" />` : ''}
        <div style="padding: 24px;">
          <span style="font-size: 12px; text-transform: uppercase; font-weight: bold; color: #6366f1;">New Article Published</span>
          <h1 style="font-size: 22px; color: #111827; margin-top: 8px; margin-bottom: 12px; line-height: 1.3;">${title}</h1>
          <p style="font-size: 16px; line-height: 1.5; color: #4b5563; margin-bottom: 24px;">${description || ""}</p>
          <a href="${url}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Read Full Article</a>
        </div>
        <div style="background-color: #f9fafb; padding: 16px 24px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
          <p>Hi {{name}}, you received this because you subscribed to our newsletter.</p>
          <p><a href="{{unsubscribeLink}}" style="color: #ef4444; text-decoration: underline;">Unsubscribe from this list</a></p>
        </div>
      </div>
    `;

    const bulkPayload = {
      from: {
        email: env.SENDER_EMAIL,
        name: env.SENDER_NAME
      },
      subject: `New Post: ${title}`,
      html: htmlBody,
      recipients: recipients
    };

    // Post to AutoSend bulk send API
    const response = await fetch("https://api.autosend.com/v1/mails/bulk", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.AUTOSEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(bulkPayload)
    });

    const resJson = await response.json();
    if (!response.ok || !resJson.success) {
      throw new Error(resJson.error?.message || `Failed to deliver batch ending at index ${i + chunkSize}`);
    }

    batchReports.push(resJson.data);
  }

  return corsResponse(JSON.stringify({
    success: true,
    message: `Dispatched newsletter to ${subscribers.length} subscribers.`,
    batches: batchReports
  }));
}
