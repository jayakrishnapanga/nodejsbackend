require('dotenv').config();
const express=require('express')
const app=express()
const cors=require('cors')
app.use(cors({
  origin: 'https://taxfiling-iyc9.vercel.app',
  origin: 'http://localhost:3000',
}));


app.get('/favicon.ico', (req, res) => {
  // Send an empty response to ignore the request
  res.status(204).end();
});

const port=process.env.PORT || 3000
app.use(express.json({limit: "10mb", extended: true}))
app.use(express.urlencoded({limit: "10mb", extended: true, parameterLimit: 50000}))
// const port=3000;
const md5=require("md5");
const path=require("path")
app.set("view engine","ejs");
app.set("views",path.resolve("./views"));
app.use(express.json());

var bodyParser = require('body-parser')
app.use(bodyParser.json()) 

function started(){
    console.log(`Example app listening on port ${port}`)
  }
console.log("myname is",process.env.myname)
app.listen(port,started)
const userRouter= require("./routes/user")

app.use("/user",userRouter)
const {connectMongoDB}=require("./connection")
// connectMongoDB('mongodb://localhost:27017/tax').then(()=> console.log("mongodb connected")).catch(err => console.log("mongodb error",err));
connectMongoDB(process.env.MongoDB_URL).then(()=> console.log("mongodb connected")).catch(err => console.log("mongodb error",err));


app.use(express.urlencoded({extended:true}))
const multer  = require('multer')
// const upload = multer({ dest: 'uploads/' })

app.get("/",(req,res,userMiddleware)=>{
  return res.render("homepage");
})
app.get("/signup",(req,res)=>{
  return res.render("signupc");
})

// app.post("/upload",upload.single("taxfile"),(req,res)=>{
//    console.log(req.body);
//    console.lopg(req.file);

//    return res.redirect("/")
// });






app.use(express.static('uploads'))




const { MongoClient } = require('mongodb');
const mongodb = require('mongodb');
const stream = require('stream');



// Configure MongoDB connection
const uri = process.env.MongoDB_URL; // Replace with your MongoDB connection URI
const dbName = 'test'; // Replace with your MongoDB database name
const client = new MongoClient(uri);
const { GridFSBucket } = require('mongodb');

// Create a multer storage engine that saves files to GridFS
const storage = multer.memoryStorage(); // Store file content in memory

// Create multer instance
const upload = multer({ storage: storage });
const mongoose = require('mongoose')
// Define the route for file submission

const generateSubmissionId = () => {
  return new mongodb.ObjectId().toHexString();
};
app.post('/submit-files', upload.fields([
  { name: 'aadharCard', maxCount: 1 },
  { name: 'panCard', maxCount: 1 },
  { name: 'formC', maxCount: 1 },
  { name: 'payslip', maxCount: 1 }
]), async (req, res) => {
  try {
    await client.connect(); // Connect to MongoDB

    const db = client.db(dbName);
    const bucket = new mongodb.GridFSBucket(db);
    const userId=req.body.userId;
    const submissionId = generateSubmissionId(); 
    const { aadharCard, panCard, formC, payslip } = req.files;

    // Upload files to GridFS
    const uploadFile = async (file) => {
      return new Promise((resolve, reject) => {
        const uploadStream = bucket.openUploadStream(file.originalname,{ metadata: { userId,submissionId } });
        const bufferStream = new stream.PassThrough();
        bufferStream.end(file.buffer);
        bufferStream.pipe(uploadStream)
          .on('error', reject)
          .on('finish', resolve);
      });
    };

    const uploadFiles = async (files) => {
      return Promise.all(files.map(file => uploadFile(file)));
    };

    await uploadFiles([aadharCard[0], panCard[0], formC[0], payslip[0]]);

    res.status(201).json({ message: 'Files submitted successfully', submissionId  });
   
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while submitting the files' });
  } finally {
    await client.close(); // Close MongoDB connection
  }
});

async function handleSubmissionDelete(req, res) {
  try {
    const submissionId = req.params.submissionId; // Use "params" instead of "param"
    console.log(submissionId);

    await client.connect();
    const db = client.db(dbName);
    const bucket = new mongodb.GridFSBucket(db);

    // Delete files with the given submissionId from GridFS
    const files = await bucket.find({ 'metadata.submissionId': submissionId }).toArray();
    for (const file of files) {
      await bucket.delete(file._id);
    }

    return res.status(200).json({ msg: 'Successfully deleted' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'An error occurred while deleting the files',error: error.message  });
  } finally {
    await client.close(); // Close MongoDB connection
  }
}







