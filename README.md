# ReservSys

A full-stack office seat reservation system with interactive floor maps, recurring bookings, check-in validation, admin analytics, and a RAG-powered knowledge base assistant.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS, Recharts, Lucide Icons |
| **Backend** | Python 3.11, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic |
| **Database** | PostgreSQL 15 (via Docker), SQLite (for testing) |
| **Auth** | JWT (HttpOnly cookies), bcrypt |
| **AI / RAG** | LangChain, ChromaDB, HuggingFace Embeddings, LM Studio |
| **DevOps** | Docker, Docker Compose |

## Features

### For Employees
- **Seat Reservation** — Book desks across multiple offices (Warsaw, Poznan) with time range selection
- **Interactive Office Map** — SVG-based visual floor plan with real-time seat availability (Grid/Map toggle)
- **Recurring Reservations** — Schedule daily or weekly recurring bookings with a single action
- **Check-in System** — 15-minute check-in window before and after reservation start time
- **Dashboard** — View, manage, and cancel your reservations with status tracking
- **Notifications** — Real-time alerts for admin cancellations and no-show auto-cancellations
- **Office Help Desk** — RAG-powered chat assistant answering questions from office documentation

### For Administrators
- **Desk Management** — Toggle desks as active/out-of-service
- **Reservation Management** — View and cancel any reservation (with automatic user notification)
- **Analytics Dashboard** — Interactive charts showing:
  - Reservation status breakdown (Pie chart)
  - Most popular seats (Bar chart)
  - Zone occupancy by office (Bar chart)

### System
- **Auto-cancellation** — Background task automatically marks no-shows after the 15-minute check-in window
- **Collision Detection** — Prevents double-bookings for both seats and users
- **Email Simulation** — Console-logged email notifications for no-show events

## Screenshots

<details>
<summary><b>Click to view application screenshots</b></summary>
<br>

**1. Seat Reservation Map (Grid/Map Toggle)**
![Seat Reservation Map](docs/assets/screenshots/seats.png)

**2. User Dashboard & Notifications**
![User Dashboard](docs/assets/screenshots/dashboard.png)

**3. Admin Analytics Panel**
![Admin Analytics Panel](docs/assets/screenshots/admin.png)

**4. Maintenance Scheduling (Admin)**
![Maintenance Scheduling](docs/assets/screenshots/modal.png)

</details>

## Project Structure

```
ReservSys/
├── docker-compose.yml
├── backend/
│   ├── main.py                  # FastAPI app, CORS, background tasks
│   ├── models.py                # SQLAlchemy models (User, Seat, Reservation, Notification)
│   ├── database.py              # Database engine and session
│   ├── config.py                # Pydantic settings (.env loader)
│   ├── crud.py                  # Database operations and collision checks
│   ├── api_schemas.py           # Pydantic request/response schemas
│   ├── rag.py                   # RAG pipeline (LangChain + ChromaDB)
│   ├── seed.py                  # Database seeder (seats + admin account)
│   ├── Dockerfile
│   ├── alembic/                 # Database migrations
│   ├── routers/
│   │   ├── users.py             # Auth (register, login, logout, JWT)
│   │   ├── seats.py             # Seat CRUD and availability
│   │   ├── reservations.py      # Booking, cancellation, check-in
│   │   ├── admin.py             # Analytics endpoints
│   │   └── chat.py              # RAG chat endpoint
│   ├── docs/                    # Office documents for RAG
│   │   ├── it_helpdesk.txt
│   │   └── office_rules.txt
│   └── test_reservations.py     # Pytest test suite
│
└── seat-reservation/            # Next.js frontend
    ├── Dockerfile
    ├── app/
    │   ├── page.tsx             # Root redirect
    │   ├── layout.tsx           # App layout
    │   ├── login/page.tsx       # Login page
    │   ├── register/page.tsx    # Registration page
    │   ├── seats/page.tsx       # Seat reservation (Grid + Map views)
    │   ├── dashboard/page.tsx   # User dashboard
    │   ├── admin/page.tsx       # Admin panel + analytics
    │   └── components/
    │       ├── OfficeMap.tsx     # Interactive SVG floor plan
    │       └── HelpDeskChat.tsx # RAG chat widget
    └── package.json
```

## Getting Started

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommended)
- Or: Python 3.11+, Node.js 18+, PostgreSQL 15+

### Option 1: Docker (Recommended)

```bash
git clone https://github.com/Kkacper04/ReservSys.git
cd ReservSys
docker-compose up --build
```

This starts:
- **PostgreSQL** on port `5432`
- **Backend (FastAPI)** on port `8000`
- **Frontend (Next.js)** on port `3000`

After startup, seed the database:
```bash
docker exec -it reservsys_backend python seed.py
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Option 2: Local Development

**1. Start the database:**
```bash
docker-compose up db
```

**2. Backend:**
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
python seed.py
uvicorn main:app --reload
```

**3. Frontend:**
```bash
cd seat-reservation
npm install
npm run dev
```

**4. RAG Chat (optional):**
Download and run [LM Studio](https://lmstudio.ai/) with any compatible model, then start the local server on port `1234`.

### Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@gmail.com` | `admin123` |

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register` | Register a new user |
| POST | `/api/login` | Login (sets HttpOnly cookie) |
| POST | `/api/logout` | Logout (clears cookie) |

### Seats
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/seats/available` | Get seats with availability for time range |
| POST | `/api/seats/` | Create a new seat (admin) |
| PATCH | `/api/seats/{id}/toggle` | Toggle seat active status (admin) |

### Reservations
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/reservations/` | Create reservation (supports recurrence) |
| GET | `/api/reservations/` | List all reservations (admin) |
| GET | `/api/reservations/my` | List current user's reservations |
| DELETE | `/api/reservations/{id}/cancel` | Cancel reservation (admin) |
| PATCH | `/api/reservations/{id}/my-cancel` | Cancel own reservation |
| PATCH | `/api/reservations/{id}/checkin` | Check in to reservation |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/analytics` | Get analytics data (admin) |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/` | Ask the office knowledge base |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/me/notifications` | Get unread notifications |
| PATCH | `/api/me/notifications/{id}/read` | Mark notification as read |

## Environment Variables

### Backend (`backend/.env`)

```env
DATABASE_URL=postgresql://admin:admin@localhost:5432/reservation_system
# When using Docker, DATABASE_URL should point to the db container:
# DATABASE_URL=postgresql://admin:admin@db:5432/reservation_system

SECRET_KEY=your-super-secret-jwt-key
ALGORITHM=HS256
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
ADMIN_PASSWORD=admin123
LM_STUDIO_URL=http://localhost:1234/v1
# When using Docker and LM Studio on Windows/Mac, use:
# LM_STUDIO_URL=http://host.docker.internal:1234/v1
```

### Frontend (`seat-reservation/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Testing

```bash
cd backend
pytest test_reservations.py -v
```

Tests use an in-memory SQLite database and do not require PostgreSQL.

## License

This project is for educational and portfolio purposes.
