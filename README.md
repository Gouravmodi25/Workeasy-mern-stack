# Workeasy-mern-stack
WorkEasy - Service Provider Booking Platform
WorkEasy is a MERN stack-based platform that connects users with skilled service providers such as plumbers, electricians, and more. Users can find professionals, send service requests, and manage bookings seamlessly.

Features
🔹 User Features

Sign up, log in, and manage profiles
Search for service providers by category
Send service requests and track their status
Secure payments via Razorpay
🔹 Service Provider Features

Register and manage service offerings
Accept or reject service requests
View and manage bookings

Tech Stack
🚀 MERN Stack (MongoDB, Express.js, React, Node.js)
🛡️ Authentication (JWT)
💳 Payments (Razorpay Integration)
📱 Responsive UI

This project simplifies the process of finding and booking reliable service providers, ensuring a smooth experience for both users and professionals. 🚀


🛠️ Setup Guide
Follow these steps to clone and set up the project on your local machine.

1️⃣ Clone the Repository
git clone <repository_url>
Replace <repository_url> with your actual GitHub repo link.

2️⃣ Navigate to the Project Directory
cd WorkEasy

3️⃣ Install Dependencies
Install Backend Dependencies
cd backend
npm install
Install Frontend Dependencies (Vite + React)
cd ../frontend
npm install

4️⃣ Set Up Environment Variables
Create a .env file inside the backend folder.
Add the required environment variables:
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret

Create a .env file inside the frontend folder for Vite:
VITE_BACKEND_URL=http://localhost:5000
VITE_RAZORPAY_KEY=your_razorpay_key

5️⃣ Start the Development Server
Start Backend Server
cd backend
npm run dev

Start Frontend Server (Vite)
cd frontend
npm run dev

6️⃣ Open in Browser
Once both servers are running, open your browser and go to:
👉 http://localhost:5173 (Vite default port)
