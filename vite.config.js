import path from 'node:path'
import { pathToFileURL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// Runs api/*.js (our Vercel serverless functions) directly inside `vite dev`,
// so local development doesn't depend on the Vercel CLI / account login.
// Production deploys on Vercel ignore this entirely and run api/*.js natively.
function apiDevMiddleware() {
  return {
    name: 'daily-cosmos-api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const match = req.url.match(/^\/api\/([a-z0-9-]+)(?:\?|$)/i)
        if (!match) return next()

        const filePath = path.resolve(server.config.root, 'api', `${match[1]}.js`)

        try {
          const mod = await import(`${pathToFileURL(filePath).href}?t=${Date.now()}`)
          const url = new URL(req.url, 'http://localhost')
          req.query = Object.fromEntries(url.searchParams)

          res.status = (code) => {
            res.statusCode = code
            return res
          }
          res.json = (data) => {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(data))
          }

          await mod.default(req, res)
        } catch (err) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: `Dev API middleware error: ${err.message}` }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  process.env.NASA_API_KEY = process.env.NASA_API_KEY || env.NASA_API_KEY

  return {
    plugins: [react(), tailwindcss(), apiDevMiddleware()],
  }
})
