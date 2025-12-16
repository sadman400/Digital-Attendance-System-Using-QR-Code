# Digital Attendance System Using QR Code

A full-stack web application for managing student attendance using QR codes. Teachers can generate QR codes for their classes, and students can scan them to mark their attendance.

## Features

### For Teachers
- Create and manage classes
- Generate time-limited QR codes for attendance sessions
- View real-time attendance records
- Track student attendance statistics and percentages

### For Students
- Join classes using class codes
- Scan QR codes to mark attendance
- View personal attendance history
- Track attendance percentage

## Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **QRCode** library for QR generation
- **bcryptjs** for password hashing

### Frontend
- **React 18** with Vite
- **TailwindCSS** for styling
- **React Router** for navigation
- **html5-qrcode** for QR scanning
- **Lucide React** for icons
- **Axios** for API calls

## Project Structure

```
├── backend/
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── middleware/      # Auth middleware
│   ├── server.js        # Entry point
│   └── .env             # Environment variables
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── context/     # React context
│   │   └── utils/       # Utility functions
│   └── index.html
└── README.md
```

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- npm or yarn

## Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd collage
```

### 2. Setup Backend
```bash
cd backend
npm install
```

Create a `.env` file (or modify the existing one):
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/attendance_system
JWT_SECRET=your_super_secret_jwt_key_here
```

### 3. Setup Frontend
```bash
cd frontend
npm install
```

## Running the Application

### Start MongoDB
Make sure MongoDB is running on your system.

### Start Backend Server
```bash
cd backend
npm run dev
```
The backend will run on `http://localhost:5000`

### Start Frontend Development Server
```bash
cd frontend
npm run dev
```
The frontend will run on `http://localhost:3000`

## Usage

### Teacher Flow
1. Register as a teacher
2. Create a new class with a unique code
3. Share the class code with students
4. Generate QR code when starting a class
5. Display QR code for students to scan
6. View attendance records and statistics

### Student Flow
1. Register as a student
2. Join a class using the class code
3. When in class, scan the QR code displayed by teacher
4. View attendance history in "My Attendance"

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Classes
- `GET /api/classes` - Get user's classes
- `POST /api/classes` - Create new class (teachers)
- `GET /api/classes/:id` - Get class details
- `POST /api/classes/join/:code` - Join class (students)
- `DELETE /api/classes/:id` - Delete class (teachers)

### Attendance
- `POST /api/attendance/generate-qr/:classId` - Generate QR code
- `POST /api/attendance/mark` - Mark attendance via QR
- `GET /api/attendance/class/:classId` - Get class attendance
- `GET /api/attendance/my-attendance` - Get student's attendance
- `GET /api/attendance/stats/:classId` - Get attendance statistics

## Screenshots

The application features a modern, responsive UI with:
- Gradient login/register pages
- Dashboard with statistics cards
- Class management with modals
- QR code display and scanner
- Attendance history with filters

## License

MIT License
