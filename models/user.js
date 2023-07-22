const mongoose=require("mongoose")

const userSchema=new mongoose.Schema({
    firstname:{type: String,required:true},
    lastname:{type:String,},
    email:{type:String,required:true,unique:true},
    password:{type:String,required:true,},
    jobtitle:{type:String,},
    mobileNo:{type:Number,required:true,},
    createdAt: { type: Date, default: Date.now } 
       
})

const User=mongoose.model("users",userSchema);

module.exports=User;
// const mongoose = require('mongoose');
// const autoIncrement = require('mongoose-auto-increment');

// const connection = mongoose.createConnection('your-mongodb-connection-string');

// autoIncrement.initialize(connection);

// const userSchema = new mongoose.Schema({
//   firstname: { type: String, required: true },
//   lastname: { type: String },
//   role: { type: String, required: true },
//   email: { type: String, required: true, unique: true },
//   password: { type: String, required: true },
//   jobtitle: { type: String },
//   mobileNo: { type: Number, required: true, unique: true },
// });

// userSchema.plugin(autoIncrement.plugin, { model: 'User', field: 'id', startAt: 1 });
// const User = connection.model('User', userSchema);

// module.exports = User;