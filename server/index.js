require('./registerTfjs');
const path = require('path');
const fs = require('fs');
const https = require('https');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const { getLocalIpAddress } = require('./utils/networkUtils');
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');
const attendanceRouter = require('./routes/attendance');

const app = express();

const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const LOCAL_IP = getLocalIpAddress();

// CORS configuration для локальной сети
const corsOptions = {
  origin: function (origin, callback) {
    // Разрешаем запросы без origin (например, мобильные приложения или Postman)
    if (!origin) return callback(null, true);

    // Разрешаем localhost и локальную сеть (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    if (
      origin.includes('localhost') || 
      origin.includes('127.0.0.1') || 
      origin.includes('192.168.') ||
      origin.includes('10.') ||
      /172\.(1[6-9]|2[0-9]|3[0-1])\./.test(origin)
    ) {
      callback(null, true);
    } else if (CLIENT_ORIGIN.split(',').includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '15mb' }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/attendance', attendanceRouter);

// Статические файлы
app.use('/models', express.static(path.resolve(__dirname, '../models')));
app.use('/wasm', express.static(path.resolve(__dirname, '../public/wasm')));

if (process.env.NODE_ENV === 'production') {
  const distDir = path.resolve(__dirname, '../dist');

  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));

    app.get('*', (req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }
} else {
  app.get('/', (_req, res) => {
    res.json({ message: 'Attendance Monitoring API' });
  });
}

// SSL сертификаты
const sslOptions = {
  key: fs.readFileSync(path.resolve(__dirname, '../certs/localhost-key.pem')),
  cert: fs.readFileSync(path.resolve(__dirname, '../certs/localhost-cert.pem'))
};

// Создаем HTTPS сервер
const httpsServer = https.createServer(sslOptions, app);

httpsServer.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ HTTPS Server listening on port ${PORT}`);
  console.log(`Local:   https://localhost:${PORT}`);
  console.log(`Network: https://${LOCAL_IP}:${PORT}`);
  console.log(`\n📱 Для подключения мобильных устройств:`);
  console.log(`   1. Убедитесь, что устройство подключено к той же Wi-Fi сети`);
  console.log(`   2. Откройте https://${LOCAL_IP}:5173 в браузере мобильного устройства`);
  console.log(`   3. Примите предупреждение о самоподписанном сертификате`);
  console.log(`\n⚠️  Примечание: Используется самоподписанный сертификат.`);
  console.log(`   На мобильных устройствах нужно принять предупреждение безопасности.`);
});
