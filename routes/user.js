const express=require("express");
const router=express.Router();

const{handleGetAllUsers,handleGetUserById,createUser,deleteUserById,updateUserById,handleUserLogin,handleProfileUpdate,handleSubmissionDelete,handleSubmissionUpdate,handleAadharDelete, handlePancardDelete, handleFormdDelete,handleFormcDelete}=require("../controllers/user")



router.post("/",createUser)

router.get("/",handleGetAllUsers)
router.post("/login",handleUserLogin)
router.put("/profile/:userid",handleProfileUpdate)
router.delete("/submission/:id",handleSubmissionDelete)
router.get("/submissionupdate/:id",handleSubmissionUpdate)
router.delete("/aadhar/:id",handleAadharDelete)
router.delete("/pancard/:id",handlePancardDelete)
router.delete("/formd/:id",handleFormdDelete)
router.delete("/formc/:id",handleFormcDelete)

router
   .route("/:id")
   .get(handleGetUserById)
   .patch(updateUserById)
   .delete(deleteUserById)

module.exports=router;