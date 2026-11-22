import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUserPayload {
  id: string;
  email: string;
  role: string;
  mfaVerified?: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}

const getJwtSecret = (): string => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET must be set in production');
  }
  return 'supersecret123';
};

/**
 * ISO 27001 A.8.3 — JWT Authentication Middleware.
 * Verifies Bearer token from Authorization header and attaches `req.user`.
 */
export function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : typeof req.headers['x-access-token'] === 'string'
        ? req.headers['x-access-token'].trim()
        : '';

  if (!token) {
    res.status(401).json({ error: 'Authentication required: missing Bearer token' });
    return;
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as AuthUserPayload;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || 'Operator',
      mfaVerified: !!decoded.mfaVerified,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
}

/**
 * ISO 27001 A.8.3 — Role-Based Access Control (RBAC) Middleware.
 * Restricts route access to users whose role matches one of `allowedRoles`.
 */
export function requireRole(...allowedRoles: string[]) {
  const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase());

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userRole = (req.user.role || '').toLowerCase();
    if (!normalizedAllowed.includes(userRole)) {
      res.status(403).json({
        error: `Forbidden: role '${req.user.role}' does not have permission for this resource (ISO A.8.3)`,
      });
      return;
    }

    next();
  };
}

/**
 * ISO 27001 A.8.11 — Data Masking Helpers for non-Admin roles (e.g. Operator).
 */
export function maskName(name: string): string {
  if (!name || name === 'General Customer' || name === 'Cliente General') return name;
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => (part.length <= 1 ? '*' : `${part[0]}***`))
    .join(' ');
}

export function maskAddress(address: string): string {
  if (!address || address === 'Main Warehouse' || address === 'Almacén Principal') return address;
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1) {
    return `***, ${parts.slice(-1)[0]}`;
  }
  return address.length > 6 ? `***${address.slice(-6)}` : '***';
}

export function maskPhone(phone: string): string {
  if (!phone || phone === 'Not registered' || phone === 'No registrado') return phone;
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 4) {
    return `***-***-${digits.slice(-4)}`;
  }
  return '***-****';
}

export function isAdminRole(role?: string): boolean {
  return (role || '').toLowerCase() === 'admin';
}
