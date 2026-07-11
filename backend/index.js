import "dotenv/config";

import express from "express";
import cors from "cors";
import db from "./db/db.config.js";
import mainRouter from "./src/api/main.routes.js";
import { errorHandler } from "./src/middleware/error-handler.js";

const app = express();


 const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));


app.use(express.json());

app.use("/api", mainRouter);

app.use(errorHandler);

async function startServer() {
  try {
    const connection = await db.getConnection();
    connection.release();

    console.log("DB connected");

    app.listen(3000, () => {
      console.log("Server is running on http://localhost:3000");
    });
  } catch (error) {
    console.error("Error starting server:", error.message);
  }
}

startServer();