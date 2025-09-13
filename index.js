const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.olaoh3z.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    
    // await client.connect();
    // await client.db("admin").command({ ping: 1 });
    console.log("✅ Connected to MongoDB successfully!");

    
    const roomsCollection = client.db('hotel-booking').collection('rooms');
    const bookingCollection = client.db('hotel-booking').collection('bookings');

    //  Fetch all rooms
    app.get('/rooms', async (req, res) => {
      try {
        const cursor = roomsCollection.find();
        const result = await cursor.toArray();
        res.status(200).send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching rooms');
      }
    });

    //  Get specific room details
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

    //  Get bookings by userId
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

    //  Book a room
    app.post('/bookings', async (req, res) => {
      const { roomId, userId, date, price, image, roomName } = req.body;

      try {
        const room = await roomsCollection.findOne({ _id: new ObjectId(roomId) });
        if (!room) return res.status(404).send('Room not found');

        if (room.isBooked) return res.status(400).send('Room already booked');

        const newBooking = {
          userId,
          roomId,
          date,
          price,
          image,
          roomName,
          status: 'Pending',
        };

        const result = await bookingCollection.insertOne(newBooking);

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

    
    app.delete('/cancel-booking/:id', async (req, res) => {
      const { id } = req.params;

      try {
        const booking = await bookingCollection.findOne({ _id: new ObjectId(id) });
        if (!booking) return res.status(404).send('Booking not found');

        await roomsCollection.updateOne(
          { _id: new ObjectId(booking.roomId) },
          { $set: { isBooked: false } }
        );

        await bookingCollection.deleteOne({ _id: new ObjectId(id) });

        res.status(200).send({ message: 'Booking canceled successfully' });
      } catch (error) {
        console.error(error);
        res.status(500).send('Error canceling booking');
      }
    });

  } finally {
    // client.close() 
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hotel Booking Server is running');
});


app.listen(port, () => {
  console.log(`🚀 Hotel Booking server is running on port: ${port}`);
});
