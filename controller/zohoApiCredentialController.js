const { default: axios } = require('axios');
const ZohoApiCredentials = require('../model/ZohoApiCredentialModel')
const asyncHandler = require('express-async-handler');
const cron = require('node-cron');
const { logroute } = require('../logger/lgs');
const Rider = require('../model/rider');
const { get } = require('mongoose');
const { response } = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const config = {
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
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
        console.log('Access Token Generated');
        res && res.status(200).json({
            message: "Access Token Generated",
        });
    } catch (error) {
        console.log(`Error: ${error}`);
        res.status(500).json({
            error: error,
            message: 'Failed to generate access token'
        });
    }
})
// Schedule the cron job to refresh the access token every 55 minutes
cron.schedule('0 */55 * * * *', () => {
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
        res.status(500).json({
            error: error,
            message: 'Failed to get access token'
        });
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
            { headers, params }
        );
        res.status(200).json(response.data);
    } catch (error) {
        res.status(500).json({
            error: error,
            message: 'Failed to get invoices for the rider'
        });
    }
}

async function createPaymentByInvoiceId(req, res) {
    logroute(req);
    try {
        let credentials = await ZohoApiCredentials.findOne();
        const {
            customer_id,
            payment_mode,
            amount,
            date,
            invoice_no,
            invoice_id } = req.body;

        let data = JSON.stringify({
            "customer_id": customer_id,
            "payment_mode": payment_mode,
            "amount": amount,
            "date": date,
            "reference_number": invoice_no,
            "description": `Payment has been added to ${invoice_no}`,
            "invoices": [
                {
                    "invoice_id": invoice_id,
                    "amount_applied": amount
                }
            ],
            "invoice_id": invoice_id,
            "amount_applied": amount
        });

        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: `https://www.zohoapis.in/books/v3/customerpayments?${process.env.ORGANIZATION_ID}`,
            headers: {
                'content-type': 'application/json',
                'Authorization': `Zoho-oauthtoken ${credentials.accessToken}`,
            },
            data: data
        };

        const response = await axios.request(config);
        res.status(200).json(response.data);
    } catch (error) {
        res.status(500).json({
            error: error,
            message: 'Failed to make payment for the Invoice'
        });
    }
}


async function createOrder(req, res) {
    logroute(req);
    const { amount,
        currency,
        customer_id,
        payment_mode,
        date,
        invoice_no,
        invoice_id } = req.body;

    const options = {
        amount: amount * 100, // Razorpay expects amount in paise (1 INR = 100 paise)
        currency: currency,
        receipt: invoice_id, // A unique identifier for the order,
    };

    try {
        let data = JSON.stringify({
            customer_id: customer_id,
            payment_mode: payment_mode,
            amount: amount,
            date: date,
            invoice_no: invoice_no,
            invoice_id: invoice_id
        });

        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'http://localhost:5000/api/zoho/createpayment',
            headers: {
                'content-type': 'application/json',
            },
            data: data
        };

        const response = await axios.request(config);
        const order = await razorpay.orders.create(options);
        res.json({
            razorpay: order,
            zoho: response.data
        });
    } catch (error) {
        res.status(500).json({
            error: error,
            message: 'Failed to create payment order'
        });
    }
}

