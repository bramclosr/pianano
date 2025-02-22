# PiaNano

A self-playing piano controlled by Nano cryptocurrency payments.

## Project Structure
- `/API` - Backend API server with Nano payment processing and Arduino control
- `/pianano` - Next.js frontend application

## Setup Instructions

### API Server Setup
```bash
cd API
npm install
npm start
```

Required environment variables for API (.env):
```
PORT=3000
ARDUINO_PORT=/dev/cu.usbmodem1301
```

### Frontend Setup
```bash
cd pianano
npm install
npm run dev
```

Required environment variables for frontend (.env):
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Arduino Setup
1. Upload the solenoid.ino code to your Arduino
2. Connect solenoid to pin 13 (or configured pin)
3. Note the Arduino port path for API configuration

## Development
- API runs on port 3000
- Frontend runs on port 3001
- Arduino communicates via serial port for solenoid control

## Deployment
- Frontend: Deploy to Vercel
- API: Deploy to a server with Arduino connectivity 