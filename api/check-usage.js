export default async function handler(request, response) {
  // Only allow POST requests
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  // Check for Authorization header
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return response.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];

  // Verify Token
  const user = verifyToken(token);
  if (!user || user.error) {
    return response.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  // Get Usage
  const usage = getUsage(user.id);

  // Check Usage Limits
  if (usage.used < usage.limit) {
    const newUsed = usage.used + 1;
    // In a real app, update the database here
    console.log(`User ${user.id} usage incremented: ${usage.used} -> ${newUsed}`);
    
    return response.status(200).json({ 
      status: 'ALLOW', 
      limit: usage.limit, 
      used: newUsed 
    });
  } else {
    return response.status(200).json({ 
      status: 'LIMIT_REACHED', 
      limit: usage.limit, 
      used: usage.used 
    });
  }
}

// Placeholder: Always returns a mock user object
function verifyToken(token) {
  // Simulating successful verification
  return { id: 'user-123', plan: 'pro', error: false };
}

// Placeholder: Simulates a database check
function getUsage(userId) {
  // Simulating fixed usage stats
  return { limit: 5, used: 2 };
}