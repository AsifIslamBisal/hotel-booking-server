const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.olaoh3z.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    const roomsCollection = client.db('hotel-booking').collection('rooms');
    const bookingCollection = client.db('hotel-booking').collection('bookings');

    // Fetch all rooms
    app.get('/rooms', async (req, res) => {
      const cursor = roomsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // Get specific room details
    app.get('/rooms/:id', async (req, res) => {
      const { id } = req.params;
      try {
        const room = await roomsCollection.findOne({ _id: new ObjectId(id) });
        if (!room) return res.status(404).send('Room not found');
        res.status(200).send(room);
      } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching room details');
      }
    });

    // Get bookings by userId
app.get('/bookings', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).send('User ID required');

  try {
    const cursor = bookingCollection.find({ userId });
    const bookings = await cursor.toArray();
    res.status(200).send(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching bookings');
  }
});


    // Book a room
    app.post('/bookings', async (req, res) => {
      const { roomId, userId, date, price, image, roomName } = req.body;

      try {
        const room = await roomsCollection.findOne({ _id: new ObjectId(roomId) });
        if (!room) return res.status(404).send('Room not found');

        if (room.isBooked) return res.status(400).send('Room already booked');

        // Create new booking
        const newBooking = {
          userId,
          roomId,
          date,
          price,
          image,
          roomName,
          status: 'Pending',  // Default status
        };

        const result = await bookingCollection.insertOne(newBooking);

        // Update room status to booked
        await roomsCollection.updateOne(
          { _id: new ObjectId(roomId) },
          { $set: { isBooked: true } }
        );

        res.status(201).send({ message: 'Room booked successfully', bookingId: result.insertedId });

      } catch (error) {
        console.error(error);
        res.status(500).send('Error booking room');
      }
    });

    // Cancel booking
    app.delete('/cancel-booking/:id', async (req, res) => {
      const { id } = req.params;

      try {
        const booking = await bookingCollection.findOne({ _id: new ObjectId(id) });
        if (!booking) return res.status(404).send('Booking not found');

        // Update the corresponding room to available
        await roomsCollection.updateOne(
          { _id: new ObjectId(booking.roomId) },
          { $set: { isBooked: false } }
        );

        res.status(200).send({ message: 'Booking canceled successfully' });
      } catch (error) {
        console.error(error);
        res.status(500).send('Error canceling booking');
      }
    });

  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hotel Booking Server is running');
});

app.listen(port, () => {
  console.log(`Hotel Booking server is running on port: ${port}`);
});
