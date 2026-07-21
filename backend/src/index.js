const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const { getConfig } = require('./config');
const { ipFilter, apiLimiter } = require('./middleware/security');
const { setSocketIO, scanLibrary, initWatcher, logToDashboard, getSystemLogs, getLibrary } = require('./services/scanner');
const { startTunnel, setSocketIO: setTunnelSocket, getTunnelInfo } = require('./services/tunnel');

const authRouter = require('./routes/auth');
const filesRouter = require('./routes/files');

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: '*' }));
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(ipFilter);
app.use('/api/', apiLimiter);

app.use('/cache/thumbnails', express.static(path.join(__dirname, '..', 'cache', 'thumbnails')));

app.use('/api/auth', authRouter);
app.use('/api/files', filesRouter);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

setSocketIO(io);
setTunnelSocket(io);

const connectedClients = new Map();

io.on('connection', (socket) => {
  const clientIp = (socket.handshake.headers['x-forwarded-for'] || socket.handshake.address || '').split(',')[0].trim();
  const socketId = socket.id;

  connectedClients.set(socketId, {
    id: socketId,
    ip: clientIp,
    connectedAt: new Date().toISOString(),
    username: 'Guest'
  });

  logToDashboard('Socket', `User connected from ${clientIp}`);
  io.emit('clients-count', connectedClients.size);

  socket.emit('tunnel-status', getTunnelInfo());
  socket.emit('initial-logs', getSystemLogs());
  socket.emit('library-updated', getLibrary());

  socket.on('disconnect', () => {
    connectedClients.delete(socketId);
    logToDashboard('Socket', `User disconnected: ${clientIp}`);
    io.emit('clients-count', connectedClients.size);
  });
});

async function startServer() {
  const config = getConfig();
  const port = config.port || 5000;

  initWatcher();
  scanLibrary();

  server.listen(port, () => {
    const localUrl = `http://localhost:${port}`;
    console.log(`Media Server backend listening on ${localUrl}`);
    logToDashboard('System', `Media Server boot successful. Local address: ${localUrl}`);
    
    startTunnel(port).catch(err => {
      console.error('Failed to initialize public tunnel:', err);
    });
  });
}

startServer();