app.put('/submit-files/:submissionId', upload.fields([
  { name: 'aadharCard', maxCount: 1 },
  { name: 'panCard', maxCount: 1 },
  { name: 'formC', maxCount: 1 },
  { name: 'formD', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('I am starting updating');
    const db = client.db(dbName);
    const bucket = new mongodb.GridFSBucket(db);
    const userId = req.body.userId;
    const submissionId = req.params.submissionId;
    const { aadharCard, panCard, formC, formD } = req.files;

    // Function to update a specific file
    const updateFile = async (file, fileName) => {
      return new Promise((resolve, reject) => {
        // Find the existing file with the same submissionId and fileName
        bucket.find({ 'metadata.submissionId': submissionId, 'filename': fileName })
          .toArray((error, files) => {
            if (error) {
              reject(error);
              return;
            }

            // Delete the existing files with the same submissionId and fileName
            const deletePromises = files.map(existingFile => {
              return new Promise((resolveDelete, rejectDelete) => {
                bucket.delete(existingFile._id, (deleteError) => {
                  if (deleteError) {
                    rejectDelete(deleteError);
                  } else {
                    resolveDelete();
                  }
                });
              });
            });

            // Upload the new file
            const uploadStream = bucket.openUploadStream(fileName, { metadata: { userId, submissionId } });
            uploadStream.once('error', reject);
            uploadStream.once('finish', resolve);

            file.stream.pipe(uploadStream);
          });
      });
    };

    // Check if a specific file is present in the request and update it
    const updatePromises = [];

    if (aadharCard) {
      updatePromises.push(updateFile(aadharCard[0], 'aadharCard'));
    }

    if (panCard) {
      updatePromises.push(updateFile(panCard[0], 'panCard'));
    }

    if (formC) {
      updatePromises.push(updateFile(formC[0], 'formC'));
    }

    if (formD) {
      updatePromises.push(updateFile(formD[0], 'formD'));
    }

    // Wait for all update promises to complete
    await Promise.all(updatePromises);

    res.status(200).json({ message: 'Files updated successfully', submissionId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while updating the files' });
  }
});




app.get('/files/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    await client.connect(); // Connect to MongoDB

    const db = client.db(dbName);
    const bucket = new mongodb.GridFSBucket(db);

    // Find files associated with the given userId
    const filesCursor = bucket.find({ 'metadata.userId': userId });

    // Create an array to store the retrieved files
    const files = [];

    // Iterate over the cursor to get the files
    await filesCursor.forEach(file => {
      files.push(file);
    });

    // Check if files exist for the given userId
    if (files.length === 0) {
      return res.status(404).json({ message: 'No files found for the user' });
    }

    // res.render('files', { files });
    res.json({file:files}) // Render the 'files.ejs' template and pass the files data

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while retrieving the files' ,error: error.message });
  }

});




app.get('/download/:fileId', async (req, res) => {
  try {
    const fileId = req.params.fileId;

    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect(); // Connect to MongoDB
    console.log('MongoDB connection established successfully');

    const db = client.db(dbName);
    const bucket = new mongodb.GridFSBucket(db);

    // Find the file by its ID
    const file = await bucket.find({ _id: new ObjectId(fileId) }).toArray();

    // Check if the file exists
    if (!file || file.length === 0) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Set the appropriate headers for file download
    console.log("file sent")
    res.set('Content-Disposition', `attachment; filename="${file[0].filename}"`);
    res.set('Content-Type', 'application/octet-stream');

    // Create a read stream to pipe the file to the response
    const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));
    downloadStream.pipe(res);
  } catch (error) {
    console.error(error);
    console.log('Error occurred while downloading the file');
    res.status(500).json({ message: 'An error occurred while downloading the file',error: error.message  });
  } finally {
    client.close(); // Close MongoDB connection
    console.log('MongoDB connection closed form download');
  }
});




const { ObjectId } = require('mongodb');
// app.post('/submit-files', upload.fields([
//   { name: 'aadharCard', maxCount: 1 },
//   { name: 'panCard', maxCount: 1 },
//   { name: 'formC', maxCount: 1 },
//   { name: 'formD', maxCount: 1 }
// ]), async (req, res) => {
//   try {
//     await client.connect(); // Connect to MongoDB

//     const db = client.db(dbName);
//     const bucket = new mongodb.GridFSBucket(db);
//     const userId = "64abbfc51fed5710c15a3665";
//     const { aadharCard, panCard, formC, formD } = req.files;

