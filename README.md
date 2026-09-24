🏥 Klinik Backend API

Klinik is a full-featured hospital management, telemedicine, and AI-assisted healthcare backend. It provides authentication, appointments, electronic medical records, real-time doctor-patient communication, and an AI medical assistant with RAG-based hospital policy retrieval.

📌 Table of Contents
🚀 Features
🛠️ System Architecture & Tech Stack
📁 Project Structure
⚙️ Prerequisites
🏁 Getting Started
🔐 Environment Configuration
🗄️ Database Management
📡 API Endpoints
⚡ Real-Time Socket Events
🤖 AI Engine & RAG
🔒 Security
📄 License
🚀 1. Features
| Feature | Description |
|---|---|
| 🔐 Authentication & RBAC | JWT authentication with patient, doctor, and admin roles |
| 📅 Appointment Scheduling | Booking, approval, cancellation, completion and notifications |
| 👨‍⚕️ Doctor Profiles | Specialization, fees, availability and consultation presence |
| 👤 Patient Profiles | Medical history and health information |
| 📝 Medical Records | Diagnoses, prescriptions, treatment plans and dietary information |
| 💬 Real-Time Chat | Socket.IO messaging with file/media sharing |
| 📹 Telemedicine | WebRTC / Agora / Twilio-based video consultation |
| 🤖 AI Health Assistant | Google Gemini-powered conversational healthcare assistant |
| 🧠 RAG | Semantic search over hospital policies and knowledge base |
| 📄 Medical Report Analysis | OCR using Tesseract.js and PDF extraction using pdf-parse |

The AI agent supports ReAct tool calling for doctor recommendations, appointment queries, and symptom triage.

🛠️ 2. System Architecture & Tech Stack
Backend
Runtime: Node.js v20+ / v22 recommended
Framework: Express.js
Authentication: JWT + bcrypt
API: REST API
Real-Time: Socket.IO
Databases
| Database | Technology | Purpose |
|---|---|---|
| 🐘 PostgreSQL | Prisma ORM | Users, appointments, doctors, patients, prescriptions, policies |
| 🍃 MongoDB | Mongoose | Chat messages, logs and document archives |
AI
Google Gemini API
Vector embeddings
Intent classification
ReAct agent
RAG semantic search
Other Technologies
Multer — file uploads
Nodemailer — email
Brevo — transactional email
WebRTC — video communication
Tesseract.js — OCR
pdf-parse — PDF text extraction

The architecture uses PostgreSQL for structured relational data and MongoDB for unstructured real-time data.

📁 3. Project Directory Structure
backend/
│
├── ai/
│   ├── config/
│   ├── embeddings/
│   ├── llm/
│   ├── rag/
│   └── tools/
│
├── config/
├── controllers/
├── middleware/
├── models/
├── prisma/
│   └── schema.prisma
│
├── routes/
├── scripts/
├── uploads/
├── utils/
│
├── app.js
├── server.js
├── socket.js
├── package.json
└── .env.example
📂 Important folders
| Folder | Responsibility |
|---|---|
| `ai/` | Gemini, RAG, embeddings and AI tools |
| `config/` | Database configuration |
| `controllers/` | Request/response business logic |
| `middleware/` | Authentication, roles, uploads and errors |
| `models/` | Mongoose schemas |
| `prisma/` | PostgreSQL schema and migrations |
| `routes/` | Express API routes |
| `scripts/` | Database synchronization scripts |
| `uploads/` | Reports and media |
| `utils/` | Email, tokens and helper functions |

This structure is documented in the project README.

⚙️ 4. Prerequisites

Before running the backend, install:

Node.js >= 20.x
MongoDB
PostgreSQL >= 14
Git

Node.js v22 was tested/recommended in the project documentation.

🏁 5. Getting Started
Step 1 — Clone Repository
git clone https://github.com/your-username/klinik.git
cd klinik/backend
Step 2 — Install Dependencies
npm install
Step 3 — Create .env
Linux / macOS
cp .env.example .env
Windows PowerShell
Copy-Item .env.example .env
Step 4 — Configure PostgreSQL

Generate Prisma Client:

npx prisma generate

Synchronize the database:

npx prisma db push
Step 5 — Start Backend
Development
npm run dev
Production
npm start

The server runs by default on:

http://localhost:5001

or on the port configured through PORT.

🔐 6. Environment Configuration

Create:

backend/.env

Example configuration:

PORT=5001
NODE_ENV=development

FRONTEND_URL=http://localhost:5173

JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

MONGODB_URI=mongodb://127.0.0.1:27017/klinik

DATABASE_URL=postgresql://user:pass@localhost:5432/klinik_db

GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASSWORD=app_password

BREVO_API_KEY=your_brevo_api_key

⚠️ Important: Never commit the real .env file to GitHub or another public repository.

🗄️ 7. Database Management
Prisma Studio

Open PostgreSQL data in a visual interface:

npx prisma studio
Push Schema Changes
npx prisma db push
MongoDB → PostgreSQL Synchronization
node scripts/syncMongoToPostgres.js

These commands are specified in the project's database management section.

📡 8. API Endpoints
🔐 Authentication

Base URL: /api/auth

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/register` | Public | Register patient/doctor |
| `POST` | `/login` | Public | Login |
| `GET` | `/me` | Authenticated | Current user |
| `POST` | `/forgotpassword` | Public | Password reset request |
| `PUT` | `/resetpassword/:token` | Public | Reset password |
📅 Appointments

Base URL: /api/appointments

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/` | Patient | Book appointment |
| `GET` | `/my` | Patient / Doctor | Get appointments |
| `PUT` | `/:id/cancel` | Patient / Doctor / Admin | Cancel appointment |
👨‍⚕️ Doctors

