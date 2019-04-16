//Modules
const express = require('express'),
    bunyan = require('bunyan'),
    bodyParser = require('body-parser'),
    fetch = require("node-fetch");

//Load values from .env file
require('dotenv').config();

const app = express();
const log = bunyan.createLogger({ name: 'Authorization Code Flow' });

app.use(express.static('public'));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.render('index');
});

//Set 1: Ask the authorization code
app.get('/get/the/code', (req, res) => {


    const Authorization_Endpoint = `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/authorize`;
    const Response_Type = 'code';
    const Client_Id = process.env.CLIENT_ID;
    const Redirect_Uri = 'http://localhost:8000/give/me/the/code';
    const Scope = 'https://graph.microsoft.com/User.Read';
    const State = 'ThisIsMyStateValue';

    let url = `${Authorization_Endpoint}?response_type=${Response_Type}&client_id=${Client_Id}&redirect_uri=${Redirect_Uri}&scope=${Scope}&state=${State}`;

    log.info(url);

    res.redirect(url);

});

//Step 2: Get the code from the URL
app.get('/give/me/the/code', (req, res) => {
    res.render('exchange-code', { code: req.query.code, state: req.query.state });
});

//Step 3: Exchange the code for a token
app.post('/exchange/the/code/for/a/token', (req, res) => {

    const Token_Endpoint = `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`;
    const Grant_Type = 'authorization_code';
    const Code = req.body.code;
    const Redirect_Uri = 'http://localhost:8000/give/me/the/code';
    const Client_Id = process.env.CLIENT_ID;
    const Client_Secret = process.env.CLIENT_SECRET;
    const Scope = 'https://graph.microsoft.com/User.Read';

    let body = `grant_type=${Grant_Type}&code=${Code}&redirect_uri=${encodeURIComponent(Redirect_Uri)}&client_id=${Client_Id}&client_secret=${Client_Secret}&scope=${encodeURIComponent(Scope)}`;

    log.info(`Body: ${body}`);

    fetch(Token_Endpoint, {
        method: 'POST',
        body: body,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(async response => {

        let json = await response.json();
        res.render('access-token', { token: JSON.stringify(json, undefined, 2) }); //you shouldn't share the access token with the client-side

    }).catch(error => {
        log.error(error.message);
    });
});

//Step 4: Call the protected API
app.post('/call/ms/graph', (req, res) => {

    let access_token = JSON.parse(req.body.token).access_token;

    const Microsoft_Graph_Endpoint = 'https://graph.microsoft.com/beta';
    const Acction_That_I_Have_Access_Because_Of_My_Scope = '/me';

    //Call Microsoft Graph with your access token
    fetch(`${Microsoft_Graph_Endpoint}${Acction_That_I_Have_Access_Because_Of_My_Scope}`, {
        headers: {
            'Authorization': `Bearer ${access_token}`
        }
    }).then(async response => {

        let json = await response.json();
        res.render('calling-ms-graph', { response: JSON.stringify(json, undefined, 2) });
    });
});

app.listen(8000);