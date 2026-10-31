/**
 * authContextDef.js — Context object definition (non-component module)
 *
 * Keeping AuthContext creation separate from the AuthProvider component
 * satisfies Vite's @vitejs/plugin-react Fast Refresh constraint: a module
 * that mixes React component exports with plain value exports cannot be
 * hot-swapped without a full page reload.
 *
 * Import hierarchy (no circular reference):
 *   authContextDef.js  (creates context)
 *       ↑ imported by AuthContext.jsx (provides context)
 *       ↑ imported by useAuth.js      (consumes context)
 */
import { createContext } from 'react';

export const AuthContext = createContext(null);
export default AuthContext;
