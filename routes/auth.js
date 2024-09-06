const express = require('express');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const twilio = require('twilio');
const nodemailer = require("nodemailer");
const router = express.Router();
require('dotenv').config();

// Twilio credentials
const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.ACCOUNT_TOKEN;
const client = twilio(accountSid, authToken);
// const client = twilio(process.env.ACCOUNT_SID, process.env.ACCOUNT_TOKEN);

const { Post, Comment } = require('../models/Post');
const { body, validationResult } = require('express-validator');

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
      user: process.env.NODE_MAILER_EMAIL,
      pass: process.env.NODE_MAILER_PASSWORD,
  },
  tls: {
      rejectUnauthorized: false, // This allows self-signed certificates
  },
});

// Registration
router.get('/register', (req, res) => {
  res.render('register');
});

// Post Registration 
router.post('/register', [
  body('name').matches(/^[A-Za-z\s]+$/).withMessage('Username should only contain letters and spaces.'),
  body('email').isEmail().withMessage('Invalid email address.')
    .matches(/^[a-zA-Z0-9._%+-]{3,}@[a-zA-Z0-9.-]{2,}\.[a-zA-Z]{2,}$/).withMessage('Email format is incorrect.'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/).withMessage('Password must include a letter, a number, and a special character.'),
  body('phone').isMobilePhone().withMessage('Invalid phone number.')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render('register', { errors: errors.array() });
  }

  const { name, email, password, phone } = req.body;

  try {
    const otp = Math.floor(100000 + Math.random() * 900000);
    const user = new User({ name, email, password, phone, otp });
    await user.save();
    console.log("User object:", user);
    client.messages
      .create({
        body: `Your OTP code is ${otp}`,
        to: `+91${phone}`,
        from: '+15678660694'
      })
      .then(message => {
        console.log(`Message sent: ${message.sid}`);
        res.redirect('/auth/verify-otp');
      })
      .catch(error => {
        console.error('Error sending OTP:', error);
        res.status(500).send('Error sending OTP');
      });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).send('Server error');
  }
});
// Add the GET route for OTP verification page
router.get('/verify-otp', (req, res) => {
  res.render('verify-otp');
});

router.post('/verify-otp', [
  body('phone').isMobilePhone().withMessage('Invalid phone number.'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP should be 6 digits.')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
      return res.status(400).render('verify-otp', { errors: errors.array() });
  }

  const { phone, otp, password } = req.body;

  try {
      const user = await User.findOne({ phone });
      if (user && user.otp === otp) {
          user.otp = null;
          await user.save();
          const mailOptions = {
              from: 'mahakpreet208@gmail.com',
              to: user.email, 
              subject: 'Welcome to TechForum',
              text: `Hello ${user.name},\n\nWelcome to TechForum! You have successfully registered.\n\nHere are your login details:\n\nUsername: ${user.name}\nPhone Number: ${user.phone}\n\nBest Regards,\nTechForum Team`, 
          };

          transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                  console.log('Error sending email:', error);
                  return res.status(500).send('Error sending welcome email');
              } else {
                  console.log('Email sent: ' + info.response);
                  res.redirect('/auth/login');
              }
          });

      } else {
          console.log("OTP verification failed.");
          res.status(400).send('Invalid OTP');
      }
  } catch (error) {
      console.error('Error verifying OTP:', error);
      res.status(500).send('Error verifying OTP');
  }
});
router.get('/resend-otp', async (req, res) => {
  try {
    const phone = req.query.phone; 
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).send('User not found');
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    user.otp = otp;
    await user.save();
    
    // Send OTP via Twilio SMS
    client.messages
      .create({
        body: `Your new OTP code is ${otp}`,
        to: `+91${phone}`,
        from: '+15678660694' 
      })
      .then(message => {
        console.log(`Message sent: ${message.sid}`);
        res.redirect('/auth/verify-otp');
      })
      .catch(error => {
        console.error('Error sending OTP:', error);
        res.status(500).send('Error sending OTP');
      });
  } catch (error) {
    console.error('Error resending OTP:', error);
    res.status(500).send('Error resending OTP');
  }
});
// Login
router.get('/login', (req, res) => {
  res.render('login');
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log("Login failed: User not found");
      return res.redirect('/auth/login');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password entered:", password);
    console.log("Stored hashed password:", user.password);
    console.log("Password match:", isMatch);

    if (isMatch) {
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
      req.session.token = token;
      res.redirect('/auth/homepage');
    } else {
      console.log("Login failed: Incorrect password");
      res.redirect('/auth/login');
    }
  } catch (err) {
    console.error('Error during login:', err);
    res.redirect('/auth/login');
  }
});

// Profile
router.get('/profile', async (req, res) => {
  try {
    const token = req.session.token;
    if (!token) return res.redirect('/auth/login');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    res.render('profile', { user });
  } catch (err) {
    console.error(err);
    res.redirect('/auth/login');
  }
});

router.get('/homepage', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.render('homepage', { posts });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Logout route
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).send('Internal Server Error');
    }
    // Redirect to the login page after logout
    res.redirect('/auth/login');
  });
});



module.exports = router;
