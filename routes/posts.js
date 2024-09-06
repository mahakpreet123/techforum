const express = require('express');
const { Post, Comment } = require('../models/Post'); 
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const upload = require('../middlewares/upload')
const router = express.Router();
const methodOverride = require('method-override');
router.use(methodOverride('_method'));

// Middleware to check authentication
function isAuthenticated(req, res, next) {
  const token = req.session.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, "shhhhh");
      req.user = decoded; 
      next();
    } catch (err) {
      res.redirect('/auth/login');
    }
  } else {
    res.redirect('/auth/login');
  }
}

// View Post
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('author')
      .populate('comments.user')
      .sort({ createdAt: -1 });

    const currentUser = await User.findById(req.user.userId);
    
    res.render('posts', { posts, currentUser });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error retrieving posts');
  }
});



// Create Post
router.get('/create', isAuthenticated, (req, res) => {
  res.render('createPost');
});


router.post('/create',isAuthenticated, upload.single('image'), async (req, res) => {
  const { title, content} = req.body;
  const image = req.file ? req.file.filename : null;
  if (!title || !content) {
    return res.status(400).send('Title and content are required');
  }
  try {
    const token = req.session.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const newPost = new Post({
      title,
      content,
      author: decoded.userId,
      image,
      likes: [] 
    });
    // await post.save();
    await newPost.save();
    res.redirect('/posts');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error creating post');
    res.redirect('/create');
  }
});

// Edit Post Page
router.get('/:id/edit', async (req, res) => {
  try {
      const post = await Post.findById(req.params.id);
      if (!post) {
          return res.status(404).send('Post not found');
      }
      res.render('edit', { post }); 
  } catch (err) {
      res.status(500).send('Server error');
  }
});

// Update Post Route
router.put('/:id', async (req, res) => {
  try {
      const post = await Post.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!post) {
          return res.status(404).send('Post not found');
      }
      res.redirect('/posts'); // Redirect to the all posts page
  } catch (err) {
      res.status(500).send('Server error');
  }
});

// Delete Post Route
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    await Post.findByIdAndDelete(req.params.id); // Use async/await
    res.redirect('/posts');
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting post");
  }
});

// Like a post
router.post('/:postId/like', isAuthenticated, async (req, res) => {
  try {
    const { postId } = req.params;
    const token = req.session.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const post = await Post.findById(postId);
    
    if (!post.likes.includes(decoded.userId)) {
      post.likes.push(decoded.userId);
    } else {
      post.likes.pull(decoded.userId);
    }

    await post.save();
    
    res.json({ success: true, likeCount: post.likes.length });
  } catch (err) {
    console.error('Error liking post:', err);
    res.json({ success: false, message: 'Error liking post' });
  }
});
module.exports = router;
