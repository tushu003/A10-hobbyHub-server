const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jlzgpsq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const groupCollection = client.db("hobbyHub").collection("groups");

    // get all groups
    app.get("/all-groups", async (req, res) => {
      try {
        const result = await groupCollection.find().toArray();
        res.status(200).json({
          result,
        });
      } catch (error) {
        console.error("Error fetching groups:", error);
        res.status(500).json({
          error: "Internal server error",
        });
      }
    });

    // create group
    app.post("/create-group", async (req, res) => {
      try {
        const groupData = req.body;
        // console.log("groupData", groupData);

        if (
          !groupData.groupName ||
          !groupData.userEmail ||
          !groupData.startDate
        ) {
          return res.status(400).json({
            error: "Missing required fields",
          });
        }

        const result = await groupCollection.insertOne(groupData);
        console.log("result", result);

        res.status(201).json({
          success: true,
          message: "Group created successfully",
          data: result,
        });
      } catch (error) {
        console.error("Error creating group:", error);
        res.status(500).json({
          error: "Internal server error",
        });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("server is getting server!");
});

app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
