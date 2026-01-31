# Архитектура приложения

## Обзор

Система мониторинга посещаемости построена по классической клиент-серверной архитектуре с использованием современного стека веб-технологий.

## Общая архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer (React)                     │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐  │
│  │   Pages    │  │ Components │  │  Services & Utils    │  │
│  │            │  │            │  │                      │  │
│  │ - Landing  │  │ - Admin    │  │ - API Client (Axios) │  │
│  │ - Login    │  │ - Common   │  │ - Face Detection     │  │
│  │ - Admin    │  │ - Face     │  │ - Liveness Check     │  │
│  │ - Employee │  │   Camera   │  │ - Auth Context       │  │
│  └────────────┘  └────────────┘  └──────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTPS (Port 5173)
                         │ JWT in HttpOnly Cookies
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    Server Layer (Express)                   │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐  │
│  │  Routes    │  │ Middleware │  │      Services        │  │
│  │            │  │            │  │                      │  │
│  │ - Auth     │  │ - Auth     │  │ - Face Recognition   │  │
│  │ - Admin    │  │ - CORS     │  │ - User Management    │  │
│  │ - Attend.  │  │ - Error    │  │ - Attendance Logic   │  │
│  │            │  │ - Logger   │  │ - Validation         │  │
│  └────────────┘  └────────────┘  └──────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Prisma ORM (Data Layer)                   │   │
│  └────────────────────┬─────────────────────────────────┘   │
└────────────────────────┼─────────────────────────────────────┘
                         │
                         │ TCP (Port 5432)
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   Database (PostgreSQL)                     │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │   Users    │  │     Face     │  │   Attendance     │    │
│  │            │  │  Descriptors │  │     Records      │    │
│  └────────────┘  └──────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Frontend архитектура

### Технологии

- **React 18.3** - UI библиотека
- **React Router 6** - Маршрутизация
- **Vite 5** - Build tool и dev server
- **TensorFlow.js** - ML в браузере
- **Face-API.js** - Распознавание лиц

### Структура

```
src/
├── main.jsx                 # Точка входа
├── App.jsx                  # Главный компонент с роутингом
│
├── pages/                   # Страницы приложения
│   ├── LandingPage.jsx      # Главная страница
│   ├── LoginPage.jsx        # Страница входа
│   ├── MobileAttendancePage.jsx  # Мобильная страница отметки
│   ├── admin/               # Админ-панель
│   │   ├── AdminDashboard.jsx
│   │   ├── UsersPage.jsx
│   │   └── AttendancePage.jsx
│   └── employee/            # Страницы сотрудника
│       ├── EmployeeDashboard.jsx
│       ├── RegisterFace.jsx
│       └── AttendanceHistory.jsx
│
├── components/              # Переиспользуемые компоненты
│   ├── common/             # Общие компоненты
│   │   ├── Button.jsx
│   │   ├── Modal.jsx
│   │   └── Loading.jsx
│   ├── admin/              # Компоненты админки
│   │   ├── UserTable.jsx
│   │   ├── UserForm.jsx
│   │   └── AttendanceTable.jsx
│   ├── attendance/         # Компоненты посещаемости
│   │   ├── FaceCamera.jsx
│   │   ├── LivenessCheck.jsx
│   │   └── AttendanceCard.jsx
│   ├── ProtectedRoute.jsx  # HOC для защищенных роутов
│   └── ErrorBoundary.jsx   # Обработка ошибок React
│
├── context/                # React Context
│   └── AuthContext.jsx     # Контекст аутентификации
│
├── lib/                    # Библиотеки и утилиты
│   ├── faceApi.js         # Face-API инициализация
│   ├── liveness.js        # Liveness detection
│   └── api.js             # Axios клиент
│
└── styles/                # CSS стили
    └── global.css
```

### Потоки данных

#### 1. Аутентификация

```
LoginPage → API.login() → Server validates → JWT Cookie set
                                            ↓
                                    AuthContext updated
                                            ↓
                                    Redirect to dashboard
```

#### 2. Регистрация лица

```
Camera → Face Detection (Face-API) → Extract Descriptor (128D vector)
                                            ↓
                                    API.registerFace(descriptor)
                                            ↓
                                    Server stores in DB
```

#### 3. Проверка посещаемости

