const express = require("express");
const {v4 : uuidv4} = require("uuid");

const app = express();

app.use(express.json());

const costumers = [];

/**
 * cpf: string
 * name: string
 * id: uuid
 * statements: array
 */

//create account
app.post("/account", (request, response)=>{
    const {cpf, name} = request.body;

    const id = uuidv4();

    costumers.push({
        cpf,
        name,
        id,
        statements:[]
    })
    return response.status(201).send();
});

app.listen(3333);

