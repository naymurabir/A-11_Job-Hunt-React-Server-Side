const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000


//Middleware 
app.use(cors())
app.use(express.json())



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

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const jobsCollection = client.db('JobHuntDB').collection('jobs')

        const jobsAppliedCollection = client.db('JobHuntDB').collection('jobsApplied')

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

        //My Jobs Related APIs
        //GET Job
        app.get('/myJobs', async (req, res) => {
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
        app.post('/jobApply', async (req, res) => {
            const newJobApply = req.body
            const result = await jobsAppliedCollection.insertOne(newJobApply)
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
    res.send("The Job Hunt server is running...")
})

app.listen(port, () => {
    console.log(`The server is running on port: ${port}`);
})