//     // Upload files to GridFS with associated userId
//     const uploadFile = async (file) => {
//       return new Promise((resolve, reject) => {
//         const uploadStream = bucket.openUploadStream(file.originalname, { metadata: { userId: mongoose.Types.ObjectId(userId) } });
//         const bufferStream = new stream.PassThrough();
//         bufferStream.end(file.buffer);
//         bufferStream.pipe(uploadStream)
//           .on('error', reject)
//           .on('finish', resolve);
//       });
//     };

//     const uploadFiles = async (files) => {
//       return Promise.all(files.map(file => uploadFile(file)));
//     };

//     await uploadFiles([aadharCard[0], panCard[0], formC[0], formD[0]]);

//     res.status(200).json({ message: 'Files submitted successfully' });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'An error occurred while submitting the files' });
//   } finally {
//     await client.close(); // Close MongoDB connection
//   }
// });

       




// app.get('/files/:userId', async (req, res) => {
//   try {
//     const userId = req.params.userId; // Get the user ID from the request parameters

//     await client.connect(); // Connect to MongoDB

//     const db = client.db(dbName);
//     const filesCollection = db.collection('files.fs');

//     // Find files associated with the given userID
//     const files = await filesCollection.find({ 'metadata.userId': userId }).toArray();
    
//     // Check if files exist for the given user ID
//     if (!files || files.length === 0) {
//       return res.status(404).json({ message: 'No files found for the user' });
//     }

//     res.render('files', { files }); // Render the 'files.ejs' template and pass the files data

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'An error occurred while retrieving the files' });
//   } finally {
//     await client.close(); // Close MongoDB connection
//   }
// });

// app.get('/filess/:userId', async (req, res) => {
//   try {
//     const userId = req.params.userId; // Get the user ID from the request parameters

//     await client.connect(); // Connect to MongoDB

//     const db = client.db(dbName);
//     const filesCollection = db.collection('files.fs');

//     // Find files associated with the given userID
//     const files = await filesCollection.find({ 'metadata.userId': userId }).toArray();

//     // Check if files exist for the given user ID
//     if (!files || files.length === 0) {
//       return res.status(404).json({ message: 'No files found for the user' });
//     }

//     res.render('files', { files }); // Render the 'files.ejs' template and pass the files data

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'An error occurred while retrieving the files' });
//   } finally {
//     await client.close(); // Close MongoDB connection
//   }
// });

// app.get('/files/:userId', async (req, res) => {
//   try {
//     const userId = req.params.userId; // Get the user ID from the request parameters

//     await client.connect(); // Connect to MongoDB

//     const db = client.db(dbName);
//     const bucket = new mongodb.GridFSBucket(db, { bucketName: 'files' });

//     // Find files associated with the given userID
//     const files = await bucket.find({ 'metadata.userId': userId }).toArray();

//     // Check if files exist for the given user ID
//     if (!files || files.length === 0) {
//       return res.status(404).json({ message: 'No files found for the user' });
//     }

//     res.render('files', { files }); // Render the 'files.ejs' template and pass the files data

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'An error occurred while retrieving the files' });
//   } finally {
//     await client.close(); // Close MongoDB connection
//   }
// });





    // Iterate over the 













// Define the route to download a file
// app.get('/download/:fileLocation', (req, res) => {
//   try {
//     const fileLocation = req.params.fileLocation;

//     // Set the appropriate headers for file download
//     res.set('Content-Disposition', `attachment; filename="${fileLocation}"`);
//     res.set('Content-Type', 'application/octet-stream');

//     // Send the file as a response
//     res.sendFile(fileLocation);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'An error occurred while downloading the file' });
//   }
// });


// app.get('/download/:fileId', async (req, res) => {
//   const fileId = req.params.fileId;

//   try {
//     const file = await File.findById(fileId);

//     if (!file) {
//       return res.status(404).send('File not found');
//     }

//     const fileName = file.fileName;
//     console.log("fileName")

//     // Update the following line to provide the correct directory where the uploaded files are stored
//     const directory = path.join(__dirname, 'uploads');

//     const filePath = path.join(directory, fileName);

//     res.set('Content-Disposition', `attachment; filename="${fileName}"`);
//     res.set('Content-Type', 'application/octet-stream');

//     fs.createReadStream(filePath).pipe(res);
//   } catch (error) {
//     console.error(error);
//     res.status(500).send('An error occurred while downloading the file');
//   }
// });