```
Camera → Face Detection → Extract Descriptor → Liveness Check
                                                      ↓
                                    API.verify(descriptor, livenessScore)
                                                      ↓
                        Server compares with stored descriptors (Euclidean distance)
                                                      ↓
                                    Match found? → Create attendance record
                                                      ↓
                                    Return result to client
```

---

## Backend архитектура

### Технологии

- **Express 4** - Web framework
- **Prisma 5** - ORM
- **JWT** - Аутентификация
- **bcrypt** - Хеширование паролей
- **HTTPS** - Безопасное соединение

### Структура

```
server/
├── index.js                # Точка входа сервера
├── prismaClient.js         # Prisma singleton
├── registerTfjs.js         # TensorFlow.js config для Node.js
│
├── routes/                 # API роуты
│   ├── auth.js            # Аутентификация
│   ├── admin.js           # Админ endpoints
│   └── attendance.js      # Посещаемость endpoints
│
├── middleware/            # Express middleware
│   ├── authMiddleware.js  # JWT проверка
│   ├── roleMiddleware.js  # Проверка ролей
│   └── errorHandler.js    # Обработка ошибок
│
├── services/              # Бизнес-логика
│   ├── authService.js     # Логика аутентификации
│   ├── faceService.js     # Логика распознавания
│   └── userService.js     # Логика пользователей
│
└── utils/                 # Утилиты
    ├── networkUtils.js    # Определение IP
    ├── validation.js      # Zod схемы
    └── constants.js       # Константы
```

### API Flow

#### 1. Аутентификация запроса

```
Request → authMiddleware → Verify JWT → Extract user
                ↓                              ↓
           401 Error                    Attach to req.user
                                               ↓
                                        Route handler
```

#### 2. Создание записи посещаемости

```
POST /api/attendance/verify
        ↓
   Auth Middleware (JWT check)
        ↓
   Validate request body (Zod)
        ↓
   Extract descriptor from request
        ↓
   Get all face descriptors from DB
        ↓
   Calculate Euclidean distances
        ↓
   Find best match (distance < 0.6)
        ↓
   Match found? → Check liveness score → Create attendance record
        ↓
   Return result
```

---

## Database архитектура

### Схема данных

```
┌─────────────────────────────┐
│          User               │
├─────────────────────────────┤
│ id: UUID (PK)              │
│ email: String (UNIQUE)     │
│ passwordHash: String       │
│ role: Enum (ADMIN/EMPLOYEE)│
│ fullName: String           │
│ isActive: Boolean          │
│ createdAt: DateTime        │
│ updatedAt: DateTime        │
└─────────────┬───────────────┘
              │
              │ 1:1
              │
┌─────────────▼───────────────┐      ┌──────────────────────────┐
│    FaceDescriptor           │      │      Attendance          │
├─────────────────────────────┤      ├──────────────────────────┤
│ id: UUID (PK)              │      │ id: UUID (PK)            │
│ descriptor: Float[] (128D) │      │ userId: UUID (FK)        │
│ userId: UUID (FK)          │      │ type: Enum (IN/OUT)      │
│ createdAt: DateTime        │      │ confidence: Float        │
└─────────────────────────────┘      │ livenessScore: Float     │
                                     │ createdAt: DateTime      │
                                     └──────────────────────────┘
                                              ▲
                                              │
                                              │ 1:N
                                              │
                                     ┌────────┴────────┐
                                     │      User       │
                                     └─────────────────┘
```

### Индексы

- `User.email` - UNIQUE index для быстрого поиска
- `FaceDescriptor.userId` - UNIQUE index (один дескриптор на пользователя)
- `Attendance.userId` - Index для быстрой выборки по пользователю
- `Attendance.createdAt` - Index для сортировки и фильтрации по дате

---

## Безопасность

### 1. Аутентификация

```
Password → bcrypt.hash(password, 10) → Store in DB
                                         ↓
Login → bcrypt.compare(input, hash) → Match? → Generate JWT
                                                      ↓
                                    JWT stored in HttpOnly Cookie
                                                      ↓
                                    All requests include cookie
                                                      ↓
                                    Server verifies JWT on each request
```

**Параметры JWT:**
- Algorithm: HS256
- Expiry: 7 days
- HttpOnly: true
- Secure: true (HTTPS only)
- SameSite: Strict

### 2. HTTPS

