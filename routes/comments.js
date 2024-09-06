const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { Post, Comment } = require('../models/Post'); 
const User = require('../models/User');
const methodOverride = require('method-override');
router.use(methodOverride('_method'));

// Middleware to check authentication
function isAuthenticated(req, res, next) {
    const token = req.session.token;
    console.log(token);
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            next();
        } catch (err) {
            res.redirect('/auth/login');
        }
    } else {
        res.redirect('/auth/login');
    }
}
router.get('/:id', isAuthenticated, async (req, res) => {
    try {
        const posts = await Post.find()
            .populate('author')
            .populate('comments.user')
            .sort({ createdAt: -1 });

        const currentUser = await User.findById(req.user.userId);
        console.log(currentUser);
        res.render('posts', { posts, currentUser });
    } catch (error) {
        console.error('Error retrieving posts:', error.message);
        console.error('Stack trace:', error.stack);
        res.status(500).send('Error retrieving posts');
    }
});

// Add a comment
router.post('/:postId/comments', isAuthenticated, async (req, res) => {
    try {
        const { postId } = req.params;
        const { content } = req.body;
        const userId = req.user.userId;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).send('Post not found');
        }

        const newComment = {
            content,
            user: userId,
            createdAt: new Date()
        };

        post.comments.push(newComment);
        await post.save();

        res.redirect(`/posts/${postId}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error adding comment');
    }
});
// Delete a comment
router.delete('/:postId/comments/:commentId', isAuthenticated, async (req, res) => {
    try {
        const { postId, commentId } = req.params;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).send('Post not found');
        }

        // Find the index of the comment to delete
        const commentIndex = post.comments.findIndex(c => c._id.toString() === commentId);
        if (commentIndex === -1) {
            return res.status(404).send('Comment not found');
        }

        // Check if the user is authorized to delete this comment
        if (post.comments[commentIndex].user.toString() !== req.user.userId) {
            return res.status(403).send('Not authorized');
        }

        // Remove the comment
        post.comments.splice(commentIndex, 1);
        await post.save();

        res.redirect(`/posts/${postId}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error deleting comment');
    }
});

// Route to handle reply submission
router.post('/:postId/comments/:commentId/reply', isAuthenticated, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const replyContent = req.body.replyContent;

    const post = await Post.findById(postId);
    const comment = post.comments.id(commentId);
    console.log("Req User-->",req.user);
    const username = await User.findById(req.user.userId).select("name");
    console.log("username-----",username.name);
    
    const newReply = {
      user: username.name,
      content: replyContent,
      createdAt: new Date(),
    };
    comment.replies.push(newReply);
    await post.save();

    res.redirect(`/posts/${postId}`);
  } catch (error) {
    console.error('Error adding reply:', error);
    res.status(500).send('Error adding reply');
  }
});

module.exports = router;



module.exports = router;


