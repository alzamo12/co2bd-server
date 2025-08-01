const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccount.json");
require("dotenv").config();
const stripe = require("stripe")(process.env.PAYMENT_GATEWAY_KEY);
const app = express();
const port = process.env.PORT || 5000;
const eventRoutes = require("./routes/event.routes");

app.use(cors(["https://co2bd-d6f4f.web.app/"]))
app.use(express.json())

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
})

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.g8eto.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers?.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).send({ message: "unauthorized access" })
    }
    // console.log(authHeader)

    const token = authHeader.split(' ')[1];

    try {
        const decoded = await admin.auth().verifyIdToken(token);
        req.user = decoded
        // console.log('decode Token', decoded);
        next()
    }
    catch (error) {
        return res.status(401).send({ message: "unauthorized access" })
    }
};

const verifyEmail = async (req, res, next) => {
    const userEmail = req.params.email;
    const adminEmail = req.user.email;
    // console.log(userEmail, adminEmail)
    if (userEmail !== adminEmail) {
        return res.status(403).send({ message: "forbidden access" })
    }
    next()
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const db = client.db("co2bd");
        const eventsCollection = db.collection("events");
        const joinedEventCollection = db.collection("joinedEvents");
        const commentsCollection = db.collection("comments");
        const likesCollection = db.collection("likes");
        const notificationsCollection = db.collection("notifications");

        // get all events
        // nice

        app.use((req, res, next) => {
            req.db = db;
            req.eventsCollection = eventsCollection;
            next();
        })
        app.use('/', eventRoutes)
        // app.get("/events", async (req, res) => {
        //     const { queryDate, title, filter, limit = 5, page = 1 } = req.query;
        //     // do query
        //     const query = {};

        //     if (title) {
        //         query.title = { $regex: title, $options: 'i' }
        //     };

        //     if (filter) {
        //         query.type = filter
        //     }

        //     if (queryDate) {
        //         const [month, date, year] = queryDate.split("/").map(Number);
        //         const utcMillis = Date.UTC(year, month - 1, date);

        //         query.timeStamp = { $gte: utcMillis }
        //     }

        //     // do sort
        //     const sort = {
        //         timeStamp: 1
        //     };
        //     // console.log(title)
        //     const eventsCount = await eventsCollection.countDocuments(query);

        //     // work for pagination
        //     const limitNum = Number(limit);
        //     const totalPages = Math.ceil(eventsCount / limitNum) || 1;
        //     const pageNum = Number(page);
        //     // const skip = limitNum * (pageNum - 1);
        //     const safePage = pageNum > totalPages ? 1 : pageNum;
        //     const skip = (safePage - 1) * limitNum;

        //     const events = await eventsCollection.find(query).sort(sort)
        //         .skip(skip)
        //         .limit(limitNum)
        //         .toArray();
        //     // console.log(events)
        //     const result = { eventsCount, events, totalPages, currentPage: safePage };
        //     res.send(result)
        // })

        // get email based events

        app.get("/events/:email", verifyToken, verifyEmail, async (req, res) => {
            const { email } = req.params;
            const query = { email };
            const result = await eventsCollection.find(query).toArray();
            res.send(result)
        })

        // get event data
        app.get("/event/:id", verifyToken, async (req, res) => {
            const { id } = req.params;
            const query = { _id: new ObjectId(id) };
            const result = await eventsCollection.findOne(query);
            res.send(result)
        })

        // create/post event API
        app.post("/event", verifyToken, async (req, res) => {
            const eventData = req.body;
            const [month, day, year] = eventData.eventDate.split("/").map(Number);
            const newData = {
                ...eventData,
                timeStamp: Date.UTC(year, month - 1, day, 0, 0, 0)
            };

            const result = await eventsCollection.insertOne(newData);
            res.send(result)
        })

        // update an event
        app.put("/event/:id", verifyToken, async (req, res) => {
            const event = req.body;
            const { id } = req.params;

            if (event.email !== req.user.email) {
                return res.status(403).send({ message: "forbidden access" })
            }

            const query = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const { _id, ...restEventProperties } = event;
            const [month, day, year] = event.eventDate.split("/").map(Number);

            const updatedDoc = {
                $set: {
                    ...restEventProperties,
                    timeStamp: Date.UTC(year, month - 1, day, 0, 0, 0)
                }
            };
            const result = await eventsCollection.updateOne(query, updatedDoc, options);
            res.send(result)
        })

        // joined events get api
        app.get("/joined-events", verifyToken, async (req, res) => {
            const { email } = req.query;
            if (email !== req.user.email) {
                return res.status(403).send({ message: "forbidden access" })
            }
            const query = { user_email: email };
            const result = await joinedEventCollection.find(query).sort({ timeStamp: 1 }).toArray();
            res.send(result)
        })

        app.post("/join-event", verifyToken, async (req, res) => {
            const event = req.body;
            const result = await joinedEventCollection.insertOne(event);
            res.send(result)
        });

        app.post('/create-payment-intent', verifyToken, async (req, res) => {
            const amount = 1000;
            try {
                const paymentIntent = await stripe.paymentIntents.create({
                    amount,
                    currency: "usd",
                    payment_method_types: ["card"]
                });
                res.send({ clientSecret: paymentIntent.client_secret })
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // comments related api's

        // post a comments
        app.post("/comments", verifyToken, async (req, res) => {
            const { text, rating, eventId } = req.body;
            const user = req.user;
            // console.log(user)
            const commentData = {
                text,
                rating,
                eventId,
                userEmail: user?.email,
                userName: user?.name,
                userPhoto: user?.picture,
                commentedDate: new Date()
            };

            const result = await commentsCollection.insertOne(commentData);
            res.send(result)
        })

        // get all comments
        app.get("/comments", async (req, res) => {
            const { eventId, page, limit } = req.query;
            const query = {};

            if (eventId) {
                query.eventId = eventId
            };
            const pageCount = parseInt(page);
            const limitCount = parseInt(limit);
            const skip = limitCount * (pageCount - 1);

            const comments = await commentsCollection
                .find(query)
                .skip(skip)
                .limit(limitCount)
                .toArray();
            const commentsCount = await commentsCollection.countDocuments(query);
            const result = { comments, commentsCount };
            res.send(result)
        })

        // likes related api's

        // like post api
        app.post("/likes", async (req, res) => {
            const data = req.body;
            // console.log(data)
            const likeData = {
                ...data,
                likedDate: new Date()
            };

            const query = {
                targe_id: data.target_id,
                user_email: data.user_email,
                target_type: data.target_type
            };
            const findLike = await likesCollection.findOne(query);
            if (findLike) {
                return res.status(409).send({ message: "you have already liked this post" })
            }

            const result = await likesCollection.insertOne(likeData);
            res.send(result)
        })

        app.get("/like", async (req, res) => {
            const { targetId, userEmail } = req.query;
            const query = {};

            if (targetId) {
                query.target_id = targetId
            }
            if (userEmail) {
                query.user_email = userEmail
            }
            // console.log(query)
            const result = await likesCollection.findOne(query);
            res.send(result)
        });

        // remove like and delete like api
        app.delete("/like/:id", async (req, res) => {
            const { id } = req.params;
            const query = { _id: new ObjectId(id) };
            // console.log(query)
            const result = await likesCollection.deleteOne(query);
            res.send(result)
        })

        app.get("/eventLikeCount/:eventId", async (req, res) => {
            const { eventId } = req.params;
            const query = {
                target_id: eventId
            }
            const eventLikeCount = await likesCollection.countDocuments(query);
            res.send(eventLikeCount)
        });


        // notification related api's
        // notification insert api
        app.post("/notification", async (req, res) => {
            const { receiverId, senderId, type, typeId, message } = req.body;

            const newNotification = {
                receiverId,
                senderId,
                type,
                typeId,
                message,
                seen: false,
                createdAt: new Date()
            };

            const result = await notificationsCollection.insertOne(newNotification);
            res.send(result);
        });

        // get a specific user notification get api
        app.get("/notifications/:userId", async (req, res) => {
            const { userId } = req.params;
            const { limit = 10, page = 1 } = req.query;

            const query = { receiverId: userId };

            const options = {
                sort: { createdAt: -1 },
                skip: parseInt(limit) * (parseInt(page) - 1),
                limit: parseInt(limit)
            };

            const notifications = await notificationsCollection.find(query, options).toArray();
            const notificationsCount = await notificationsCollection.countDocuments(query);
            const result = { notifications, notificationsCount };
            res.send(result)
        });

        // get unread count notification api
        app.get("/notification/unread-count/:userId", async (req, res) => {
            const { userId } = req.params;
            const query = {
                receiverId: userId,
                seen: false
            };
            const result = await notificationsCollection.countDocuments(query);
            res.send({ result })
        })

        // set seen notification patch api
        app.patch("/notification/mark-as-read/:id", async (req, res) => {
            const { id } = req.params;
            const query = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    seen: true
                }
            };

            const result = await notificationsCollection.updateOne(query, updatedDoc);
            res.send(result)
        })

        app.patch('/notifications/:userId', async (req, res) => {
            const { userId } = req.params;
            const query = {
                receiverId: userId,
                seen: false
            };

            const updatedDoc = {
                $set: {
                    seen: true
                }
            };

            const result = await notificationsCollection.updateMany(query, updatedDoc);
            res.send(result)
        })




        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get("/", (req, res) => {
    res.send("This is co2BD server side")
})

app.listen(port, () => {
    // console.log(`server is running on port: ${port}`)
})
