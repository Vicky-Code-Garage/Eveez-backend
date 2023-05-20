const { default: axios } = require('axios');
const ZohoApiCredentials = require('../model/ZohoApiCredentialModel')
const asyncHandler = require('express-async-handler');
const cron = require('node-cron');
const { logroute } = require('../logger/lgs');
const Rider = require('../model/rider');

const config = {
    clientId: '1000.7TCQSN7RJ40147QHNIC13HK1MVVITZ',
    clientSecret: '7a2d9838f58a4edb2c75b185311dcab2b282245c21',
    refreshToken: '1000.d2f15885e1ebee4365715213e29cd27e.4461b178ee8ed95f0e58785b5c5b84a3',
    baseUrl: 'https://accounts.zoho.in',
};

const refreshAccessToken = asyncHandler(async (req, res) => {
    req && logroute(req);
    try {
        const existingCredentials = await ZohoApiCredentials.findOne();
        if (existingCredentials && existingCredentials.accessToken && existingCredentials.expires_in > Date.now()) {
            res && res.status(200).json({
                message: "Access Token Already Generated and Valid",
            });
            return;
        }
        const response = await axios.post(
            `${config.baseUrl}/oauth/v2/token`,
            null,
            {
                params: {
                    client_id: config.clientId,
                    client_secret: config.clientSecret,
                    refresh_token: config.refreshToken,
                    grant_type: 'refresh_token',
                },
            }
        );
        // Store the credentials in the MongoDB database
        if (existingCredentials) {
            existingCredentials.accessToken = response.data.access_token;
            await existingCredentials.save();
        } else {
            const newCredentials = new ZohoApiCredentials({
                clientId: config.clientId,
                clientSecret: config.clientSecret,
                refreshToken: config.refreshToken,
                accessToken: response.data.access_token,
                grantType: 'refresh_token',
                expires_in: Date.now() + response.data.expires_in * 1000,
            });
            await newCredentials.save();
        }
        res && res.status(200).json({
            message: "Access Token Generated",
        });
    } catch (error) {
        console.log(`Error: ${error}`);
    }
})
// Schedule the cron job to refresh the access token every 55 minutes
cron.schedule('0 */55 * * * *',()=>{
    refreshAccessToken(
        req = null,
        res = null
    );
}
);

const getAccessToken = asyncHandler(async (req, res) => {
    logroute(req);
    try {
        const existingCredentials = await ZohoApiCredentials.findOne();
        if (existingCredentials && existingCredentials.accessToken && existingCredentials.expires_in > Date.now()) {
            res.status(200).json({
                message: "Success",
                accessToken: existingCredentials.accessToken
            });
            return;
        } else {
            res.status(500).json({
                message: "Something went wrong!",
            });
            return;
        }
    } catch {
        res.status(500).send(`Error: ${error}`);
    }
})

async function getInvoicesByRiderId(req, res) {
    /*
        req : {
            user: {
                id: 'rider_id'
            },
            status: 'paid | overdue | sent | unpaid' 
        }
    */
    logroute(req);
    try {
        let id = req.user.id;
        let status = req.status;
        let rider = await Rider.findById(id);
        let credentials = await ZohoApiCredentials.findOne();
        const headers = {
            Authorization: `Zoho-oauthtoken ${credentials.accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        };
        const params = {
            organization_id: '60021321831',
            customer_id: `${rider.zoho_id}`,
            status: `${status}`
        }
        const response = await axios.get(
            `https://www.zohoapis.in/books/v3/invoices`,
            {headers, params}
        );
        res.status(200).json(response.data);
    }catch(error){  
        res.status(500).send(`Error: ${error}`);
    }
}



module.exports = {
    refreshAccessToken,
    getAccessToken,
    getInvoicesByRiderId
}