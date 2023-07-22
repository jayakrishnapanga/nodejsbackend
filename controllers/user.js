const User=require("../models/user")
const md5=require("md5")
const jwt=require("jsonwebtoken")
const { MongoClient } = require('mongodb');
const mongodb = require('mongodb');
const stream = require('stream');



// Configure MongoDB connection
const uri = process.env.MongoDB_URL; // Replace with your MongoDB connection URI
const dbName = 'test'; // Replace with your MongoDB database name
const client = new MongoClient(uri);
const { GridFSBucket } = require('mongodb');
// const userMiddleware=require("./middlewares/auth")


const payload = { userId: '123456789', role: 'admin' };
const secretKey = 'your-secret-key';

const token = jwt.sign(payload, secretKey);
// this is actually eorking
//  async function createUser(req,res){
//     const body=req.body;
//     if(
//         !body ||
//         !body.firstname ||
//         !body.password||
//         !body.lastname  ||
//         !body.email  ||
//         !body.jobtitle ||
//         !body.mobileNo
//     ){
//         return res.status(400).json({msg:"all fields are required"})
//     }
//     const result=await User.create({
//         firstname:body.firstname,
//         lastname:body.lastname,
//         password:md5(body.password),
//         email:body.email,
//         jobtitle:body.jobtitle,
//         mobileNo:body.mobileNo
//     })
//     console.log(result)
//     return res.status(201).json({msg:"success",id:result._id},)
//  }


// async function createUser(req, res) {
//     try {
//       const body = req.body;
//       if (
//         !body ||
//         !body.firstname ||
//         !body.password ||
//         !body.lastname ||
//         !body.email ||
//         !body.jobtitle ||
//         !body.mobileNo
//       ) {
//         return res.status(400).json({ msg: "All fields are required" });
//       }
  
//       // Check if the email already exists in the database
//       const existingUser = await User.findOne({ email: body.email });
//       if (existingUser) {
//         return res.status(409).json({ msg: "User already exists with this email" });
//       }
  
//       // Create the user if the email is not already registered
//       const result = await User.create({
//         firstname: body.firstname,
//         lastname: body.lastname,
//         password: body.password,
//         email: body.email,
//         jobtitle: body.jobtitle,
//         mobileNo: body.mobileNo,
//       });
//       console.log(result);
//       return res.status(201).json({ msg: "Success", id: result._id });
//     } catch (error) {
//       console.error(error);
//       res.status(500).json({ msg: "An error occurred while creating the user  ", error: error.message  });
//     }
//   }



async function createUser(req, res) {
  try {
    const body = req.body;
    if (
      !body ||
      !body.firstname ||
      !body.password ||
      !body.lastname ||
      !body.email ||
      !body.jobtitle ||
      !body.mobileNo
    ) {
      return res.status(400).json({ msg: "All fields are required" });
    }

    // Connect to the MongoDB database using the provided URI
    const client = new MongoClient(uri, { useUnifiedTopology: true });
    await client.connect();

    // Check if the email already exists in the database
    const db = client.db(dbName);
    const existingUser = await db.collection('users').findOne({ email: body.email });
    if (existingUser) {
      return res.status(409).json({ msg: "User already exists with this email" });
    }

    // Create the user if the email is not already registered
    const result = await db.collection('users').insertOne({
      firstname: body.firstname,
      lastname: body.lastname,
      password: body.password,
      email: body.email,
      jobtitle: body.jobtitle,
      mobileNo: body.mobileNo,
    });
    console.log(result);
    client.close(); // Close the MongoDB client connection

    return res.status(201).json({ msg: "Success", id: result.insertedId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "An error occurred while creating the user", error: error.message });
  }
}
  
 const cookieParser = require('cookie-parser');

async function handleGetAllUsers(req,res){
    const alldbusers=await User.find({});
    const html=`<ul>
    ${alldbusers.map((user) => `<li> ${user.firstname}-${user.email}</li>`).join("")}
    </ul>`
    res.send(html)

}

async function handleGetUserById(req,res){
    const users=await User.findById(req.params.id);
      if (!users) 
       return res.status(404).json({error:"user not found"});
     return res.json(users);  

 }

 async function updateUserById(req,res){
    const up=await User.findByIdAndUpdate(req.params.id, {lastname :"changed"});
        return res.json({msg:"sucessfully updated"});
 }

 async function deleteUserById(req,res){
   
    const user=await User.findByIdAndDelete(req.params.id);
    if (!user) 
       return res.status(404).json({error:"user not found"});
    return res.json({msg:"sucessfully deleted"});
 }


//  async function handleUserLogin(req, res) {
//    try {
//      const { email, password } = req.body;
 
//      // Assume User is the Mongoose model representing your user data
//      const user = await User.findOne({ email });
 
//      if (!user) {
//        return res.status(404).json({ message: 'User not found' });
//      }
 
