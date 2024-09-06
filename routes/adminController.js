// Models
const User = require('../models/User');
const {Post,Comment} = require('../models/Post');
// Packages
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Controllers

// Render Login Page
exports.getLoginPage = (req, res) => {
    res.render('admin', { errorMessage: null });
};

// Admin Login Authentication
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find the admin by email
        const user = await User.findOne({ email });

        if (!user || user.role !== 'admin') {
            return res.render('admin', { errorMessage: 'Invalid email or password' });
        }

        // Check if the password matches
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.render('admin', { errorMessage: 'Invalid email or password' });
        }

        // Create a token
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Store token in cookie
        res.cookie('adminToken', token, { httpOnly: true });
        res.redirect('/admin/dashboard');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
};

// Middleware to Protect Admin Routes
exports.protectAdmin = (req, res, next) => {
    const token = req.cookies.adminToken;

    if (!token) {
        console.error('No adminToken found in cookies');
        return res.redirect('/admin/login');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;

        if (req.user.role !== 'admin') {
            console.error('User is not an admin');
            return res.redirect('/admin/login');
        }

        next();
    } catch (error) {
        console.error('Error verifying token:', error);
        return res.redirect('/admin/login');
    }
};


// Controller to Get Dashboard
exports.getDashboard = async (req, res) => {
    try {
        // Fetch total users and posts
        const totalUsers = await User.countDocuments();
        const totalPosts = await Post.countDocuments();

        // Fetch all posts to calculate the total number of comments
        const posts = await Post.find().lean();
        const totalComments = posts.reduce((acc, post) => acc + post.comments.length, 0);

        // Render the dashboard view
        res.render('dashboard', { totalUsers, totalPosts, totalComments });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};


// Controller to Fetch and Display All Users
exports.getUsers = async (req, res) => {
    try {
        const users = await User.find(); // Fetch all users
        res.render('admin/users', { users });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Controller to Fetch and Display All Posts
exports.getPosts = async (req, res) => {
    try {
        // Fetch all posts and populate the author field with the user's name
        const posts = await Post.find().populate('author', 'name').lean();

        // Render the posts view with the fetched posts
        res.render('admin/posts', { posts });
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).send('Server error');
    }
};
exports.getComments = async (req, res) => {
    try {
        // Fetch all posts and populate the comments, user, and post fields
        const posts = await Post.find()
            .populate({
                path: 'comments.user',
                select: 'name'
            })
            .populate('author', 'name')
            .lean();

        // Collect all comments from posts
        let comments = [];
        posts.forEach(post => {
            post.comments.forEach(comment => {
                comment.postTitle = post.title; // Add post title to each comment
                comments.push(comment);
            });
        });

        // Render the comments view with the fetched comments
        res.render('admin/comments', { comments });
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).send('Server error');
    }
};
exports.deleteComments = async (req, res) => {
    try {
        const commentId = req.params.commentId;

        // Find the post containing the comment
        const post = await Post.findOne({ 'comments._id': commentId });

        if (!post) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        // Find the index of the comment in the comments array
        const commentIndex = post.comments.findIndex(comment => comment._id.toString() === commentId);

        if (commentIndex === -1) {
            return res.status(404).json({ message: 'Comment not found in the post' });
        }

        // Remove the comment from the array using splice
        post.comments.splice(commentIndex, 1);

        // Save the updated post
        await post.save();

        // Redirect or respond with success
        res.redirect('/admin/comments');
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.redirect('/admin/comments');
    }
};

// Controller to Render Edit Page for Users
exports.editUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).lean();

        if (!user) {
            return res.status(404).send('User not found');
        }

        res.render('admin/edituser', { user });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).send('Server error');
    }
};

// Controller to Update User Details
exports.updateUser = async (req, res) => {
    try {
        const { name, email, role } = req.body;
        const userId = req.params.id;

        if (!name || !email || !role) {
            return res.status(400).send('All fields are required');
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { name, email, role },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).send('User not found');
        }

        res.redirect('/admin/users');
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).send('Server error');
    }
};

// Controller to Delete a User
exports.deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;

        const user = await User.findByIdAndDelete(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Optionally, delete related posts and comments
        await Post.deleteMany({ author: userId });
        await Comment.deleteMany({ user: userId });

        res.redirect('/admin/users');
    } catch (error) {
        console.error(error);
        res.redirect('/admin/users');
    }
};

// Controller to Fetch and Display All Posts
exports.getPosts = async (req, res) => {
    try {
        const posts = await Post.find().populate('author', 'name').lean();
        res.render('admin/posts', { posts });
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).send('Server error');
    }
};

// Controller to Render Edit Page for Posts
exports.editPost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id).populate('author', 'name').lean();

        if (!post) {
            return res.status(404).send('Post not found');
        }

        res.render('admin/editpost', { post });
    } catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).send('Server error');
    }
};

// Controller to Update Post Details
exports.updatePost = async (req, res) => {
    try {
        const { title, content } = req.body;
        const postId = req.params.id;

        if (!title || !content) {
            return res.status(400).send('All fields are required');
        }

        const updatedPost = await Post.findByIdAndUpdate(
            postId,
            { title, content },
            { new: true, runValidators: true }
        );

        if (!updatedPost) {
            return res.status(404).send('Post not found');
        }

        res.redirect('/admin/posts');
    } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).send('Server error');
    }
};


// Controller to Delete a Post
exports.deletePost = async (req, res) => {
    try {
        const postId = req.params.id;

        const post = await Post.findByIdAndDelete(postId);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Optionally, delete related comments
        await Comment.deleteMany({ post: postId });

        res.redirect('/admin/posts');
    } catch (error) {
        console.error(error);
        res.redirect('/admin/posts');
    }
};