async function verifyPayment(req, res) {
    const { order_id, payment_id, signature } = req.body;

    const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${order_id}|${payment_id}`)
        .digest('hex');

    if (generatedSignature === signature) {

        res.json({ success: true, message: 'Payment verified successfully' });
    } else {
        res.json({ success: false, message: 'Payment verification failed' });
    }
}

async function createInvoice(req, res) {
    logroute(req)
    try {
        // Create the invoice object
        let credentials = await ZohoApiCredentials.findOne();
        let data = JSON.stringify({
            customer_id: "1314275000000044011",
            line_items: [
                {
                    name: 'Product 1',
                    description: 'Description of Product 1',
                    rate: 500,
                    quantity: 1,
                },
            ],
            payment_options: {
                payment_gateways: [
                    {
                        configured: true,
                        additional_field1: "standard",
                        gateway_name: "razorpay"
                    }
                ]
            },
            allow_partial_payments: true,
        });

        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://www.zohoapis.in/books/v3/invoices',
            headers: {
                'content-type': 'application/json',
                'Authorization': `Zoho-oauthtoken ${credentials.accessToken}`,
            },
            data: data
        };

        const response = await axios.request(config);
        const createdInvoice = response.data;

        res.status(200).json({
            message: 'Invoice created successfully',
            invoice: createdInvoice
        });
    } catch (error) {
        console.error('Error creating invoice:', error);
        res.status(500).json({
            error: error,
            message: 'Failed to create invoice'
        });
    }
}

async function createBulkInvoices(req, res) {
    logroute(req)
    try {
        // Create the invoice object
        let credentials = await ZohoApiCredentials.findOne();
        const items = req.body.SampleData;

        let invoices = [];

        for (const item of items) {
            const { 
                item_name, 
                item_desc,
                rate,
                Quantity,
                customer_id
            } = item;

            const line_items = [];

            for(const item of item_name.split(',')) {
                const line_item = {
                    name: item,
                    description: item_desc,
                    rate: rate,
                    quantity: Quantity,
                };
                line_items.push(line_item);
            }

            let data = JSON.stringify({
                customer_id: customer_id,
                line_items: line_items,
                payment_options: {
                    payment_gateways: [
                        {
                            configured: true,
                            additional_field1: "standard",
                            gateway_name: "razorpay"
                        }
                    ]
                },
                allow_partial_payments: true,
            });

            let config = {
                method: 'post',
                maxBodyLength: Infinity,
                url: 'https://www.zohoapis.in/books/v3/invoices',
                headers: {
                    'content-type': 'application/json',
                    'Authorization': `Zoho-oauthtoken ${credentials.accessToken}`,
                },
                data: data
            };
            
            const response = await axios.request(config);
            const createdInvoice = response.data;
            invoices.push(createdInvoice);
        }

        res.status(200).json({
            message: 'Invoices created successfully',
            invoices: invoices
        });
    } catch (error) {
        console.error('Error creating invoices:', error);
        res.status(500).json({
            error: error,
            message: 'Failed to creating invoices'
        });
    }
}

async function createCustomer(req, res) {
    try {
        const { customer_name,
            email,
            phone } = req.body;

        const data = JSON.stringify({
            contact_name: customer_name,
            email: email,
            phone: phone
        });

        const config = {
            method: 'post',
            url: `https://www.zohoapis.in/books/v3/contacts?organization_id=${process.env.ORGANIZATION_ID}`,
            headers: {
                'Authorization': `Zoho-oauthtoken ${credentials.accessToken}`,
                'Content-Type': 'application/json'
            },
            data: data
        };

        const response = await axios.request(config);
        const createdCustomer = response.data;

        res.status(200).json({
            message: 'Customer created successfully',
            customer: createdCustomer
        });
    } catch (error) {
        console.error('Error creating customer:', error);
        throw new Error('Failed to create customer');
    }
}

async function createDamageInvoice(req, res) {
    logroute(req);
    try {
        let credentials = await ZohoApiCredentials.findOne();
        const items = req.body.items;
        const customer_id = req.body.customer_id;

        const config = {
            method: 'get',
            url: `https://www.zohoapis.in/books/v3/items?organization_id=${process.env.ORGANIZATION_ID}`,
            headers: {
                'Authorization': `Zoho-oauthtoken ${credentials.accessToken}`,
            },
        };

        const response = await axios.request(config);
        const itemList = response.data;

        const results = [];

        for (const item of items) {
            const { name, description } = item;
            const foundItem = itemList.items.find(
                (queryItem) =>
                  queryItem.name === name && queryItem.description === description
            );
            if (foundItem) {
                results.push(foundItem);
            }
        }
        const convertedItems = results && results.map((item) => {
            const convertedItem = {
                name: item.name,
                description: item.description,
                rate: item.rate,
                quantity: 1,
            };
            return convertedItem;
        });
        let data = JSON.stringify({
            customer_id: customer_id,
            line_items: convertedItems,
            payment_options: {
                payment_gateways: [
                    {
                        configured: true,
                        additional_field1: "standard",
                        gateway_name: "razorpay"
                    }
                ]
            },
            allow_partial_payments: true,
        });

        let configIn = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://www.zohoapis.in/books/v3/invoices',
            headers: {
                'Authorization': `Zoho-oauthtoken ${credentials.accessToken}`,
                'content-type': 'application/json'
            },
            data: data
        };

        const responseIn = await axios.request(configIn);
        const createdInvoice = responseIn.data;

        res.status(200).json({
            message: 'Invoice created successfully',
            invoice: createdInvoice
        });
    } catch (error) {
        console.error('Error creating invoice:', error);
        res.status(500).json({
            message: 'Error creating invoice',
            error: error
        })
    }
}






module.exports = {
    refreshAccessToken,
    getAccessToken,
    getInvoicesByRiderId,
    createPaymentByInvoiceId,
    createOrder,
    verifyPayment,
    createInvoice,
    createCustomer,
    createDamageInvoice,
    createBulkInvoices
}