//      if (user.password !== password) {
//        return res.status(401).json({ message: 'Invalid password' });
//      }
 
//      // Generate the token
//      const token = jwt.sign({ id: user.id, role: user.firstname }, 'your-secret-key');
//      console.log('Generated Token:', token);
//      // Set the token as a cookie in the response
//      res.cookie('token', token, { httpOnly: true });
 
//      return res.status(201).json({ message: 'You have successfully logged in' });
//    } catch (error) {
//      console.error(error);
//      res.status(500).json({ message: 'An error occurred while logging in' });
//    }
//  }



//// this  is actual one which was working

async function handleUserLogin(req, res) {
  try {
    const { email, password } = req.body;

    // Assume User is the Mongoose model representing your user data
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "user doesn't exists" });
    }

    if (user.password !== password) {
      
      return res.status(401).json({ message: 'Invalid password or Invalid email' });
    }

    // Generate the token
    const expiresIn='1h'
    const token = jwt.sign({ id: user.id, role: user.firstname, }, 'your-secret-key',{expiresIn});
    console.log('Generated Token:', token);

    // Instead of setting the token as a cookie, send it in the response as JSON
    return res.status(201).json({ token, message: 'You have successfully logged in',firstname:user.firstname,userId:user.id });
  } catch (error) {
    console.error(error);
    // res.status(500).json({ message: 'An error occurred while logging in' });
    res.status(500).json({ message: 'please provide valid credentilas', error: error.message  });
  }
}


// async function handleUserLogin(req, res) {
//   try {
//     const { email, password } = req.body;

//     // Connect to the MongoDB database using the provided URI
//     const client = new MongoClient(uri, { useUnifiedTopology: true });
//     await client.connect();

//     // Get the user from the database based on the email
//     const db = client.db(dbName);
//     const user = await db.collection('users').findOne({ email });

//     if (!user) {
//       client.close(); // Close the MongoDB client connection
//       return res.status(404).json({ message: "User doesn't exist" });
//     }

//     // Compare the provided password with the hashed password stored in the database
//     const passwordMatch = await bcrypt.compare(password, user.password);
//     if (!passwordMatch) {
//       client.close(); // Close the MongoDB client connection
//       return res.status(401).json({ message: 'Invalid password or invalid email' });
//     }

//     // Generate the token
//     const expiresIn = '1h';
//     const token = jwt.sign({ id: user.id, role: user.firstname }, 'your-secret-key', { expiresIn });
//     console.log('Generated Token:', token);

//     client.close(); // Close the MongoDB client connection

//     // Instead of setting the token as a cookie, send it in the response as JSON
//     return res.status(201).json({
//       token,
//       message: 'You have successfully logged in',
//       firstname: user.firstname,
//       userId: user.id,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Please provide valid credentials', error: error.message });
//   }
// }
async function handleProfileUpdate(req,res){
  try{
   const userid=req.params.userid
   const Updateuser= await User.findByIdAndUpdate(userid,
    {
      $set:{
        firstname:req.body.firstname,
        lastname: req.body.lastname,
        email: req.body.email,
        jobtitle: req.body.jobtitle,
        mobileNo: req.body.mobileNo,
      },
     
    },  { new: true }
    );
    if(!Updateuser){
      return res.status(404).json({mag:"not a valid user requset"})
    }
    res.json({msg:"user profile updated successfully"})
  }catch(error){
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'An error occurred while updating the profile', error: error.message  });
  }


}
async function handelprofiledetails(req,res){
   
  try{
    const userid= req.params.userid
    const userdetails=await User.findById(userid)

    if(!userdetails){
      return res.json("user not found")
    }
     
    return res.json({user:userdetails})


  }catch(error){
     return res.status.json({msg:'an error while fectching user details',error: error.message })

  }

}

 

// async function handleSubmissionDelete(req, res) {
//   try {
//     const submissionId = req.params.id; // Use "params" instead of "param"
//     console.log("this is form dleete")
//     console.log(submissionId);

//     await client.connect();
//     const db = client.db(dbName);
//     const bucket = new mongodb.GridFSBucket(db);

//     // Delete files with the given submissionId from GridFS
//     const files = await bucket.find({ 'metadata.submissionId': submissionId }).toArray();
//     console.log(files)
//     for (const file of files) {
//       await bucket.delete(file._id);
//     }

//     return res.status(200).json({ msg: 'Successfully deleted' });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ msg: 'An error occurred while deleting the files' });
//   } finally {
//     await client.close(); // Close MongoDB connection
//   }
// }



