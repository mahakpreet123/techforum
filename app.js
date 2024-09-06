const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const profileRoutes = require('./routes/profile');
const adminroute = require('./routes/adminRoutes');
const path = require('path');
const cookieParser = require('cookie-parser');
const Port = 10000;

dotenv.config();

const app = express();

// MongoDB connection with additional options
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 30000, // 30 seconds timeout
})
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err.message);
    process.exit(1); // Exit process if connection fails
  });

app.use(cookieParser());
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static('uploads'));
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware to set currentUser for templates
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  next();
});

// Session configuration
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 1000 * 60 * 60 * 2, // 2 hours
  }
}));

// Routes
app.use('/auth', authRoutes);
app.use('/posts', postRoutes);
app.use('/posts', profileRoutes);
app.use('/posts', commentRoutes);
app.use('/admin', adminroute);

// Home route
app.get('/', (req, res) => {
  res.render('index');
});

// Start the server
app.listen(Port, () => console.log(`Server started on ${Port}`));
