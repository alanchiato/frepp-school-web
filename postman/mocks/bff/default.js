// Local, read-only public BFF contract snapshot. Never deployed or published.
// This deliberately models an authenticated admin whose overview is forbidden;
// the real browser must retain the shell rather than log the user out.
const http = require('node:http')
http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'GET' && req.url === '/session') {
    res.end(JSON.stringify({
      user: { id: '11111111-1111-4111-8111-111111111111', email: 'admin@simulation.example', status: 'ACTIVE' },
      school: { id: '22222222-2222-4222-8222-222222222222', name: 'Escola da simulação', timezone: 'America/Sao_Paulo' },
      roles: ['SCHOOL_ADMIN'], permissions: [], experiences: { admin: true, teacher: false },
    }))
  } else if (req.method === 'GET' && req.url === '/admin/overview') {
    res.statusCode = 403
    res.end(JSON.stringify({ error: { code: 'forbidden', message: 'You do not have permission to perform this action.' } }))
  } else {
    res.statusCode = 501
    res.end(JSON.stringify({ error: { code: 'not_implemented', message: 'Not modeled by this local simulation.' } }))
  }
}).listen(process.env.PORT)
