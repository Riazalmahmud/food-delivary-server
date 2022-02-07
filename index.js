const express = require("express");
const app = express();
const cors = require("cors");
const admin = require("firebase-admin");
require("dotenv").config();
const { MongoClient } = require("mongodb");
const ObjectId = require("mongodb").ObjectId;
const port = process.env.PORT || 5000;
const serviceAccount = require("./fooddelivary.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.use(cors());
app.use(express.json());
const uri = process.env.DB_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const token = req.headers.authorization.split(" ")[1];

    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    } catch {}
  }
  next();
}
async function run() {
  try {
    await client.connect();
    const database = client.db("food_delivary");
    const shopCollection = database.collection("products");
    const userCollection = database.collection("user");
    const feedbackCollection = database.collection("feedbacks");
    const productManage = database.collection("foodManage");

    // get api using email

    app.get("/foodManage", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const cursor = productManage.find(query);
      const result = await cursor.toArray();
      res.json(result);
    });

    app.delete("/foodManage/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productManage(query);
      console.log(result);
      res.json(result);
    });

    // get api
    app.get("/products", async (req, res) => {
      const cursor = shopCollection.find({});
      const result = await cursor.toArray();
      res.json(result);
    });

    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await shopCollection.findOne(query);
      console.log("oderCollect", query);
      res.json(result);
    });
    // user information
    app.post("/user", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.json(result);
    });
    app.put("/user", async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const options = { upsert: true };
      const update = { $set: user };
      const result = await userCollection.updateOne(filter, update, options);
      res.json(result);
    });
    app.put("/user/admin", verifyToken, async (req, res) => {
      const user = req.body;
      const requester = req.decodedEmail;
      if (requester) {
        const requesterAccounter = await userCollection.findOne({
          email: requester,
        });
        if (requesterAccounter.role == "admin") {
          const filter = { email: user.email };
          const update = { $set: { role: "admin" } };
          const result = await userCollection.updateOne(filter, update);
          res.json(result);
        }
      } else {
        res
          .status(403)
          .json({ message: "you do not have access to make admin" });
      }
    });

    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const quarry = { email: email };
      const user = await userCollection.findOne(quarry);
      let isAdmin = false;
      if (user?.role === "admin") {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    });

    app.post("/feedbacks", async (req, res) => {
      const feedback = req.body;
      const result = await feedbackCollection.insertOne(feedback);
      res.json(result);
    });
    app.get("/feedbacks", async (req, res) => {
      const cursor = feedbackCollection.find({});
      const result = await cursor.toArray();
      res.json(result);
    });

    // product manage Information
    app.post("/products", async (req, res) => {
      const product = req.body;
      const result = await shopCollection.insertOne(product);
      res.json(result);
    });

    // add to cart page
    app.post("/foodManage", async (req, res) => {
      const addCart = req.body;
      console.log(addCart);
      const result = await productManage.insertOne(addCart);
      res.json(result);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("hello express");
});
app.listen(port, () => {
  console.log(`HELLO  server :${port}`);
});
