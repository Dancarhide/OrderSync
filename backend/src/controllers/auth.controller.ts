import { Request, Response } from 'express';
import { Client } from 'pg';
import jwt from 'jsonwebtoken';

const getDbClient = () => {
  return new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const client = getDbClient();

  try {
    await client.connect();

    // Check if user exists and password is correct (using pgcrypto's crypt)
    const result = await client.query(
      `SELECT id, email, COALESCE(role, 'Operator') as role 
       FROM users 
       WHERE email = $1 AND password = crypt($2, password)`,
      [email, password]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'supersecret123',
      { expiresIn: '1d' }
    );

    res.status(200).json({
      token,
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await client.end();
  }
};

// GET /api/users - List all users in system
export const getUsers = async (_req: Request, res: Response) => {
  const client = getDbClient();
  try {
    await client.connect();
    const result = await client.query(
      `SELECT id, email, COALESCE(role, 'Operator') as role, created_at 
       FROM users 
       ORDER BY created_at ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to retrieve users' });
  } finally {
    await client.end();
  }
};

// POST /api/users - Only Admin can create new users with roles (Admin / Operator)
export const createUser = async (req: Request, res: Response) => {
  const { email, password, role, requesterRole } = req.body;

  // Verify Admin authorization
  // (Either via requesterRole header/body or JWT verification)
  let userRole = requesterRole;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded: any = jwt.verify(
        authHeader.split(' ')[1],
        process.env.JWT_SECRET || 'supersecret123'
      );
      if (decoded && decoded.role) {
        userRole = decoded.role;
      }
    } catch (e) {
      // fallback to body if provided
    }
  }

  if (userRole !== 'Admin') {
    res.status(403).json({
      error: 'Access Denied: Only administrators have authority to create new users in OrderSync.'
    });
    return;
  }

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const assignedRole = role === 'Admin' ? 'Admin' : 'Operator';
  const client = getDbClient();

  try {
    await client.connect();

    // Check if email already registered
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'A user with this email address already exists.' });
      return;
    }

    const insertResult = await client.query(
      `INSERT INTO users (email, password, role)
       VALUES ($1, crypt($2, gen_salt('bf')), $3)
       RETURNING id, email, role, created_at`,
      [email, password, assignedRole]
    );

    res.status(201).json({
      message: `User created successfully with role: ${assignedRole}`,
      user: insertResult.rows[0]
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  } finally {
    await client.end();
  }
};
