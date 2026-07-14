import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { PORT, DB_CONNECTION_STRING } = process.env;

if (!DB_CONNECTION_STRING) {
  throw new Error('Missing DB_CONNECTION_STRING environment variable');
}
if (!PORT) {
  throw new Error('Missing PORT environment variable');
}

mongoose
  .connect(DB_CONNECTION_STRING)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log(err);
  });
