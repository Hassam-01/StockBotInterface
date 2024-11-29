const express = require('express');
const knexConfig = require('./database.js');
const knex = require('knex');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


const db = knex(knexConfig.development);
const app = express();
app.use(cors(
{  origin: 'http://localhost:3000', // Allow requests from your frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allow specific HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'], //
  }
));

app.use(express.json());

app.post('/api/auth/login', async (req, res) => {
  // we recieve the username and password from the client
  const { username, password } = req.body;
  // we check if the user exists in the database
  try{
    const user = await db('users').where({username}).first();
    // if the user does not exist, we return an error
    if(!user){

      return res.status(400).json({message: 'User Does Not Exist'});
    }
    // if the user exists, we check if the password is correct using bcrypt
    // if the password is incorrect, we return an error
    if(!bcrypt.compareSync(password, user.password_hash)){
      return res.status(400).json({message: 'Invalid Credentials'});
    }
    // if the password is correct, we return the user details
    // we can also use jwt to create a token and send it to the client
    // use jwt to create a token
    const token = jwt.sign({id: user.id, username: user.username
    }, 'secret', {expiresIn: '1h'});
    return res.status(200).json({token, username: user.username, id: user.user_id});
  }catch (err){
    return res.status(500).json({message: 'Something went wrong'});
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { username, password, email } = req.body;

  // Hash the password using bcrypt
  const hash = bcrypt.hashSync(password, 10);

  try {
    // Insert user and return the username and user_id
    const [user] = await db('users')
      .insert({ username, password_hash: hash, email })  // Make sure 'password_hash' matches your DB column name
      .returning(['user_id', 'username']);  // Returning the fields you need

    // Return a success response with the user details
    return res.status(201).json({ message: 'User Registered Successfully', username: user.username, user_id: user.user_id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong' });
  }
});

app.get("/api/dashboard", (req, res) => {
  res.json({
    user: {
      name: "Han Ji Pyeong",
      profileImage: "path/to/profile-image.jpg",
      joinedDate: "June 22, 2020",
      assetsTotal: 1312900,
      assetList: [
        { name: "Bitcoin", quantity: "23.5 BTC" },
        { name: "Ethereum", quantity: "190.45 ETH" },
        { name: "Doge", quantity: "239,500 DOGE" },
        { name: "Ripple", quantity: "65,100 XRP" },
      ],
    },
    assets: [
      { id: 1, name: "Bitcoin", value: 1820, profit: 2.87, loss: 0.17 },
      { id: 2, name: "Ethereum", value: 1100, profit: 2.87, loss: 0.17 },
    ],
    activities: [
      {
        id: 1,
        transaction: "Ethereum Purchased",
        amount: "0.0154 ETH",
        total: "USD $10",
        status: "Pending",
        date: "February 21, 2021",
      },
      {
        id: 2,
        transaction: "Bitcoin Purchased",
        amount: "0.3 BTC",
        total: "USD $140",
        status: "Done",
        date: "February 14, 2021",
      },
    ],
  });
});

app.listen(3009, ()=>{
    console.log('Server is running on port 3009');
});
