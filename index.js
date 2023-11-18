const express = require('express')
const app = express()
const cors = require('cors')
var jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId, Admin } = require('mongodb');
require('dotenv').config()

const port = process.env.PORT || 5000

// middle ware  
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASS}@cluster0.vfr78tp.mongodb.net/?retryWrites=true&w=majority`;

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
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // user collections
        const userCollection = client.db('bistroDb').collection('users')

        // data collections
        const menuCollection = client.db('bistroDb').collection('menu')

        //users reviews us
        const reviewsCollection = client.db('bistroDb').collection('reviews')

        // user add cart collections
        const cartsCollection = client.db('bistroDb').collection('carts')


        //$$$$$$$$$$$$ jwt api $$$$$$$$$$$$$$
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '2h' });
            res.send({ token: token })
        })

        //jwt middleware token Verify
        const verifyToken = (req, res, next) => {
            // console.log('is side varifyToken', req.headers)
            if (!req.headers.authorization) {
                return res.status(401).send({ massage: 'authorization access' })
            }
            const token = req.headers.authorization.split(' ')[1]
            // if (!token) {
            //     return res.status(401).send({ massage: 'forbidden access' })
            // }
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ massage: 'authorization access' })
                }
                req.decoded = decoded
                next()
            })

        }

        // middleware token Verify then verify admin
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await userCollection.findOne(query)

            const isAdmin = user?.role === 'admin'
            if (!isAdmin) {
                return res.status(403).send({ massage: 'forbidden access' })
            }
            next()
        }

        //$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$



        // ############   product menu  #########

        // only admin can post data
        app.post('/menu', verifyToken, verifyAdmin, async (req, res) => {
            const menuItem = req.body;

            const result = await menuCollection.insertOne(menuItem)
            res.send(result)
        })

        //get all menu data for all users
        app.get('/menu', async (req, res) => {
            const result = await menuCollection.find().toArray()
            res.send(result)
        })

        // get single menu item base on id
        app.get('/menu/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await menuCollection.findOne(query)
            res.send(result)
        })

        // update menu item
        app.patch('/menu/:id', async (req, res) => {
            const id = req.params.id
            const item = req.body;

            const filter = { _id: new ObjectId(id) }
            const updateOne = {
                $set: {
                    category: item.category,
                    details: item.details,
                    image: item.image,
                    name: item.name,
                    price: item.price
                },
            }
            const result = await menuCollection.updateOne(filter, updateOne)
            console.log(result)
            res.send(result)
        })


        ///admin delete item
        app.delete('/menu/:id', async (req, res) => {
            const id = req.params.id

            const query = { _id: new ObjectId(id) }

            const result = await menuCollection.deleteOne(query)

            res.send(result)
        })





        // ***************** users reviews us ************
        app.get('/reviews', async (req, res) => {
            const result = await reviewsCollection.find().toArray()
            res.send(result)
        })


        // ***************** start cart collections ************
        // carts collections
        app.post('/carts', async (req, res) => {
            //body theke cartItem pacchi
            const cartItem = req.body;
            // cart item k data bage a rakchi
            const result = await cartsCollection.insertOne(cartItem)
            res.send(result)
        })
        // carts collections get

        app.get('/carts', async (req, res) => {
            const email = req.query.email
            const query = { email: email }
            const result = await cartsCollection.find(query).toArray()
            res.send(result)
        })

        // delete user cart data
        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await cartsCollection.deleteOne(query)
            res.send(result)

        })
        // ***************** end cart collections ************


        // *****************  users collections ************
        // users api
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query)
            if (existingUser) {
                return res.send({ message: 'User already exist' })
            }
            const result = await userCollection.insertOne(user)
            res.send(result)
        })

        //users get 
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {

            const result = await userCollection.find().toArray()
            res.send(result)
        })

        //delete user by admin
        app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(query)
            res.send(result)
        })

        // admin api
        app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: ('admin')
                },
            }
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result)
        }
        )

        // caking admin
        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email
            if (email !== req.decoded.email) {
                return res.status(403).send({ massage: 'authorization access' })
            }

            const query = { email: email }
            const user = await userCollection.findOne(query)

            let admin = false;
            if (user) {
                admin = user.role === 'admin'
            }
            res.send({ admin })
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);






app.get("/", (req, res) => {
    res.send('boss is running')
})

app.listen(port, () => {
    console.log('boss is running', port)
})