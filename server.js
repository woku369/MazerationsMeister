#!/usr/bin/env node

const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = false
const hostname = 'localhost'
const port = process.env.PORT || 3000

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

console.log(`🚀 Starting MazerationsMeister Server...`)

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  }).listen(port, (err) => {
    if (err) throw err
    console.log(`✅ MazerationsMeister bereit auf http://${hostname}:${port}`)
    console.log(`📱 QR-Codes funktionieren jetzt offline!`)
    console.log(`🔗 Tank-URLs: http://${hostname}:${port}/tank/[id]`)
    console.log(``)
    console.log(`💡 Tipp: Lassen Sie dieses Fenster geöffnet und scannen Sie QR-Codes`)
    console.log(`📝 Zum Beenden: Ctrl+C drücken`)
  })
})