async function handleSubmissionDelete(req, res) {
  try {
    const submissionId = req.params.id;
    console.log("this is form delete")
    console.log(submissionId);
    console.log("above is sunmissionid")

    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db(dbName);
    const bucket = new GridFSBucket(db);

    // Delete files with the given submissionId from GridFS
    const files = await bucket.find({ 'metadata.submissionId': submissionId }).toArray();
    // console.log(files)
    const aadharcardFiles = files.filter(file => file.filename.toLowerCase().includes('aadharcard'));
        console.log(aadharcardFiles)
    for (const file of files) {
      await bucket.delete(file._id);
    }

    return res.status(200).json({ msg: 'Successfully deleted' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'An error occurred while deleting the files,',error: error.message  });
  } finally {
    client.close(); // Close MongoDB connection
  }
}



async function handleSubmissionUpdate(req, res) {
 


  try {
    const submissionId = req.params.id;
    console.log("this is form delete")
    console.log(submissionId);
    console.log("above is sunmissionid")

    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db(dbName);
    const bucket = new GridFSBucket(db);

    // Delete files with the given submissionId from GridFS
    const files = await bucket.find({ 'metadata.submissionId': submissionId }).toArray();
    console.log(files)
    // for (const file of files) {
    //   await bucket.delete(file._id);
    // }

    return res.status(200).json({ msg: 'we fetched successfully your updated files',files });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'An error occurred while deleting the files',error: error.message  });
  } finally {
    client.close(); // Close MongoDB connection
  }
}








async function handleAadharDelete(req, res) {
  try {
    const submissionId = req.params.id;
    console.log("this is form delete")
    console.log(submissionId);
    console.log("hey this adhar delete")

    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db(dbName);
    const bucket = new GridFSBucket(db);

    // Delete files with the given submissionId from GridFS
    const files = await bucket.find({ 'metadata.submissionId': submissionId }).toArray();
    console.log(files)
    const aadharcardFiles = files.filter(file => file.filename.toLowerCase().includes('aadharcard'));
        console.log(aadharcardFiles)
    for (const file of aadharcardFiles) {
      await bucket.delete(file._id);
    }

    return res.status(200).json({ msg: 'Successfully deleted' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'An error occurred while deleting the files',error: error.message  });
  } finally {
    client.close(); // Close MongoDB connection
  }
}

async function handlePancardDelete(req, res) {
  try {
    const submissionId = req.params.id;
    console.log("this is form delete")
    console.log(submissionId);
    console.log("hey this adhar delete")

    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db(dbName);
    const bucket = new GridFSBucket(db);

    // Delete files with the given submissionId from GridFS
    const files = await bucket.find({ 'metadata.submissionId': submissionId }).toArray();
    console.log(files)
    const PancardFiles = files.filter(file => file.filename.toLowerCase().includes('pancard'));
        console.log(PancardFiles)
    for (const file of PancardFiles) {
      await bucket.delete(file._id);
    }

    return res.status(200).json({ msg: 'Successfully deleted' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'An error occurred while deleting the files',error: error.message  });
  } finally {
    client.close(); // Close MongoDB connection
  }
}

async function handleFormdDelete(req, res) {
  try {
    const submissionId = req.params.id;
    console.log("this is form delete")
    console.log(submissionId);
    console.log("hey this formd delete")

    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db(dbName);
    const bucket = new GridFSBucket(db);

    // Delete files with the given submissionId from GridFS
    const files = await bucket.find({ 'metadata.submissionId': submissionId }).toArray();
    console.log(files)
    const FormdFiles = files.filter(file => file.filename.toLowerCase().includes('payslip'));
        console.log(FormdFiles)
    for (const file of FormdFiles) {
      await bucket.delete(file._id);
    }

    return res.status(200).json({ msg: 'Successfully deleted' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'An error occurred while deleting the files',error: error.message  });
  } finally {
    client.close(); // Close MongoDB connection
  }
}

async function handleFormcDelete(req, res) {
  try {
    const submissionId = req.params.id;
   
    console.log(submissionId);
    console.log("hey this formc delete")

    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db(dbName);
    const bucket = new GridFSBucket(db);

    // Delete files with the given submissionId from GridFS
    const files = await bucket.find({ 'metadata.submissionId': submissionId }).toArray();
    console.log(files)
    const formcFiles = files.filter(file => file.filename.toLowerCase().includes('formc'));
        console.log(formcFiles)
    for (const file of formcFiles) {
      await bucket.delete(file._id);
    }

    return res.status(200).json({ msg: 'Successfully deleted' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'An error occurred while deleting the files',error: error.message  });
  } finally {
    client.close(); // Close MongoDB connection
  }
}



module.exports = handleSubmissionDelete;


 module.exports={
    createUser,
    handleGetAllUsers,
    handleGetUserById,
    updateUserById,
    deleteUserById,
    handleUserLogin,
    handleProfileUpdate,
    handleSubmissionDelete,
    handleSubmissionUpdate,
    handleAadharDelete,
    handlePancardDelete,
    handleFormdDelete,
    handleFormcDelete

 }

 