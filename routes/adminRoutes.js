// Packages
const express = require('express');
const router = express.Router();

// Controllers and Models Imported
const adminController = require('./adminController');
const User = require('../models/User')

// Routes For Admin

// Admin Login Route
router.get('/login', adminController.getLoginPage);
router.post('/login', adminController.login);
router.use(adminController.protectAdmin);

// Admin Dashboard Route
router.get('/dashboard', adminController.getDashboard);

// Admin route for Users
router.get('/users', adminController.getUsers);
router.get('/users/edit/:id', adminController.editUser);
router.post('/users/update/:id', adminController.updateUser);
router.get('/users/delete/:id', adminController.deleteUser);

// Admin route for posts
router.get('/posts', adminController.getPosts);
router.get('/posts/edit/:id', adminController.editPost);
router.post('/posts/update/:id', adminController.updatePost);
router.post('/posts/delete/:id', adminController.deletePost);

router.get('/comments', adminController.getComments);
router.post('/comments/delete/:commentId', adminController.deleteComments);

// // Admin route for Reviews
// router.get('/reviews', adminController.getAllReviews);
// router.post('/delete-review/:id', adminController.deleteReview);

module.exports = router;