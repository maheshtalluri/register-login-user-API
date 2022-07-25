const express = require("express");

const path = require("path");

const { open } = require("sqlite");

const sqlite3 = require("sqlite3");

const bcrypt = require("bcrypt");

const dbPath = path.join(__dirname, "userData.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDBAndServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("server running at http://localhost:3000");
    });
  } catch (error) {
    console.log(`DB error at: ${error.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const validPassword = (password) => {
  return password.length >= 5;
};

// Create user API

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  const selectUserQuery = `
  SELECT 
    * 
  FROM 
    user 
  WHERE 
    username = '${username}'`;

  const dbUser = await database.get(selectUserQuery);

  if (dbUser === undefined) {
    // create new user API
    const createUserQuery = `
      INSERT INTO
      user (username, name, password, gender, location)
      VALUES
      (
          "${username}",
          "${name}",
          "${hashedPassword}",
          "${gender}",
          "${location}"
          
      );`;

    if (validPassword(password)) {
      await database.run(createUserQuery);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

// user Login API

app.post("/login", async (request, response) => {
  const { username, password } = request.body;

  const getUserDetails = `
    SELECT * FROM user WHERE username = "${username}";`;

  const dbUser = await database.get(getUserDetails);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);

    if (isPasswordMatched === true) {
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

// Update password of the user

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;

  const selectUserQuery = `
  SELECT 
    * 
  FROM 
    user 
  WHERE 
    username = '${username}'`;

  const dbUser = await database.get(selectUserQuery);

  if (dbUser !== undefined) {
    const isPassword = await bcrypt.compare(oldPassword, dbUser.password);

    if (isPassword) {
      if (validPassword(newPassword)) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const updatedPassword = `UPDATE user SET password = "${hashedPassword}" WHERE username = "${username}";`;

        await database.get(updatedPassword);
        response.send("Password updated");
      } else {
        response.status(400);
        response.send("Password is too short");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
