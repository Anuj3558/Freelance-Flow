import express from 'express';
import {
    loginController,
    logoutController,
    protect,
    registerController
} from '../controller/authControllers.js';

const Loginrouter = express.Router();

// Home route

// Login route
Loginrouter.post('/login', loginController);

// Logout route
Loginrouter.post('/logout', logoutController);

Loginrouter.post('/create-account',registerController );
Loginrouter.get('/verify-token',protect ,(req,res) =>{
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    res.status(200).json({
      success: true,
      message: 'Token is valid',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
})
export default Loginrouter;