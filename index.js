const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const { ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jlzgpsq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // await client.connect();

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

    // my group
    // Get groups by user email
    // app.get("/my-groups", async (req, res) => {
    //   try {
    //     const email = req.query.email;

    //     if (!email) {
    //       return res.status(400).json({ error: "Email is required" });
    //     }

    //     const result = await groupCollection.find({ userEmail: email }).toArray();
    //     res.status(200).json(result);
    //   } catch (error) {
    //     console.error("Error fetching user groups:", error.message);
    //     res.status(500).json({ error: "Internal server error" });
    //   }
    // });

    // update group
    app.put("/update-group/:id", async (req, res) => {
      try {
        const groupId = req.params.id;

        const existingGroup = await groupCollection.findOne({
          _id: new ObjectId(groupId),
        });

        if (!existingGroup) {
          return res.status(404).json({ error: "Group not found" });
        }

        const updatedData = {
          ...existingGroup,
          ...req.body,
          _id: new ObjectId(groupId),
          startDate: new Date(req.body.startDate || existingGroup.startDate),
          endDate: new Date(req.body.endDate || existingGroup.endDate),
          maxMembers: parseInt(req.body.maxMembers || existingGroup.maxMembers),
          updatedAt: new Date(),
        };

        delete updatedData._id;

        const result = await groupCollection.updateOne(
          { _id: new ObjectId(groupId) },
          { $set: updatedData }
        );

        if (result.modifiedCount === 1) {
          res.json({
            success: true,
            message: "Group updated successfully",
          });
        } else {
          res.status(400).json({
            success: false,
            error: "Failed to update group",
          });
        }
      } catch (error) {
        console.error("Error updating group:", error);
        res.status(500).json({
          success: false,
          error: "Internal server error",
        });
      }
    });

    //delete group
    app.delete("/delete-group/:id", async (req, res) => {
      console.log("Deleting group with ID:", req.params.id);

      try {
        const groupId = req.params.id;
        const result = await groupCollection.deleteOne({
          _id: new ObjectId(groupId),
        });

        if (result.deletedCount === 0) {
          return res.status(404).json({
            error: "Group not found",
          });
        }
      } catch (error) {
        console.error("Error deleting group:", error);
        res.status(500).json({
          error: "Internal server error",
        });
      }
    });

    // Join group
    app.post("/join-group/:id", async (req, res) => {
      try {
        const groupId = req.params.id;
        const { userEmail, userName } = req.body;

        if (!userEmail || !userName) {
          return res.status(400).json({
            success: false,
            error: "User email and name are required"
          });
        }

        const group = await groupCollection.findOne({ _id: new ObjectId(groupId) });

        if (!group) {
          return res.status(404).json({
            success: false,
            error: "Group not found"
          });
        }

        // Check if start date has passed
        const currentDate = new Date();
        const groupStartDate = new Date(group.startDate);

        if (currentDate > groupStartDate) {
          return res.status(400).json({
            success: false,
            error: "This group is no longer active as the start date has passed"
          });
        }

        // Check if group is full
        if (group.members && group.members.length >= group.maxMembers) {
          return res.status(400).json({
            success: false,
            error: "This group has reached its maximum member limit"
          });
        }

        // Check if user is already a member
        if (group.members && group.members.some(member => member.userEmail === userEmail)) {
          return res.status(400).json({
            success: false,
            error: "You are already a member of this group"
          });
        }

        // Add member to group
        const result = await groupCollection.updateOne(
          { _id: new ObjectId(groupId) },
          {
            $push: {
              members: {
                userEmail,
                userName,
                joinedAt: new Date()
              }
            }
          }
        );

        if (result.modifiedCount === 1) {
          res.json({
            success: true,
            message: "Successfully joined the group"
          });
        } else {
          res.status(400).json({
            success: false,
            error: "Failed to join group"
          });
        }

      } catch (error) {
        console.error("Error joining group:", error);
        res.status(500).json({
          success: false,
          error: "Internal server error"
        });
      }
    });


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
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
