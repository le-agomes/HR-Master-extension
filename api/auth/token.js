import jwt from 'jsonwebtoken';

export default async function handler(request, response) {
  // Only allow POST requests
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const { username, password } = request.body;

  // Mock Login Check: Ensure fields are present
  if (!username || !password) {
    return response.status(400).json({ error: 'Username and password are required.' });
  }

  // In a real application, you would validate credentials against a database here.
  // For this mock, we assume success if fields are provided.

  // JWT Secret: Use environment variable or fallback for dev
  const secret = process.env.JWT_SECRET || 'dev-secret-key-123';

  try {
    // Generate Token
    const token = jwt.sign(
      { 
        userId: 'unique-user-id', 
        plan: 'free' 
      },
      secret,
      { expiresIn: '1h' }
    );

    return response.status(200).json({ token });
  } catch (error) {
    console.error('Token generation error:', error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
}