```
Client ←→ HTTPS (TLS 1.2+) ←→ Server
          Self-signed cert (dev)
          Let's Encrypt (prod)
```

### 3. CORS

```javascript
// Разрешенные origins
- localhost:5173 (dev)
- 192.168.x.x:5173 (local network)
- yourdomain.com (prod)

// Credentials
- cookies: true
- headers: allowed
```

### 4. Валидация данных

```
Request → Zod schema validation → Valid? → Process
                ↓                             ↓
           400 Error                     Response
```

---

## ML компоненты

### 1. Face Detection (Face-API.js)

**Модели:**
- SSD MobileNetV1 - детекция лица
- Face Landmark 68 - ключевые точки лица
- Face Recognition - 128D дескриптор

**Pipeline:**
```
Image → Face Detection → Face Landmarks → Face Descriptor
        (bounding box)   (68 points)      (128D vector)
```

**Threshold:**
- Detection confidence: > 0.5
- Recognition distance: < 0.6 (Euclidean distance)

### 2. Liveness Detection

**Технология:** WASM модуль с анализом текстуры лица

**Метрики:**
- Texture analysis
- Motion detection
- Depth estimation

**Threshold:**
- Liveness score: > 0.5

**Flow:**
```
Video frame → WASM module → Analyze texture/motion → Score (0-1)
                                                         ↓
                                                    Pass? → Allow
                                                    Fail? → Reject
```

---

## Производительность

### Frontend оптимизации

1. **Lazy loading компонентов**
   ```javascript
   const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
   ```

2. **Кэширование ML моделей**
   - Модели загружаются один раз при инициализации
   - Хранятся в памяти браузера

3. **Оптимизация камеры**
   - Обработка каждого N-го кадра (не каждого)
   - Canvas resize для уменьшения вычислений

### Backend оптимизации

1. **Prisma connection pooling**
   ```
   connection_limit=10
   ```

2. **Индексы БД**
   - Все внешние ключи проиндексированы
   - Email индексирован для быстрого поиска

3. **Сжатие ответов** (можно добавить)
   ```javascript
   app.use(compression());
   ```

---

## Масштабируемость

### Горизонтальное масштабирование

**Проблемы:**
1. JWT в cookies - нужна shared session store (Redis)
2. HTTPS сертификаты - использовать load balancer

**Решение:**
```
┌──────────┐
│  Nginx   │ ← Load Balancer
│  (LB)    │
└────┬─────┘
     │
     ├─────→ Server 1
     ├─────→ Server 2
     └─────→ Server 3
           ↓
     ┌─────────────┐
     │  PostgreSQL │
     │   (Primary) │
     └─────────────┘
           ↓
     ┌─────────────┐
     │    Redis    │
     │  (Sessions) │
     └─────────────┘
```

### Вертикальное масштабирование

**Рекомендуемые ресурсы:**

**Development:**
- RAM: 4 GB
- CPU: 2 cores
- Storage: 10 GB

**Production (до 1000 пользователей):**
- RAM: 8 GB
- CPU: 4 cores
- Storage: 50 GB SSD

**Production (до 10000 пользователей):**
- RAM: 16 GB
- CPU: 8 cores
- Storage: 200 GB SSD

---

## Мониторинг

### Метрики для отслеживания

**Backend:**
- Request rate (requests/sec)
- Response time (ms)
- Error rate (%)
- CPU usage (%)
- Memory usage (%)
- Database connections

**Frontend:**
- Page load time
- Face detection time
- Camera initialization time
- API response time

### Рекомендуемые инструменты

- **Logging:** Winston, Morgan
- **Monitoring:** PM2, New Relic
- **Error tracking:** Sentry
- **Analytics:** Google Analytics, Mixpanel

---

## Будущие улучшения

### 1. Микросервисная архитектура

```
API Gateway
    ↓
    ├─→ Auth Service
    ├─→ User Service
    ├─→ Face Recognition Service
    └─→ Attendance Service
```

### 2. WebSocket для real-time

```
Server → WebSocket → Client
  ↓
New attendance → Push notification
```

### 3. Mobile приложения

```
React Native
    ↓
Shared API (REST)
```

### 4. Advanced ML

- Anti-spoofing улучшения
- Эмоций распознавание
- Маски детекция
- Возраст/пол анализ
