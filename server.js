const app = require('./app');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const http = require('http');
const initSocket = require('./socket'); // Import socket config

// Load configurations
dotenv.config();

// Connect to Database
connectDB();

// Create HTTP server wrapping Express app
const server = http.createServer(app);

// Initialize Sockets
initSocket(server);

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});