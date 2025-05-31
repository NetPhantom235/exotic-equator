import type { APIRoute } from 'astro';
import { authService } from '../../../lib/auth/authService.js';
import { metricsCollector } from '../../../lib/metricsCollector';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Input validation
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { email, password } = body;

    // Basic input validation
    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Email is required and must be a string' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!password || typeof password !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Password is required and must be a string' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get client IP for rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';

    // Authenticate user
    const { user, sessionToken } = await authService.login(email, password, clientIP);

    // Track successful login in metrics
    metricsCollector.trackAuthRequest('SUCCESS');

    // Return success response with token
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        },
        token: sessionToken
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Login error:', error);
    
    // Handle rate limiting errors specifically
    if (error instanceof Error && error.message.includes('Too many login attempts')) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Handle invalid credentials
    if (error instanceof Error && 
        (error.message === 'Invalid credentials' || 
         error.message.includes('Email and password'))) {
      return new Response(
        JSON.stringify({ error: 'Invalid email or password' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generic error
    return new Response(
      JSON.stringify({ error: 'Authentication failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};