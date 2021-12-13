const { request, response } = require("express");
const express = require("express");
const {v4:uuidv4} = require("uuid");
// v4 gera um id com número randômico

const app = express();

//middleware
app.use(express.json());

// array na memória da aplicação, sempre que der reload no servidor nodemon, vai limpar a memória e zerar o array
const costumers = [];

/**
 * cpf: string
 * name: string
 * id: uuid (identificador único universal - biblioteca gera automaticamente)
 * statements: array (créditos e débitos)
 */

/* Middlewares
Um Middleware precisa receber três parâmetros: resquest, response e next
O "next" define se o middleware vai prosseguir com a operação ou se ele vai parar
Existem duas formas de chamar um middleware, uma forma é direto na requisição:

app.post(/route, MiddlewareNoMeio, (request, response)=>{...});

Colocando o middleware no meio da requisição, antes do request e response e
A outra forma de chamar o middleware é:

 app.use(verifyIfExistsAccountCPF)

Dessa forma todas as rotas que estiverem abaixo dessa declaração irão passar pelo middleware

*/

//Verificando se a conta é existente com um middleware 
function verifyIfExistsAccountCPF(request, response, next){
    const {cpf} = request.headers;

    const costumer = costumers.find((costumer) => costumer.cpf === cpf);

    if(!costumer){
        return response.status(400).json({error: "Costumer not found"});
    };

    //passando o costumer para todos que chamarem o middleware recuperarem a informação
    request.costumer = costumer;

    return next();
}

/* Funções */

function getBalance(statement){
    //função do javascript reduce: pega todos os valores e transforma em um
    const balance = statement.reduce((acc, operation) =>{
        if(operation.type === 'credit'){
            return acc + operation.amount;
        }else{
            return acc - operation.amount;
        }
    }, 0);

    return balance;
}

// Routes

//create account
app.post("/account", (request, response)=>{
    const {cpf, name} = request.body;

    // some = busca se existe um cpf (true ou false)
    const costumerAlreadyExists = costumers.some(
        (costumer)=> costumer.cpf === cpf
    );
    if(costumerAlreadyExists){
        return response.status(400).json({error: "Costumer already exists!"});
    };

    //inserindo dados dentro de um array
    costumers.push({
        cpf,
        name,
        id: uuidv4(),
        statement:[]
    })

    // deu tudo certo! 201
    return response.status(201).send();
});

//atualizando dados conta
app.put("/account", verifyIfExistsAccountCPF, (request, response) =>{
    const {name} = request.body;
    const {costumer} = request;

    costumer.name = name;

    return response.status(201).send();
})

app.get("/account", verifyIfExistsAccountCPF, (request, response)=>{
    const {costumer} = request;

    return response.json(costumer);
})

app.delete("/account", verifyIfExistsAccountCPF, (request,response) =>{
    const {costumer} = request;

    //splice é uma função do javascript para deletar de um array, então ele espera a posição e o segundo parâmetro é até onde ele vai deletar depois dessa posição
    //nesse caso apenas o costumer
    costumers.splice(costumer, 1);

    return response.status(200).json(costumers);
} )


/* 
Exemplo requisição sem middleware:

app.get("/statement/:cpf", (request, response) =>{
    const {cpf} = request.body;
    // diferença entre find e some: find retorna objeto completo, some retorna se existe ou não
    const costumer = costumers.find(costumer => costumer.cpf === cpf);
    if(!costumer){
        return response.status(400).json({error: "Customer not found!})
    };
    return response.json(costumer.statement);

})*/

//GET statement = busca extrato bancário
app.get("/statement", verifyIfExistsAccountCPF,(request, response)=>{
    //recuperando o costumer passado pelo middleware no request
    const {costumer} = request;

    return response.json(costumer.statement);
})

//GET statement = busca extrato bancário por data
app.get("/statement/date", verifyIfExistsAccountCPF,(request, response)=>{
    const {costumer} = request;
    const {date} = request.query;

    const dateFormat = new Date(date + " 00:00");

    const statement = costumer.statement.filter
         ((statement) => 
          statement.created_at.toDateString() === 
          new Date (dateFormat).toDateString()
    );

    return response.json(statement);
})

// POST deposit = cria um depósito
app.post("/deposit", verifyIfExistsAccountCPF, (request, response) =>{
    const { description, amount} = request.body;
    const {costumer} = request;

    const statementOperation = {
        description,
        amount,
        created_at: new Date(),
        type: "credit"
    }

    //Inserindo a operação de crédito no extrato do meu cliente
    costumer.statement.push(statementOperation);
    //Deu tudo certo!
    return response.status(201).send();
})

// POST withdraw = realiza um saque verificando se existe saldo suficiente
app.post("/withdraw",verifyIfExistsAccountCPF ,(request, response)=>{
    const {amount} = request.body;
    const {costumer} = request;

    const balance = getBalance(costumer.statement);

    if(balance < amount){
        return response.status(400).json({error: "Insufficient funds!"});
    }

    const statementOperation = {
        amount,
        created_at: new Date(),
        type: "debit"
    }

    costumer.statement.push(statementOperation);

    return response.status(201).send();

})


app.listen(3333);

