const express = require('express');
const cors = require('cors');
var jwt = require('jsonwebtoken');
var cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000


//Middleware 
app.use(cors({
    origin: ['http://localhost:5173', 'https://job-hunt-react-project.web.app', 'https://job-hunt-react-project.firebaseapp.com'],
    credentials: true
}))
app.use(express.json())
app.use(cookieParser())



//Database
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cgjyfgp.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// Custom Middleware 
const logger = async (req, res, next) => {
    console.log("Called:", req.host, req.originalUrl);
    next()
}

const verifyToken = async (req, res, next) => {
    const token = req.cookies.token
    console.log("The desired token:", token);

    if (!token) {
        return res.status(401).send({ message: "Unauthorized" })
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: "Unauthorized" })
        }
        console.log("The value of token:", decoded);
        req.body = decoded
        next()
    })

}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const jobsCollection = client.db('JobHuntDB').collection('jobs')

        const jobsAppliedCollection = client.db('JobHuntDB').collection('jobsApplied')

        //JWT related APIs
        app.post('/jwt', async (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

            res.cookie('token', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'none'

            }).send({ success: true })
        })

        //Remove token after logout the user
        app.post('/logout', async (req, res) => {
            const user = req.body
            console.log("User: ", user);
            res.clearCookie('token', {
                maxAge: 0,
                secure: process.env.NODE_ENV === 'production' ? true : false,
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            })
                .send({ status: true })
        })

        //Jobs related APIs
        //POST
        app.post('/jobs', async (req, res) => {
            const newJob = req.body
            const result = await jobsCollection.insertOne(newJob)
            res.send(result)
        })

        //GET
        app.get('/jobs', async (req, res) => {
            const cursor = jobsCollection.find()
            const result = await cursor.toArray()
            res.send(result)
        })

        // Increment related APIs
        app.patch('/updateApplicants/:id', async (req, res) => {
            const { id } = req.params;
            const query = { _id: new ObjectId(id) }
            const job = await jobsCollection.findOne(query);

            if (job) {
                const result = await jobsCollection.updateOne(query, {
                    $inc: { applicants_number: 1 },
                });
                res.send(result);
            }

        });

        //My Jobs Related APIs
        //GET Job
        app.get('/myJobs', verifyToken, async (req, res) => {

            if (req.query?.email !== req.body?.email) {
                return res.status(403).send({ message: 'Forbidden access' })
            }

            let query = {}
            if (req.query?.email) {
                query = { email: req.query?.email }
            }
            const result = await jobsCollection.find(query).toArray()
            res.send(result)
        })

        //UPDATE Job
        app.put('/myJobs/:id', async (req, res) => {
            const id = req.params.id;
            const updateJob = req.body
            console.log(updateJob)
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const updateDoc = {
                $set: {
                    name: updateJob.name,
                    image: updateJob.image,
                    job_title: updateJob.job_title,
                    job_category: updateJob.job_category,
                    salary: updateJob.salary,
                    description: updateJob.description,
                    applicants_number: updateJob.applicants_number,
                    posting_date: updateJob.posting_date,
                    application_deadline: updateJob.application_deadline
                }
            }
            const result = await jobsCollection.updateOne(filter, updateDoc, options)
            res.send(result)
        })

        // DELETE Job
        app.delete('/myJobs/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await jobsCollection.deleteOne(query)
            res.send(result)
        })

        //GET single data 
        app.get('/job/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await jobsCollection.findOne(query)
            res.send(result)
        })

        // Applied Jobs APIs
        //POST Applied Job
        app.post('/jobApply', async (req, res) => {
            const newJobApply = req.body
            const result = await jobsAppliedCollection.insertOne(newJobApply)
            res.send(result)
        })

        //GET Applied Job based on email
        app.get('/jobApply', verifyToken, async (req, res) => {

            if (req.query?.email !== req.body?.email) {
                return res.status(403).send({ message: 'Forbidden access' })
            }

            let query = {}
            if (req.query?.email) {
                query = { applyEmail: req.query?.email }
            }
            const result = await jobsAppliedCollection.find(query).toArray()
            res.send(result)
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


app.get('/', (req, res) => {
    res.send("The Job Hunt server is running successfully...")
})

app.listen(port, () => {
    console.log(`The server is running on port: ${port}`);
})