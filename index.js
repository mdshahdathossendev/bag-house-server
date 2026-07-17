require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { OpenAI } = require('openai');

const app = express();
const PORT = process.env.PORT || 5000;



// Middleware
app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('Error: MONGODB_URI is not defined in the .env file.');
  process.exit(1);
}

// Create a MongoClient with options to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let db = null;

async function run() {
  try {
    // Connect the client to the server
    // await client.connect();
    // // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    db = client.db('organic-food');
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
  }
}
run().catch(console.dir);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Bag House Server is running' });
});

app.get('/foods', async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database connection is not established yet. Please try again in a moment.' });
    }
    const collection = db.collection('food');
    const foods = await collection.find({}).toArray();
    res.json(foods);
  } catch (error) {
    console.error('Error fetching foods:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});
app.get('/foods/:id', async (req, res) => {
  try {
    if (!db) {
      return res.status(553).json({ error: 'Database connection is not established yet. Please try again in a moment.' });
    }
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid food item ID format' });
    }
    const collection = db.collection('food');
    const food = await collection.findOne({ _id: new ObjectId(id) });
    if (!food) {
      return res.status(404).json({ error: 'Food item not found' });
    }
    res.json(food);
  } catch (error) {
    console.error('Error fetching food:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

app.post('/foods', async (req, res) => {
  try {
    if (!db) {
      return res.status(553).json({ error: 'Database connection is not established yet. Please try again in a moment.' });
    }
    const foodItem = req.body;
    if (!foodItem || !foodItem.name || !foodItem.price) {
      return res.status(400).json({ error: 'Validation failed: Name and price are required fields.' });
    }
    const collection = db.collection('food');
    const result = await collection.insertOne(foodItem);
    res.status(201).json({
      message: 'Food product added successfully',
      insertedId: result.insertedId,
      food: { _id: result.insertedId, ...foodItem }
    });
  } catch (error) {
    console.error('Error adding food:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

app.delete('/foods/:id', async (req, res) => {
  try {
    if (!db) {
      return res.status(553).json({ error: 'Database connection is not established yet. Please try again in a moment.' });
    }
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid food item ID format' });
    }
    const collection = db.collection('food');
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Food item not found' });
    }
    res.json({ message: 'Food product deleted successfully', deletedCount: result.deletedCount });
  } catch (error) {
    console.error('Error deleting food:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

app.post('/chat', async (req, res) => {
  try {
    const { messages, model } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Validation failed: messages must be a non-empty array.' });
    }

    // Get Groq API key (check both GROQ_API_KEY and OPENAI_API_KEY if it's a Groq key)
    let apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === 'your_groq_api_key_here') {
      const openaiKey = process.env.OPENAI_API_KEY;
      if (openaiKey && openaiKey.startsWith('gsk_')) {
        apiKey = openaiKey;
      }
    }

    if (!apiKey) {
      return res.status(500).json({
        error: 'Groq API is not configured.',
        message: 'Please define GROQ_API_KEY in your .env file (or set OPENAI_API_KEY to a Groq key starting with gsk_).'
      });
    }

    const openai = new OpenAI({
      apiKey,
      baseURL: "https://api.groq.com/openai/v1"
    });

    const chatCompletion = await openai.chat.completions.create({
      messages,
      model: model || 'llama-3.3-70b-versatile',
    });

    return res.json({
      message: chatCompletion.choices[0].message,
      usage: chatCompletion.usage
    });
  } catch (error) {
    console.error('Error in /chat endpoint:', error);
    res.status(500).json({
      error: 'Failed to complete chat request',
      message: error.message
    });
  }
});

// Dedicated Groq chat endpoint
app.post('/groq-chat', async (req, res) => {
  try {
    const { messages, model } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Validation failed: messages must be a non-empty array.' });
    }

    // Get Groq API key (check both GROQ_API_KEY and OPENAI_API_KEY if it's a Groq key)
    let apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === 'your_groq_api_key_here') {
      const openaiKey = process.env.OPENAI_API_KEY;
      if (openaiKey && openaiKey.startsWith('gsk_')) {
        apiKey = openaiKey;
      }
    }

    if (!apiKey) {
      return res.status(500).json({
        error: 'Groq API is not configured.',
        message: 'Please define GROQ_API_KEY in your .env file (or set OPENAI_API_KEY to a Groq key starting with gsk_).'
      });
    }

    const openai = new OpenAI({
      apiKey,
      baseURL: "https://api.groq.com/openai/v1"
    });

    const chatCompletion = await openai.chat.completions.create({
      messages,
      model: model || 'llama-3.3-70b-versatile',
    });

    return res.json({
      message: chatCompletion.choices[0].message,
      usage: chatCompletion.usage
    });
  } catch (error) {
    console.error('Error in /groq-chat endpoint:', error);
    res.status(500).json({
      error: 'Failed to complete Groq chat request',
      message: error.message
    });
  }
});


process.on('SIGINT', async () => {
  console.log('Closing MongoDB client connection...');
//   await client.close();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
