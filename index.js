const pg = require("pg");
const express = require("express");

const client = new pg.Client(
  process.env.DATABASE_URL || "postgres://localhost/acme_hr_directory_db"
);

const server = express();


const init = async () => {

  await client.connect();
  console.log("connected to database");


  let SQL = `DROP TABLE IF EXISTS employee;
    DROP TABLE IF EXISTS department;

    CREATE TABLE department(
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
    );

    CREATE TABLE employee(
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    department_id INTEGER REFERENCES department(id) NOT NULL
    );`;

  await client.query(SQL);
  console.log("tables created");


  SQL = `INSERT INTO department(name) VALUES('SQL');
    INSERT INTO department(name) VALUES('Express');
    INSERT INTO department(name) VALUES('Shopping');

    INSERT INTO employee(name, department_id) VALUES('learn express', 5, (SELECT id FROM department WHERE name='Express'));
    INSERT INTO employee(name, department_id) VALUES('add logging middleware', 5, (SELECT id FROM department WHERE name='Express'));
    INSERT INTO employee(name, department_id) VALUES('write SQL queries', 4, (SELECT id FROM department WHERE name='SQL'));
    INSERT INTO employee(name, department_id) VALUES('learn about foreign keys', 4, (SELECT id FROM department WHERE name='SQL'));
    INSERT INTO employee(name, department_id) VALUES('buy a quart of milk', 2, (SELECT id FROM department WHERE name='Shopping'));`;

  await client.query(SQL);
  console.log("data seeded");


  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => console.log(`listening on port ${PORT}`));
};


init();


server.use(express.json());
server.use(require("morgan")("dev"));


server.get("/api/departments", async (req, res, next) => {
  try {

    const SQL = `
      SELECT * from department;
    `;

    const response = await client.query(SQL);

    res.send(response.rows);
  } catch (err) {
    next(err);
  }
});


server.get("/api/employees", async (req, res, next) => {
  try {

    const SQL = `SELECT * from employee ORDER BY created_at DESC;`;

    const response = await client.query(SQL);

    res.send(response.rows);
  } catch (err) {
    next(err);
  }
});


server.post("/api/employees", async (req, res, next) => {
  try {

    const { name, department_id } = req.body;


    if (!name && !department_id) {

      return res.status(400).send({
        message:
          "Please send the name, and department_id to create.",
      });
    }


    const SQL = `
      INSERT INTO employee(name, department_id)
      VALUES($1,$2)
      RETURNING *
    `;

    const response = await client.query(SQL, [name, department_id]);

    res.status(201).send(response.rows[0]);
  } catch (err) {
    next(err);
  }
});


server.put("/api/employees/:id", async (req, res, next) => {
  try {

    const { name, department_id } = req.body;


    if (!name && !department_id) {

      return res
        .status(400)
        .send({ message: "Please edit the text, ranking or category" });
    }



    let SQL = ``;
    let response = ``;

    if (name) {

      SQL = `
      UPDATE employee
      SET name=$1, department_id=$2, updated_at= now()
      WHERE id=$4 RETURNING *
    `;



      response = await client.query(SQL, [
        name,
        ranking,
        department_id,
        req.params.id,
      ]);
    } else if (!name) {

      SQL = ` UPDATE employee
      SET department_id=$2, updated_at= now()
      WHERE id=$3 RETURNING *`;


      response = await client.query(SQL, [department_id, req.params.id]);
    } else if (name) {
     
      SQL = SQL = `UPDATE employee
      SET name=$1, department_id=$2, updated_at= now()
      WHERE id=$3 RETURNING *`;


      response = await client.query(SQL, [name, department_id, req.params.id]);
    } else {

      SQL = SQL = `UPDATE employee
      SET department_id=$1, updated_at= now()
      WHERE id=$2 RETURNING *`;


      response = await client.query(SQL, [department_id, req.params.id]);
      console.log(response.rows);
    }


    res.send(response.rows[0]);
  } catch (err) {
    next(err);
  }
});


server.delete("/api/employees/:id", async (req, res, next) => {
  try {

    const SQL = `
      DELETE from employee
      WHERE id = $1;
    `;

    await client.query(SQL, [req.params.id]);

    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});


server.use((err, req, res) => {
  res.status(err.status || 500).send({ error: err });
});