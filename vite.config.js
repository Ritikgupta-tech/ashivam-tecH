import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendTarget = env.VITE_BACKEND_TARGET || 'http://127.0.0.1:5000'

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
          // Surface a clear actionable message instead of a raw socket trace when the
          // local backend (port 5000) is not running. This does NOT hide the error —
          // the 503 response is still returned to the browser and the terminal still
          // logs it — it just avoids an uncaught ECONNREFUSED stack dump.
          configure: (proxy) => {
            proxy.on('error', (err, req, res) => {
              const isRefused =
                err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET'
              console.warn(
                `[Vite Proxy] Backend unreachable at ${backendTarget}` +
                (isRefused
                  ? ' — start the backend: npm run dev --prefix backend'
                  : ` — ${err.message}`)
              )
              if (!res.headersSent) {
                res.writeHead(503, { 'Content-Type': 'application/json' })
                res.end(
                  JSON.stringify({
                    success: false,
                    message:
                      'Local backend is not running. Start it with: npm run dev --prefix backend',
                    code: err.code || 'PROXY_ERROR',
                  })
                )
              }
            })
          },
        },
      },
    },
  }
})