Base URL: /api/doctors

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/` | Public | List doctors |
| `GET` | `/me` | Doctor / Admin | Doctor profile |
| `POST` | `/profile` | Doctor | Update profile |
| `PUT` | `/presence` | Doctor | Toggle availability |
| `GET` | `/notifications` | Doctor | Get notifications |
🏥 Patients

Base URL: /api/patients

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/me` | Patient / Admin | Patient health profile |
| `POST` | `/upload-report` | Patient | Upload medical report |
| `POST` | `/chat-ai` | Patient | AI health chat |
| `PUT` | `/todo/toggle` | Patient | Toggle medical task |
🤖 9. AI Engine

The AI system contains several major components:

                ┌─────────────────────┐
                │     User Query      │
                └──────────┬──────────┘
                           ↓
                ┌─────────────────────┐
                │  Intent Detection   │
                └──────────┬──────────┘
                           ↓
                ┌─────────────────────┐
                │   ReAct AI Agent    │
                └──────────┬──────────┘
                           ↓
          ┌────────────────┼────────────────┐
          ↓                ↓                ↓
     Doctor Search    Appointment       Policy RAG
                        Search
          │                │                │
          └────────────────┼────────────────┘
                           ↓
                ┌─────────────────────┐
                │    Google Gemini    │
                └──────────┬──────────┘
                           ↓
                ┌─────────────────────┐
                │  Final AI Response  │
                └─────────────────────┘
AI capabilities
1. 🏥 Hospital Assistant

The ReAct-based assistant can:

Answer hospital-related questions
Search doctors by specialty
Assist with appointment scheduling
2. 📚 Policy RAG

Hospital policy PDFs are:

PDF
 ↓
Text Extraction
 ↓
Chunking
 ↓
Embeddings
 ↓
Vector Storage
 ↓
Semantic Search
 ↓
Top-K Relevant Chunks
 ↓
Gemini
 ↓
Grounded Response
3. 📄 Medical OCR

Medical reports can be processed using:

Medical Report
      ↓
Tesseract.js / PDF Parser
      ↓
Extracted Text
      ↓
Structured Findings
      ↓
AI Explanation

The README specifically describes policy RAG and medical OCR as core AI capabilities.

🧠 AI API Endpoints

Base URLs: /api/ai and /api/public

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/public/hospital-chat` | Public | Hospital chatbot |
| `POST` | `/api/ai/chat` | Public / Auth | ReAct AI agent |
| `POST` | `/api/ai/intent` | Public | Intent classification |
| `POST` | `/api/ai/rag-search` | Public | Policy semantic search |
| `GET` | `/api/ai/policies` | Public | Published policies |
| `GET` | `/api/ai/settings` | Public | AI configuration |

💬 10. Real-Time Chat

The application uses Socket.IO for real-time communication.

| Event | Direction | Purpose |
|---|---|---|
| `join_room` | Client → Server | Join consultation room |
| `register` | Client → Server | Register notification room |
| `send_message` | Client → Server | Send message |
| `receive_message` | Server → Client | Receive message |
| `user_typing` | Client → Server | Typing indicator |

Example:

socket.emit("join_room", {
  roomId: "consultation_123"
});

The backend uses room-based isolation for consultations and user notifications.

📹 Telemedicine

The chat system supports:

Doctor
   │
   │
Socket.IO
   │
   ├── Text Messages
   ├── Images
   ├── Documents
   └── Voice Notes
   │
   ↓
Video Consultation
   │
   └── WebRTC / Agora / Twilio

The backend also exposes an endpoint for WebRTC ICE/TURN credentials:

GET /api/chats/token/ice-servers

📝 11. Prescriptions & Medical Records
Prescriptions
POST /api/prescriptions
GET  /api/prescriptions
Medical Records
POST /api/medical-records
GET  /api/medical-records
| Feature | Access |
|---|---|
| Create prescription | Doctor |
| View prescriptions | Patient / Doctor / Admin |
| Create medical record | Doctor |
| View medical records | Patient / Doctor / Admin |

🛠️ 12. Admin Console

Base URL: /api/admin

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/stats` | System statistics |
| `GET` | `/doctors` | Registered doctors |
| `PUT` | `/doctors/:id/verify` | Verify doctor |
| `GET` | `/policies` | Manage policy PDFs |
| `POST` | `/policies` | Upload policy + generate RAG chunks |
| `PUT` | `/ai-settings` | Configure AI instructions |

🔒 13. Security

The backend implements several security mechanisms:

🔐 Password Security

Passwords are hashed using:

bcryptjs
+
Salt Rounds
🎫 Authentication

JWT tokens are used with expiration controls.

🌐 CORS

The application uses strict origin validation.

🚫 Sensitive Files

The following should remain outside Git:

.env
.env.*
node_modules/
API Keys
Secrets
Passwords

The README explicitly identifies .env, environment files, node_modules, and sensitive keys as Git-ignored resources.

🔄 Overall Backend Flow
                         ┌─────────────────┐
                         │    Frontend     │
                         │ React / Client  │
                         └────────┬────────┘
                                  │
                                  ↓
                         ┌─────────────────┐
                         │   Express API   │
                         └────────┬────────┘
                                  │
             ┌────────────────────┼────────────────────┐
             ↓                    ↓                    ↓
       Authentication        Controllers          AI Engine
             │                    │                    │
             ↓                    ↓                    ↓
           JWT              Business Logic       Gemini / RAG
             │                    │                    │
             └──────────────┬─────┴─────────────┬──────┘
                            ↓                   ↓
                     PostgreSQL            MongoDB
                      + Prisma             + Mongoose
                            │                   │
                            └─────────┬─────────┘
                                      ↓
                              Hospital Platform
=## 📄 License

MIT License

Copyright (c) 2026 Klinik

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
