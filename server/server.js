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

app.post('/api/recommendation', async (req, res) => {
  try {
    const response = await axios.post('http://localhost:5000/api/recommendation', req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Error in forwarding request:', error);
    res.status(500).send('Error communicating with FastAPI');
  }
});
// test line

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

app.get("/api/dashboard/:user_id", async (req, res) => {
  const { user_id } = req.params;

  try {
    // Check if the user exists
    const user = await db('users').where({ user_id }).first();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // for the assets we go to assets table and take stock_id and price_id, then we go to stock_prices table and
    // take the price for the price_id and then we go to stocks table and take the company_name and ticker for the stock_id

    const assets = await db('assets')
      .join('stocks', 'assets.stock_id', 'stocks.stock_id')
      .join('stock_prices', 'assets.price_id', 'stock_prices.price_id')
      .select('assets.stock_id', 'stocks.company_name', 'stocks.ticker', 'stock_prices.price', 'assets.price_id', 'assets.quantity', 'stock_prices.price_date')
      .where({ user_id });
      
    // ? formatting the assets to be sent to the client, grouping them by ticker

      const transformedAssets = {};
       assets.forEach((asset) => {
          const { ticker, price_id, price, stock_id, quantity, price_date } = asset;
           if (!transformedAssets[ticker]) {
              transformedAssets[ticker] = [];
            }
            transformedAssets[ticker].push({ price_id, price, stock_id, quantity, date: price_date });
    }) 
    


    // taking the transactions from the transactions table
    const activities = await db('transactions').where({ user_id });

    const joined = await db('users')
      .select('created_at')
      .where({ user_id })
      .first();

    const balance = await db('users')
      .select('total_investment', 'total_profit_loss')
      .where({ user_id })
      .first();
    // console.log(activities);
    // Return the user's data
    const transformedAssetsArray = Object.keys(transformedAssets).map((ticker) => ({
      ticker,
      assets: transformedAssets[ticker],
    }));
    // console.log(typeof transformedAssetsArray);
    return res.status(200).json({
      transformedAssets : transformedAssetsArray,
      activities,
      balance,
      joined,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong' });
  }
});

app.listen(3009, ()=>{
    console.log('Server is running on port 3009');
});
