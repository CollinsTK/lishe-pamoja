const User = require('../models/User'); // Importing your database blueprint
const bcrypt = require('bcryptjs');     // Importing the security tool you just installed

// The logic to register a new user
const registerUser = async (req, res) => {
  try {
    // 1. Catch the data coming from the frontend form
    const { name, email, password, role, location } = req.body;

    // 2. Check if this email is already registered in the database
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }

    // 3. Scramble (hash) the password so hackers can't read it
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Create the new user using the data and the scrambled password
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
      location
    });

    // 5. Save the new user to your MongoDB Atlas cloud database
    await newUser.save();

    // 6. Send a success message back to the frontend
    res.status(201).json({ message: 'User registered successfully!' });

  } catch (error) {
    console.error('Error in registerUser:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// Export the function so the routes can use it
module.exports = {
  registerUser
};