// server.js
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { initSocket } from './services/socketServices.js'; 
import { connectDB } from './config/db.js';
import studentRouter from './routes/studentRoute.js';
import RegularRouter from './routes/regularMenuRoute.js';
import SpecialRouter from './routes/specialMenuRoute.js';
import dailyRouter from './routes/dailyMenuRoute.js';
import walletRouter from './routes/walletRoute.js';
import orderRouter from './routes/orderRoute.js'
import FeedbackRouter from './routes/feedbackRoute.js';
import router from './routes/preorderRoute.js';
import bulkrouter from './routes/bulkorderRoute.js';
import cancelrouter from './routes/cancelOrderRoute.js';
import Fbulkrouter from './facultyRoutes/bulkorderRoute.js';
import Frouter from './facultyRoutes/preorderRoute.js';
import ForderRouter from './facultyRoutes/orderRoute.js';
import FwalletRouter from './facultyRoutes/walletRoute.js';
import facultyRouter from './facultyRoutes/facultyRoute.js';
import Forgotrouter from './routes/forgotpasswordRoute.js';
import dotenv from 'dotenv';
import attendantRouter from './attendant/attendantRoutes/attendantroutes.js';
import attorderRouter from './attendant/attendantRoutes/orderroutes.js';
import Abulkrouter from './attendant/attendantRoutes/bulkRoute.js';
import preorderRouter from './attendant/attendantRoutes/preorderRoutes.js';
import Fcancelrouter from './facultyRoutes/fcancelOrderRoute.js';
import FPrecancelrouter from './facultyRoutes/FprecancekRoute.js';
import Fbulkcancelrouter from './facultyRoutes/FbulkcancekRoute.js';
import adminRouter from './adminroutes/adminroute.js';

dotenv.config();

// App config
const app = express();
const port = process.env.PORT || 4000;
const httpServer = createServer(app);

// Middleware
app.use(express.json());
app.use(cors({
    origin: '*', // Temporarily allow all for debugging
    methods: ['GET', 'POST', 'PUT'],
    credentials: true
  }));
connectDB();

// API endpoints
app.use('/api/student', studentRouter);
app.use('/api/regular', RegularRouter);
app.use('/api/special', SpecialRouter);
app.use('/api/daily', dailyRouter);
app.use('/api/bulkorder',bulkrouter);
app.use('/api/orders', orderRouter);
app.use('/api/wallets', walletRouter);
app.use('/api/feedback', FeedbackRouter);
app.use('/api/preorder', router);
app.use('/api/Fbulkorder',Fbulkrouter);
app.use('/api/Forders', ForderRouter);
app.use('/api/faculty', facultyRouter);
app.use('/api/Fwallets', FwalletRouter);
app.use('/api/Fpreorder', Frouter);
app.use('/api/attendant', attendantRouter);
app.use('/api/attendant',attorderRouter)
app.use('/api/Abulkorder',Abulkrouter)
app.use('/api/attendant',preorderRouter)
app.use('/api/forgot', Forgotrouter);
app.use('/api/cancel', cancelrouter);
app.use('/api/Fcancel', Fcancelrouter);
app.use('/api/Fprecancel', FPrecancelrouter);
app.use('/api/Fbulkcancel', Fbulkcancelrouter);
app.use('/api/admin',adminRouter);

app.get('/', (req, res) => {
    res.send('API Working');


});

// Error handling middlewarea
app.use((error, req, res, next) => {
    const message = error.message || 'Server error';
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message });
});

const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
  const io = initSocket(server);
  export { app, server };  