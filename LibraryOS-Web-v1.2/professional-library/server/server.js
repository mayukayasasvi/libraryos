require("dotenv").config();
const path=require("node:path");
const express=require("express");
const session=require("express-session");
const SQLiteStore=require("connect-sqlite3")(session);
const helmet=require("helmet");
const {requireAuth,requireAdmin}=require("./middleware/auth");
require("./database");

const app=express();
const isProduction=process.env.NODE_ENV==="production";
if(isProduction) app.set("trust proxy",1);
app.use(helmet({contentSecurityPolicy:false}));
app.get("/health", (req,res) => res.status(200).json({ status: "ok", app: "LibraryOS" }));
app.use(express.json({limit:"100kb"}));
app.use(session({
  name:"library.sid",
  store:new SQLiteStore({db:"sessions.db",dir:path.join(__dirname,"..","database")}),
  secret:process.env.SESSION_SECRET,
  resave:false,saveUninitialized:false,
  cookie:{httpOnly:true,sameSite:"strict",secure:isProduction,maxAge:1000*60*60*8}
}));
app.use("/api/auth",require("./routes/auth"));
app.use("/api",requireAuth);
app.use("/api/books",require("./routes/books"));
app.use("/api/members",require("./routes/members"));
app.use("/api/loans",require("./routes/loans"));
app.use("/api/reports",require("./routes/reports"));
app.use(express.static(path.join(__dirname,"..","public")));
app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"..","public","index.html")));
app.use((err,req,res,next)=>{console.error(err);res.status(500).json({error:"Unexpected server error."});});

const port=Number(process.env.PORT)||3000;
if(!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  console.error("SESSION_SECRET is required and must be at least 32 characters long.");
  process.exit(1);
}
app.listen(port,()=>console.log(`Library system running at http://localhost:${port}`));
