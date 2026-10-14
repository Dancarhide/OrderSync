import { Request, Response } from 'express';
import { Client } from 'pg';
import jwt from 'jsonwebtoken';
import { MfaService } from '../services/mfa.service';

const getDbClient = () => {
  return new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
};

export const login = async (req: Request, res: Response) => {
  const { email, password, mfaCode } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const client = getDbClient();

  try {
    await client.connect();

    // Check if user exists and password is correct (using pgcrypto's crypt)
    const result = await client.query(
      `SELECT id, email, COALESCE(role, 'Operator') as role, 
              COALESCE(mfa_enabled, false) as mfa_enabled, mfa_secret 
       FROM users 
       WHERE email = $1 AND password = crypt($2, password)`,
      [email, password]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const user = result.rows[0];

    // MFA Challenge for users with 2FA activated
    if (user.mfa_enabled) {
      if (!mfaCode) {
        res.status(200).json({
          mfaRequired: true,
          email: user.email,
          message: 'Autenticación Multifactor (MFA/2FA) requerida. Ingrese el código de 6 dígitos.'
        });
        return;
      }

      const isValid = MfaService.verifyTotp(user.mfa_secret || '', String(mfaCode));
      if (!isValid) {
        res.status(401).json({ error: 'Código de verificación MFA incorrecto o expirado.' });
        return;
      }
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, mfaVerified: !!user.mfa_enabled },
      process.env.JWT_SECRET || 'supersecret123',
      { expiresIn: '1d' }
    );

    res.status(200).json({
      token,
      user: { id: user.id, email: user.email, role: user.role, mfa_enabled: !!user.mfa_enabled }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await client.end();
  }
};

// GET /api/auth/mfa/status - Returns MFA status for user
export const getMfaStatus = async (req: Request, res: Response) => {
  const email = (req.query.email as string) || 'admin@ordersync.app';
  const client = getDbClient();
  try {
    await client.connect();
    const result = await client.query(
      'SELECT id, email, COALESCE(mfa_enabled, false) as mfa_enabled FROM users WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({
      email: result.rows[0].email,
      mfa_enabled: result.rows[0].mfa_enabled
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve MFA status' });
  } finally {
    await client.end();
  }
};

// POST /api/auth/mfa/setup - Generates secret and otpauth URI
export const setupMfa = async (req: Request, res: Response) => {
  const { email } = req.body;
  const targetEmail = email || 'admin@ordersync.app';
  const secret = MfaService.generateSecret();
  const otpauthUrl = MfaService.getOtpAuthUrl(targetEmail, secret, 'OrderSync-Texas');

  const client = getDbClient();
  try {
    await client.connect();
    await client.query(
      'UPDATE users SET mfa_secret = $1 WHERE email = $2',
      [secret, targetEmail]
    );

    res.json({
      success: true,
      email: targetEmail,
      secret,
      otpauthUrl,
      demoCode: MfaService.generateTotp(secret, Math.floor(Date.now() / 1000 / 30)),
      instructions: 'Escanee este código con Google Authenticator o ingrese la clave secreta manual. También puede usar el código de prueba 123456.'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to setup MFA' });
  } finally {
    await client.end();
  }
};

// POST /api/auth/mfa/verify - Verifies code and enables MFA
export const verifyAndEnableMfa = async (req: Request, res: Response) => {
  const { email, code } = req.body;
  const targetEmail = email || 'admin@ordersync.app';

  if (!code) {
    res.status(400).json({ error: 'Verification code is required' });
    return;
  }

  const client = getDbClient();
  try {
    await client.connect();
    const result = await client.query('SELECT mfa_secret FROM users WHERE email = $1', [targetEmail]);
    if (result.rows.length === 0 || !result.rows[0].mfa_secret) {
      res.status(400).json({ error: 'MFA setup not initialized for this user' });
      return;
    }

    const secret = result.rows[0].mfa_secret;
    const isValid = MfaService.verifyTotp(secret, String(code));

    if (!isValid) {
      res.status(400).json({ error: 'Código incorrecto. Verifique el reloj de su dispositivo o ingrese 123456.' });
      return;
    }

    await client.query('UPDATE users SET mfa_enabled = true WHERE email = $1', [targetEmail]);
    res.json({
      success: true,
      message: '¡Autenticación Multifactor (MFA/2FA) activada con éxito!'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify MFA' });
  } finally {
    await client.end();
  }
};

// POST /api/auth/mfa/disable - Disables MFA
export const disableMfa = async (req: Request, res: Response) => {
  const { email } = req.body;
  const targetEmail = email || 'admin@ordersync.app';

  const client = getDbClient();
  try {
    await client.connect();
    await client.query('UPDATE users SET mfa_enabled = false WHERE email = $1', [targetEmail]);
    res.json({
      success: true,
      message: 'Autenticación Multifactor (MFA) desactivada.'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to disable MFA' });
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

  const assignedRole = (role && String(role).trim()) || 'Operator';
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

// PUT /api/users/:id - Update user role or password
export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { role, password, requesterRole } = req.body;

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
      // fallback
    }
  }

  if (userRole !== 'Admin') {
    res.status(403).json({ error: 'Access Denied: Only administrators can modify users.' });
    return;
  }

  const client = getDbClient();
  try {
    await client.connect();

    if (password && role) {
      const result = await client.query(
        `UPDATE users 
         SET role = $1, password = crypt($2, gen_salt('bf')) 
         WHERE id = $3 
         RETURNING id, email, role, created_at`,
        [role, password, id]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      res.json({ message: 'User updated successfully', user: result.rows[0] });
    } else if (password) {
      const result = await client.query(
        `UPDATE users 
         SET password = crypt($1, gen_salt('bf')) 
         WHERE id = $2 
         RETURNING id, email, role, created_at`,
        [password, id]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      res.json({ message: 'Password updated successfully', user: result.rows[0] });
    } else if (role) {
      const result = await client.query(
        `UPDATE users 
         SET role = $1 
         WHERE id = $2 
         RETURNING id, email, role, created_at`,
        [role, id]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      res.json({ message: 'Role updated successfully', user: result.rows[0] });
    } else {
      res.status(400).json({ error: 'No fields provided to update.' });
    }
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  } finally {
    await client.end();
  }
};

// DELETE /api/users/:id - Delete user from system
export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { requesterRole } = req.body;

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
      // fallback
    }
  }

  if (userRole !== 'Admin') {
    res.status(403).json({ error: 'Access Denied: Only administrators can delete users.' });
    return;
  }

  const client = getDbClient();
  try {
    await client.connect();

    const checkRes = await client.query('SELECT email FROM users WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    if (checkRes.rows[0].email === 'admin@ordersync.app') {
      res.status(400).json({ error: 'Cannot delete the primary root system administrator.' });
      return;
    }

    await client.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: `User ${checkRes.rows[0].email} deleted successfully.`, id });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  } finally {
    await client.end();
  }
};
