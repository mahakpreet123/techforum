const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { Post, Comment } = require('../models/Post'); 
const User = require('../models/User');
const methodOverride = require('method-override');
router.use(methodOverride('_method'));


function isAuthenticated(req, res, next) {
  const token = req.session.token;
  console.log('Checking token:', token);

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; 
      next();
    } catch (err) {
      console.error('JWT verification failed:', err);
      res.redirect('/auth/login');
    }
  } else {
    console.log('No token found, redirecting to login');
    res.redirect('/auth/login');
  }
}


// Profile Route
router.get('/profile', isAuthenticated, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId);
    console.log('Current User:', currentUser);     
    const posts = await Post.find({ author: currentUser._id })
      .populate('author')
      .sort({ createdAt: -1 });
      console.log(posts);
    res.render('profile', {
      user: currentUser,
      posts,   
      currentUser, 
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading profile page');
  }
});

  


module.exports = router;