// app.get('/download/:fileId', async (req, res) => {
//   const fileId = req.params.fileId;

//   try {
//     const file = await File.findById(fileId);

//     if (!file) {
//       return res.status(404).send('File not found');
//     }

//     const fileName = file.fileName;
//     const filePath = path.join(__dirname, 'uploads', fileName);

//     res.set('Content-Disposition', `attachment; filename="${fileName}"`);
//     res.set('Content-Type', 'application/octet-stream');

//     fs.createReadStream(filePath).pipe(res);
//   } catch (error) {
//     console.error(error);
//     res.status(500).send('An error occurred while downloading the file');
//   }
// });



// auhtentication using jwt
 const jwt=require("jsonwebtoken")

 const userMiddleware=require("./middlewares/auth")


const payload = { userId: '123456789', role: 'admin' };
const secretKey = 'your-secret-key';

const token = jwt.sign(payload, secretKey);

const User=require("./models/user")

app.post('/signup', async (req, res) => {
  try {
    // Extract the user data from the request body
    const { firstname, lastname, role, email, password, jobtitle, mobileNo } = req.body;
    // Create a new user document
    const user = new User({
      firstname,
      lastname,
      role,
      email,
      password,
      jobtitle,
      mobileNo,
    });

    // Save the user document to the database
    await user.save();
    res.render("login")
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while signing up' ,error: error.message });
  }
});

const cookieParser = require('cookie-parser');
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.password !== password) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, 'your-secret-key');

    res.cookie('token', token, { httpOnly: true });

    res.render('homepage');

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while logging in',error: error.message  });
  }
});


app.get("/login1",async (req,res)=>{
  res.render("login")
})







// updating user submissions


app.post('/submit-files/aadhar', upload.fields([
  { name: 'aadharCard', maxCount: 1 },
  
]), async (req, res) => {
  try {
    await client.connect(); // Connect to MongoDB

    const db = client.db(dbName);
    const bucket = new mongodb.GridFSBucket(db);
    const userId=req.body.userId;
    const submissionId=req.body.submissionId
    // const submissionId = generateSubmissionId(); 
    const { aadharCard } = req.files;

    // Upload files to GridFS
    const uploadFile = async (file) => {
      return new Promise((resolve, reject) => {
        const uploadStream = bucket.openUploadStream(file.originalname,{ metadata: { userId,submissionId } });
        const bufferStream = new stream.PassThrough();
        bufferStream.end(file.buffer);
        bufferStream.pipe(uploadStream)
          .on('error', reject)
          .on('finish', resolve);
      });
    };

    const uploadFiles = async (files) => {
      return Promise.all(files.map(file => uploadFile(file)));
    };

    await uploadFiles([aadharCard[0]]);
      console.log("this from submitted after delete")
    res.status(201).json({ message: 'Files  adahar submitted successfully', submissionId  });
    // res.redirect(`/files/64abbfc51fed5710c15a3665`);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while submitting the files',error: error.message  });
  } finally {
    await client.close(); // Close MongoDB connection
  }
});


app.post('/submit-files/pancard', upload.fields([
  { name: 'panCard', maxCount: 1 },
  
]), async (req, res) => {
  try {
    await client.connect(); // Connect to MongoDB

    const db = client.db(dbName);
    const bucket = new mongodb.GridFSBucket(db);
    const userId=req.body.userId;
    const submissionId=req.body.submissionId
    // const submissionId = generateSubmissionId(); 
    const { panCard } = req.files;

    // Upload files to GridFS
    const uploadFile = async (file) => {
      return new Promise((resolve, reject) => {
        const uploadStream = bucket.openUploadStream(file.originalname,{ metadata: { userId,submissionId } });
        const bufferStream = new stream.PassThrough();
        bufferStream.end(file.buffer);
        bufferStream.pipe(uploadStream)
          .on('error', reject)
          .on('finish', resolve);
      });
    };

    const uploadFiles = async (files) => {
      return Promise.all(files.map(file => uploadFile(file)));
    };

    await uploadFiles([panCard[0]]);
      console.log("this from submitted after delete")
    res.status(201).json({ message: 'Files Pancard submitted successfully', submissionId  });
    // res.redirect(`/files/64abbfc51fed5710c15a3665`);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while submitting the files',error: error.message  });
  } finally {
    await client.close(); // Close MongoDB connection
  }
});


