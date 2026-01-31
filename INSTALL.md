# Краткая инструкция по установке

## Быстрый старт (5 минут)

### 1. Установите необходимое ПО

- [Node.js 18+](https://nodejs.org/)
- [PostgreSQL 14+](https://www.postgresql.org/download/)

### 2. Установите зависимости

```bash
npm install
```

### 3. Настройте базу данных

Создайте базу данных PostgreSQL:

```sql
CREATE DATABASE attendance_db;
```

### 4. Создайте файл .env

Скопируйте и отредактируйте:

```env
DATABASE_URL="postgresql://postgres:ВАШ_ПАРОЛЬ@localhost:5432/attendance_db?schema=public"
JWT_SECRET="придумайте-длинный-случайный-ключ"
CLIENT_ORIGIN="http://localhost:5173"
PORT=5000
```

### 5. Инициализируйте базу данных

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 6. Запустите приложение

```bash
npm run dev
```

### 7. Откройте в браузере

Перейдите на https://localhost:5173

**Войдите как администратор:**
- Email: `admin@mail.ru`
- Пароль: `admin123`

---

## Проверка установки

### Проверьте, что сервер работает:

```bash
curl -k https://localhost:5000/api/health
```

Должен вернуть: `{"status":"ok"}`

### Проверьте подключение к БД:

```bash
npx prisma studio
```

Откроется GUI для просмотра базы данных.

---

## Часто возникающие проблемы

### Ошибка подключения к PostgreSQL

```
Error: Can't reach database server
```

**Решение:**
1. Убедитесь, что PostgreSQL запущен
2. Проверьте правильность DATABASE_URL в .env
3. Проверьте, что база данных создана

### Порт уже занят

```
Error: listen EADDRINUSE: address already in use :::5000
```

**Решение:**
1. Закройте приложение, использующее порт 5000 или 5173
2. Или измените PORT в .env

### SSL сертификаты не найдены

```
Error: ENOENT: no such file or directory 'certs/localhost-key.pem'
```

**Решение:**
Сертификаты должны быть в папке `certs/`. Если их нет, они должны быть созданы при первом запуске или создайте их вручную:

```bash
mkdir certs
cd certs
openssl genrsa -out localhost-key.pem 2048
openssl req -new -x509 -key localhost-key.pem -out localhost-cert.pem -days 365
```

### Ошибка Prisma миграции

```
Error: P3009: migrate found failed migrations
```

**Решение:**
Сбросьте базу данных (УДАЛИТ ВСЕ ДАННЫЕ):

```bash
npx prisma migrate reset
```

---

## Следующие шаги

После успешной установки:

1. **Измените пароль администратора** через интерфейс
2. **Добавьте сотрудников** через админ панель
3. **Протестируйте распознавание лиц** на десктопе
4. **Настройте работу в локальной сети** для мобильных устройств (см. [NETWORK_SETUP.md](./NETWORK_SETUP.md))

---

## Полная документация

Подробная документация доступна в [README.md](./README.md)
