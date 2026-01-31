# Руководство по развертыванию

Это руководство описывает процесс развертывания системы мониторинга посещаемости в production окружении.

## Содержание

- [Общие требования](#общие-требования)
- [Подготовка к деплою](#подготовка-к-деплою)
- [Развертывание на VPS/Dedicated Server](#развертывание-на-vpsdedicated-server)
- [Развертывание на Heroku](#развертывание-на-heroku)
- [Развертывание с Docker](#развертывание-с-docker)
- [Настройка доменного имени и SSL](#настройка-доменного-имени-и-ssl)
- [Мониторинг и логирование](#мониторинг-и-логирование)
- [Резервное копирование](#резервное-копирование)

---

## Общие требования

### Минимальные системные требования

**Для небольшой нагрузки (до 100 пользователей):**
- CPU: 2 cores
- RAM: 4 GB
- Storage: 20 GB SSD
- Network: 100 Mbps

**Для средней нагрузки (100-1000 пользователей):**
- CPU: 4 cores
- RAM: 8 GB
- Storage: 50 GB SSD
- Network: 1 Gbps

### Программное обеспечение

- Node.js >= 18.0
- PostgreSQL >= 14.0
- Nginx (рекомендуется)
- SSL сертификат (Let's Encrypt)
- PM2 или другой процесс-менеджер

---

## Подготовка к деплою

### 1. Проверка кода

```bash
# Убедитесь, что приложение работает локально
npm run dev

# Проверьте сборку
npm run build

# Проверьте production сервер
NODE_ENV=production npm start
```

### 2. Обновите .env для production

```env
# База данных (используйте production БД)
DATABASE_URL="postgresql://user:password@db-host:5432/attendance_prod"

# JWT секрет (сгенерируйте криптографически стойкий ключ)
JWT_SECRET="ваш-очень-длинный-и-случайный-секретный-ключ-минимум-32-символа"

# CORS origin (ваш production домен)
CLIENT_ORIGIN="https://yourdomain.com"

# Порт
PORT=5000

# Окружение
NODE_ENV="production"
```

**Генерация JWT секрета:**
```bash
# Используйте Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Или OpenSSL
openssl rand -base64 32
```

### 3. Настройка базы данных

```bash
# Создайте production базу данных
createdb attendance_prod

# Примените миграции
npm run prisma:migrate

# НЕ запускайте seed в production!
# Создайте админа вручную после деплоя
```

---

## Развертывание на VPS/Dedicated Server

### Шаг 1: Подготовка сервера

```bash
# Подключитесь к серверу
ssh user@your-server-ip

# Обновите систему (Ubuntu/Debian)
sudo apt update && sudo apt upgrade -y

# Установите необходимое ПО
sudo apt install -y curl git build-essential

# Установите Node.js (через nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# Установите PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Установите PM2 глобально
npm install -g pm2

# Установите Nginx
sudo apt install -y nginx

# Установите certbot для SSL
sudo apt install -y certbot python3-certbot-nginx
```

### Шаг 2: Настройка PostgreSQL

```bash
# Войдите в PostgreSQL
sudo -u postgres psql

# Создайте пользователя и базу данных
CREATE USER attendance_user WITH PASSWORD 'secure_password';
CREATE DATABASE attendance_prod OWNER attendance_user;
GRANT ALL PRIVILEGES ON DATABASE attendance_prod TO attendance_user;

# Выйдите
\q

# Настройте PostgreSQL для удаленных подключений (если нужно)
sudo nano /etc/postgresql/14/main/postgresql.conf
# Раскомментируйте: listen_addresses = 'localhost'

sudo nano /etc/postgresql/14/main/pg_hba.conf
# Добавьте: host attendance_prod attendance_user 127.0.0.1/32 md5

# Перезапустите PostgreSQL
sudo systemctl restart postgresql
```

### Шаг 3: Клонирование и настройка проекта

```bash
# Создайте директорию для приложения
sudo mkdir -p /var/www/attendance
sudo chown -R $USER:$USER /var/www/attendance

# Клонируйте проект
cd /var/www/attendance
git clone <your-repo-url> .

# Или загрузите через SCP
# На локальной машине:
# scp -r /path/to/project user@server:/var/www/attendance

# Установите зависимости
npm install --production

# Создайте .env файл
nano .env
# Вставьте production конфигурацию

# Соберите клиент
npm run build

# Примените миграции БД
npm run prisma:generate
npm run prisma:migrate

# Создайте admin пользователя
npm run prisma:seed
```

### Шаг 4: Настройка SSL сертификатов

```bash
# Получите SSL сертификат от Let's Encrypt
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com

# Сертификаты будут сохранены в:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem

# Настройте автоматическое обновление
sudo certbot renew --dry-run
```

### Шаг 5: Настройка Nginx

```bash
# Создайте конфигурацию Nginx
sudo nano /etc/nginx/sites-available/attendance

# Вставьте конфигурацию:
```

```nginx
# Редирект с HTTP на HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS сервер
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL сертификаты
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL настройки
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Статические файлы (клиент)
    location / {
        root /var/www/attendance/dist;
        try_files $uri $uri/ /index.html;
        
        # Кэширование статики
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API проксирование
    location /api {
        proxy_pass https://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Таймауты
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Модели и статика
    location /models {
        proxy_pass https://localhost:5000;
    }

    location /wasm {
        proxy_pass https://localhost:5000;
    }

    # Логирование
    access_log /var/log/nginx/attendance_access.log;
    error_log /var/log/nginx/attendance_error.log;
}
```

```bash
# Активируйте конфигурацию
sudo ln -s /etc/nginx/sites-available/attendance /etc/nginx/sites-enabled/

# Проверьте конфигурацию
sudo nginx -t

# Перезапустите Nginx
sudo systemctl restart nginx
```

### Шаг 6: Запуск с PM2

```bash
# Создайте PM2 конфигурацию
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'attendance-monitor',
    script: './server/index.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
```

```bash
# Создайте директорию для логов
mkdir logs

# Запустите приложение
pm2 start ecosystem.config.js

# Настройте автозапуск
pm2 startup
pm2 save

# Проверьте статус
pm2 status
pm2 logs attendance-monitor

# Другие полезные команды
pm2 restart attendance-monitor
pm2 stop attendance-monitor
pm2 delete attendance-monitor
pm2 monit
```

### Шаг 7: Настройка Firewall

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
sudo ufw enable

# Проверьте правила
sudo ufw status
```

---

## Развертывание на Heroku

### Шаг 1: Подготовка

```bash
# Установите Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# Войдите в Heroku
heroku login

# Создайте приложение
heroku create your-app-name
```

### Шаг 2: Добавьте PostgreSQL

```bash
# Добавьте Heroku Postgres
heroku addons:create heroku-postgresql:hobby-dev

# Получите DATABASE_URL (автоматически добавится в env)
heroku config:get DATABASE_URL
```

### Шаг 3: Настройте переменные окружения

```bash
# Добавьте переменные
heroku config:set JWT_SECRET="your-secret-key"
heroku config:set NODE_ENV="production"
heroku config:set CLIENT_ORIGIN="https://your-app-name.herokuapp.com"

# Проверьте переменные
heroku config
```

### Шаг 4: Создайте Procfile

```bash
# Создайте Procfile в корне проекта
echo "web: npm start" > Procfile
```

### Шаг 5: Обновите package.json

```json
{
  "scripts": {
    "start": "node server/index.js",
    "build": "vite build",
    "heroku-postbuild": "npm run build && npm run prisma:generate"
  },
  "engines": {
    "node": "18.x",
    "npm": "9.x"
  }
}
```

### Шаг 6: Deploy

```bash
# Инициализируйте git (если еще не сделано)
git init
git add .
git commit -m "Initial commit"

# Добавьте Heroku remote
heroku git:remote -a your-app-name

# Deploy
git push heroku main

# Примените миграции
heroku run npm run prisma:migrate

# Создайте админа
heroku run npm run prisma:seed

# Откройте приложение
heroku open

# Просмотр логов
heroku logs --tail
```

---

## Развертывание с Docker

### Шаг 1: Создайте Dockerfile

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Копируем package files
COPY package*.json ./
COPY prisma ./prisma/

# Устанавливаем зависимости
RUN npm ci

# Копируем исходники
COPY . .

# Генерируем Prisma Client
RUN npm run prisma:generate

# Собираем клиент
RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

# Копируем package files
COPY package*.json ./
COPY prisma ./prisma/

# Устанавливаем только production зависимости
RUN npm ci --production

# Копируем собранные файлы
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/models ./models
COPY --from=builder /app/public ./public
COPY --from=builder /app/certs ./certs
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Открываем порт
EXPOSE 5000

# Запускаем приложение
CMD ["node", "server/index.js"]
```

### Шаг 2: Создайте docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    container_name: attendance_db
    environment:
      POSTGRES_USER: attendance_user
      POSTGRES_PASSWORD: secure_password
      POSTGRES_DB: attendance_prod
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U attendance_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build: .
    container_name: attendance_app
    environment:
      DATABASE_URL: "postgresql://attendance_user:secure_password@postgres:5432/attendance_prod"
      JWT_SECRET: "your-secret-key"
      CLIENT_ORIGIN: "https://yourdomain.com"
      NODE_ENV: "production"
      PORT: 5000
    ports:
      - "5000:5000"
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

volumes:
  postgres_data:
```

### Шаг 3: Создайте .dockerignore

```
node_modules
npm-debug.log
dist
.env
.env.local
.git
.gitignore
README.md
```

### Шаг 4: Запустите

```bash
# Соберите и запустите
docker-compose up -d

# Примените миграции
docker-compose exec app npm run prisma:migrate

# Создайте админа
docker-compose exec app npm run prisma:seed

# Просмотр логов
docker-compose logs -f app

# Остановить
docker-compose down

# Остановить и удалить данные
docker-compose down -v
```

---

## Настройка доменного имени и SSL

### С Let's Encrypt (рекомендуется)

```bash
# Получите сертификат
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Автоматическое обновление (проверка)
sudo certbot renew --dry-run
```

### С собственным сертификатом

```bash
# Поместите сертификаты в /etc/ssl/
sudo cp your-cert.crt /etc/ssl/certs/
sudo cp your-key.key /etc/ssl/private/

# Обновите Nginx конфигурацию
ssl_certificate /etc/ssl/certs/your-cert.crt;
ssl_certificate_key /etc/ssl/private/your-key.key;
```

---

## Мониторинг и логирование

### PM2 мониторинг

```bash
# Real-time мониторинг
pm2 monit

# Веб-дашборд (опционально)
pm2 link <secret> <public>
```

### Логирование с Winston

```javascript
// Добавьте в server/index.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

### Мониторинг PostgreSQL

```bash
# Установите pg_stat_statements
sudo -u postgres psql -d attendance_prod
CREATE EXTENSION pg_stat_statements;

# Просмотр медленных запросов
SELECT query, mean_exec_time 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

---

## Резервное копирование

### Автоматический бэкап PostgreSQL

```bash
# Создайте скрипт backup.sh
nano /var/www/attendance/backup.sh
```

```bash
#!/bin/bash

# Конфигурация
DB_NAME="attendance_prod"
DB_USER="attendance_user"
BACKUP_DIR="/var/backups/attendance"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="backup_${DATE}.sql.gz"

# Создайте директорию если не существует
mkdir -p $BACKUP_DIR

# Создайте бэкап
PGPASSWORD="secure_password" pg_dump -U $DB_USER -h localhost $DB_NAME | gzip > $BACKUP_DIR/$FILENAME

# Удалите старые бэкапы (старше 30 дней)
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: $FILENAME"
```

```bash
# Сделайте скрипт исполняемым
chmod +x /var/www/attendance/backup.sh

# Добавьте в crontab (ежедневно в 2:00)
crontab -e
# Добавьте строку:
0 2 * * * /var/www/attendance/backup.sh >> /var/log/attendance_backup.log 2>&1
```

### Восстановление из бэкапа

```bash
# Распакуйте и восстановите
gunzip < /var/backups/attendance/backup_20250101_020000.sql.gz | \
  PGPASSWORD="secure_password" psql -U attendance_user -h localhost attendance_prod
```

---

## Обновление приложения

```bash
# С Git
cd /var/www/attendance
git pull origin main

# Установите зависимости (если изменились)
npm install --production

# Примените миграции БД (если есть)
npm run prisma:migrate

# Пересоберите клиент
npm run build

# Перезапустите PM2
pm2 restart attendance-monitor

# Проверьте логи
pm2 logs attendance-monitor
```

---

## Troubleshooting

### Проверка статуса сервисов

```bash
# Nginx
sudo systemctl status nginx
sudo nginx -t

# PostgreSQL
sudo systemctl status postgresql
sudo -u postgres psql -c "SELECT version();"

# PM2
pm2 status
pm2 logs

# Firewall
sudo ufw status
```

### Общие проблемы

**502 Bad Gateway:**
- Проверьте, что PM2 приложение запущено
- Проверьте порт в Nginx конфигурации
- Проверьте логи: `pm2 logs`

**База данных недоступна:**
- Проверьте PostgreSQL: `sudo systemctl status postgresql`
- Проверьте DATABASE_URL в .env
- Проверьте подключение: `psql $DATABASE_URL`

**SSL ошибки:**
- Проверьте пути к сертификатам
- Обновите сертификаты: `sudo certbot renew`
- Проверьте права доступа к сертификатам

---

**Готово!** Ваше приложение развернуто в production. 🚀