app.post('/submit-files/formc', upload.fields([
  { name: 'formC', maxCount: 1 },
  
]), async (req, res) => {
  try {
    await client.connect(); // Connect to MongoDB

    const db = client.db(dbName);
    const bucket = new mongodb.GridFSBucket(db);
    const userId=req.body.userId;
    const submissionId=req.body.submissionId
    // const submissionId = generateSubmissionId(); 
    const { formC } = req.files;

    // Upload files to GridFS
    const uploadFile = async (file) => {
      return new Promise((resolve, reject) => {
        const uploadStream = bucket.openUploadStream(file.originalname,{ metadata: { userId,submissionId } });
        const bufferStream = new stream.PassThrough();
        bufferStream.end(file.buffer);
        bufferStream.pipe(uploadStream)
          .on('error', reject)
          .on('finish', resolve);
      });
    };

    const uploadFiles = async (files) => {
      return Promise.all(files.map(file => uploadFile(file)));
    };

    await uploadFiles([formC[0],]);
      console.log("this from submitted after delete")
    res.status(201).json({ message: 'Files  Formc submitted successfully', submissionId  });
    // res.redirect(`/files/64abbfc51fed5710c15a3665`);
  } catch (error) {
    console.log("this error from formc")
    console.error(error);
    res.status(500).json({ message: 'An error occurred while submitting the files' ,error: error.message });
  } finally {
    await client.close(); // Close MongoDB connection
  }
});

app.post('/submit-files/formd', upload.fields([
  { name: 'payslip', maxCount: 1 },
  
]), async (req, res) => {
  try {
    await client.connect(); // Connect to MongoDB

    const db = client.db(dbName);
    const bucket = new mongodb.GridFSBucket(db);
    const userId=req.body.userId;
    const submissionId=req.body.submissionId
    // const submissionId = generateSubmissionId(); 
    const {payslip } = req.files;

    // Upload files to GridFS
    const uploadFile = async (file) => {
      return new Promise((resolve, reject) => {
        const uploadStream = bucket.openUploadStream(file.originalname,{ metadata: { userId,submissionId } });
        const bufferStream = new stream.PassThrough();
        bufferStream.end(file.buffer);
        bufferStream.pipe(uploadStream)
          .on('error', reject)
          .on('finish', resolve);
      });
    };

    const uploadFiles = async (files) => {
      return Promise.all(files.map(file => uploadFile(file)));
    };

    await uploadFiles([payslip[0]]);
      console.log("this from submitted after delete")
    res.status(201).json({ message: 'Files  payslip submitted successfully', submissionId,  });
    // res.redirect(`/files/64abbfc51fed5710c15a3665`);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while submitting the files',error: error.message  });
  } finally {
    await client.close(); // Close MongoDB connection
  }
});


// app.delete('/submit-files/aadhar',async (req, res) =>{
//   try {
//     const submissionId = req.body.submissionId; // Use "params" instead of "param"
//     console.log(submissionId);

//     await client.connect();
//     const db = client.db(dbName);
//     const bucket = new mongodb.GridFSBucket(db);

//     // Delete files with the given submissionId from GridFS
//     const files = await bucket.find({ 'metadata.submissionId': submissionId }).toArray();
//     const aadharcardFiles =  files.filter(file => file.filename.toLowerCase().includes('aadharcard'));
//     console.log(aadharcardFiles)
    

//     await bucket.delete(aadharcardFiles._id);

//     return res.status(200).json({ msg: 'Successfully deleted' });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ msg: 'An error occurred while deleting the files' });
//   } finally {
//     await client.close(); // Close MongoDB connection
//   }
// });



// app.delete('/submit-files/aadhar', async (req, res) => {
//   try {
//     const submissionId = req.body.submissionId;
//     console.log(submissionId);

//     await client.connect();
//     const db = client.db(dbName);
//     const bucket = new mongodb.GridFSBucket(db);

//     // Find files with the given submissionId from GridFS
//     const files = await bucket.find({ 'metadata.submissionId': submissionId }).toArray();
//     const aadharcardFiles = files.filter(file => file.filename.toLowerCase().includes('aadharcard'));
//     console.log(aadharcardFiles);

//     // Delete each file from the array
//     for (const file of aadharcardFiles) {
//       await bucket.delete(file._id);
//     }
//   console.log("this is form adhar delte")
//     return res.status(201).json({ msg: 'Successfully deleted' });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ msg: 'An error occurred while deleting the files' });
//   } finally {
//     await client.close(); // Close MongoDB connection
//   }
// });
