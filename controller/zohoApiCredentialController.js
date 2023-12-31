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
const { log } = require('console');

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
        let user = req.body.user;
        let status = req.body.status;
        let credentials = await ZohoApiCredentials.findOne();
        const headers = {
            Authorization: `Zoho-oauthtoken ${credentials.accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        };
        const params = {
            organization_id: `${process.env.ORGANIZATION_ID}`,
            customer_id: `${user.id}`,
            status: `${status}`
        }
        const response = await axios.get(
            `https://www.zohoapis.in/books/v3/invoices`,
            { headers, params }
        );
        res.status(200).json(response.data);
    } catch (error) {
        console.log(`Error: ${error}`);
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

async function createSingleInvoice(req, res) {
    logroute(req);
    try {
        // Create the invoice object
        let credentials = await ZohoApiCredentials.findOne();
        const {
            customer_id,
            invoice_no,
            item_name,
            item_desc,
            rate,
            quantity,
            to_email_id,
            cc_email_ids,
            day,
            month,
            year,
            branch
        } = req.body;

        let line_items = [];
        const item_name_list = item_name.split(',');
        const item_desc_list = item_desc.split(',');
        const rate_list = rate.split(',');
        const quantity_list = quantity.split(',');
        for (let i = 0; i < item_name_list.length; i++) {
            line_items.push({
                name: item_name_list[i],
                description: item_desc_list[i],
                rate: rate_list[i],
                quantity: quantity_list[i],
            });
        }

        let data = JSON.stringify({
            customer_id: customer_id,
            invoice_number: invoice_no,
            date: year + '-' + month + '-'+ day,
            line_items: line_items,
            payment_options: {
                payment_gateways: [
                    {
                        configured: true,
                    },
                ],
            },
            allow_partial_payments: false,
            custom_fields: [
                {
                    index: 1,
                    show_on_pdf: true,
                    label: 'Month',
                    value: month === '01' ? 'January' : month === '02' ? 'February' : month === '03' ? 'March' : month === '04' ? 'April' : month === '05' ? 'May' : month === '06' ? 'June' : month === '07' ? 'July' : month === '08' ? 'August' : month === '09' ? 'September' : month === '10' ? 'October' : month === '11' ? 'November' : month === '12' ? 'December' : '',
                },
                {
                    index: 2,
                    show_on_pdf: true,
                    label: 'Year',
                    value: year,
                },
            ],
            template_id: branch === 'KOL' ? '1300331000000278195' : branch === 'UP' ? '1300331000000278189' : branch === 'HY' ? '1300331000000278185' : branch === 'DL' ? '1300331000000278179' : branch === 'BLR' ? '1300331000000278173' : null,
            place_of_supply: branch === 'KOL' ? '19' : branch === 'UP' ? '09' : branch === 'HY' ? '36' : branch === 'DL' ? '07' : branch === 'BLR' ? '29' : null,
        });

        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: `https://www.zohoapis.in/books/v3/invoices`,
            headers: {
                'content-type': 'application/json',
                'Authorization': `Zoho-oauthtoken ${credentials.accessToken}`,
            },
            data: data
        };

        const response = await axios.request(config);
        const invoice = response.data.invoice;

        if(to_email_id && cc_email_ids){

            let config_sent = {
                method: 'post',
                maxBodyLength: Infinity,
                url: `https://www.zohoapis.in/books/v3/invoices/${invoice.invoice_id}/status/sent?organization_id=${process.env.ORGANIZATION_ID}`,
                headers: {
                    'Authorization': `Zoho-oauthtoken ${credentials.accessToken}`,
                }
            };
            const response_sent = await axios.request(config_sent);
            console.log(response_sent.data.message);

            let config_email = {
                method: 'get',
                maxBodyLength: Infinity,
                url: `https://www.zohoapis.in/books/v3/invoices/${invoice.invoice_id}/email?organization_id=${process.env.ORGANIZATION_ID}`,
                headers: {
                    'Authorization': `Zoho-oauthtoken ${credentials.accessToken}`,
                },
            };
            const response_email = await axios.request(config_email);
            const { body, subject } = response_email.data;

            let config_email_send = {
                method: 'post',
                maxBodyLength: Infinity,
                url: `https://www.zohoapis.in/books/v3/invoices/${invoice.invoice_id}/email?organization_id=${process.env.ORGANIZATION_ID}`,
                headers: {
                    'Authorization': `Zoho-oauthtoken ${credentials.accessToken}`,
                },
                data: {
                    "send_from_org_email_id": false,
                    "to_mail_ids": [
                        to_email_id
                    ],
                    "cc_mail_ids": cc_email_ids.split(','),
                    "subject": subject,
                    "body": body
                }
            };
            const response_email_send = await axios.request(config_email_send);
            console.log(response_email_send.data.message);
        }

        res.status(200).json({
            message: 'Invoices created successfully',
            invoices: invoice
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            error: error,
            message: 'Failed to create invoice'
        });
    }
}

async function createSingleInvoiceNew(req, res) {
    logroute(req);
    try {
        // Create the invoice object
        let credentials = await ZohoApiCredentials.findOne();
        const {
            customer_name,
            customer_email,
            customer_phone,
            bil_add,
            bil_city,
            bil_state,
            bil_zip,
            bil_country,
            ship_add,
            ship_city,
            ship_state,
            ship_zip,
            ship_country,
            gst_treatment,
            gst_no,
            suscriber_id,
            invoice_no,
            place_of_supply,
            item_name,
            item_desc,
            rate,
            quantity,
            to_email_id,
            cc_email_ids,
            day,
            month,
            year,
            branch
        } = req.body;

        let customer_data = JSON.stringify({
            contact_name: customer_name,
            email: customer_email,
            phone: customer_phone,
            billing_address: {
                address: bil_add,
                city: bil_city,
                state: bil_state,
                zip: bil_zip,
                country: bil_country,
            },
            shipping_address: {
                address: ship_add,
                city: ship_city,
                state: ship_state,
                zip: ship_zip,
                country: ship_country,
            },
            gst_treatment: gst_treatment,
            gst_no: gst_no,
            suscriber_id: suscriber_id
        });

        let config_customer = {
            method: 'post',
            maxBodyLength: Infinity,
            url: `https://www.zohoapis.in/books/v3/contacts?organization_id=${process.env.ORGANIZATION_ID}`,
            headers: {
                'content-type': 'application/json',
                'Authorization': `Zoho-oauthtoken ${credentials.accessToken}`,
            },
            data: customer_data
        };

        const response_customer = await axios.request(config_customer);
        const customer = response_customer.data.contact;

        let line_items_list = [];
        let item_name_list = item_name.split(',');
        let item_desc_list = item_desc.split(',');
        let rate_list = rate.split(',');
        let quantity_list = quantity.split(',');
        for (let i = 0; i < item_name_list.length; i++) {
            let line_item = {
                name: item_name_list[i],
                description: item_desc_list[i],
                rate: rate_list[i],
                quantity: quantity_list[i],
            };
            line_items_list.push(line_item);
        }


        let data = JSON.stringify({
            customer_id: customer.contact_id,
            invoice_number: invoice_no,
            line_items: line_items_list,
            payment_options: {
                payment_gateways: [
                    {
                        configured: true,
                    },
                ],
            },
            allow_partial_payments: false,
            place_of_supply: branch === 'KOL' ? '19' : branch === 'BLR' ? '29' : branch === 'DL' ? '07' : branch === 'UP' ? '09' : branch === 'HY' ? '36' : '',
            custom_fields: [
                {
                    index: 1,
                    show_on_pdf: true,
                    label: 'Month',
                    value: month === '01' ? 'January' : month === '02' ? 'February' : month === '03' ? 'March' : month === '04' ? 'April' : month === '05' ? 'May' : month === '06' ? 'June' : month === '07' ? 'July' : month === '08' ? 'August' : month === '09' ? 'September' : month === '10' ? 'October' : month === '11' ? 'November' : month === '12' ? 'December' : '',
                },
                {
                    index: 2,
                    show_on_pdf: true,
                    label: 'Year',
                    value: year,
                },
            ],
            date: `${year}-${month}-${day}`,
            template_id: branch === 'KOL' ? '1300331000000278195' : branch === 'UP' ? '1300331000000278189' : branch === 'HY' ? '1300331000000278185' : branch === 'DL' ? '1300331000000278179' : branch === 'BLR' ? '1300331000000278173' : null,
        });

        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: `https://www.zohoapis.in/books/v3/invoices`,
            headers: {
                'content-type': 'application/json',
                'Authorization': `Zoho-oauthtoken ${credentials.accessToken}`,
            },
            data: data
        };

        const response = await axios.request(config);
        const invoice = response.data.invoice;

        if (to_email_id && cc_email_ids) {
            let config_sent = {
                method: 'post',
                maxBodyLength: Infinity,
                url: `https://www.zohoapis.in/books/v3/invoices/${invoice.invoice_id}/status/sent?organization_id=${process.env.ORGANIZATION_ID}`,
                headers: {
                    'Authorization': `Zoho-oauthtoken ${credentials.accessToken}`,
                }
            };
            const response_sent = await axios.request(config_sent);
            console.log(response_sent.data.message);

            let config_email = {
                method: 'get',
                maxBodyLength: Infinity,
                url: `https://www.zohoapis.in/books/v3/invoices/${invoice.invoice_id}/email?organization_id=${process.env.ORGANIZATION_ID}`,
                headers: {
                    'Authorization': `Zoho-oauthtoken ${credentials.accessToken}`,
                },
            };
            const response_email = await axios.request(config_email);
            const { body, subject, customer_name } = response_email.data.data;
            let config_email_send = {
                method: 'post',
                maxBodyLength: Infinity,
                url: `https://www.zohoapis.in/books/v3/invoices/${invoice.invoice_id}/email?organization_id=${process.env.ORGANIZATION_ID}`,
                headers: {
                    'Authorization': `Zoho-oauthtoken ${credentials.accessToken}`,
                },
                data: {
                    "send_from_org_email_id": false,
                    "to_mail_ids": [
                        to_email_id
                    ],
                    "cc_mail_ids": cc_email_ids.split(','),
                    "subject": subject + ' to ' + customer_name,
                    "body": body
                }
            };
            const response_email_send = await axios.request(config_email_send);
            console.log(response_email_send.data.message);

        }

        res.status(200).json({
            message: 'Invoices created successfully',
            invoices: invoice
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            error: error,
            message: 'Failed to create invoice'
        });
    }
}

async function createInvoice(req, res) {
    logroute(req)
    try {
        // Create the invoice object
        let credentials = await ZohoApiCredentials.findOne();
        const items = JSON.parse(req.body.items);
        let createdInvoices = [];
        for (const item in items) {
            const {
                invoice_no,
                item_name,
                item_desc,
                rate,
                quantity,
                customer_id,
                to_email_id,
                cc_email_ids,
                day,
                month,
                year,
                branch,
            } = items[item];
            if (!items[item].customer_id) {
                break;
            }

            let day_ = Number(day) < 10 ? `0${day}` : `${day}`;
            let month_ = Number(month) < 10 ? `0${month}` : `${month}`;

            let line_items = [];
            const item_name_list = item_name.split(',');
            const item_desc_list = item_desc.split(',');
            const rate_list = rate.split(',');
            const quantity_list = quantity.split(',');
            for (let i = 0; i < item_name_list.length; i++) {
                line_items.push({
                    name: item_name_list[i],
                    description: item_desc_list[i],
                    rate: rate_list[i],
                    quantity: quantity_list[i],
                });
            }

            let data = JSON.stringify({
                customer_id: customer_id,
                invoice_number: invoice_no,
                date: `${year}-${month_}-${day_}`,
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
                allow_partial_payments: false,
                custom_fields: [
                    {
                        index: 1,
                        show_on_pdf: true,
                        label: 'Month',
                        value: month_ === '01' ? 'January' : month_ === '02' ? 'February' : month_ === '03' ? 'March' : month_ === '04' ? 'April' : month_ === '05' ? 'May' : month_ === '06' ? 'June' : month_ === '07' ? 'July' : month_ === '08' ? 'August' : month_ === '09' ? 'September' : month_ === '10' ? 'October' : month_ === '11' ? 'November' : month_ === '12' ? 'December' : '',
                    },
                    {
                        index: 2,
                        show_on_pdf: true,
                        label: 'Year',
                        value: year
                    },
                ],
                template_id: branch === 'KOL' ? '1300331000000278195' : branch === 'UP' ? '1300331000000278189' : branch === 'HY' ? '1300331000000278185' : branch === 'DL' ? '1300331000000278179' : branch === 'BLR' ? '1300331000000278173' : null,
                place_of_supply: branch === 'KOL' ? '19' : branch === 'UP' ? '09' : branch === 'HY' ? '36' : branch === 'DL' ? '07' : branch === 'BLR' ? '29' : null,
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
            const invoice = response.data.invoice;
            createdInvoices.push(invoice);

            if (!to_email_id && !cc_email_ids) {
                continue;
            }

            let config_sent = {
                method: 'post',
                maxBodyLength: Infinity,
                url: `https://www.zohoapis.in/books/v3/invoices/${invoice.invoice_id}/status/sent?organization_id=${process.env.ORGANIZATION_ID}`,
                headers: {
                    'Authorization': `Zoho-oauthtoken ${credentials.accessToken}`,
                }
            };
            const response_sent = await axios.request(config_sent);
            console.log(response_sent.data.message);

            let config_email = {
                method: 'get',
                maxBodyLength: Infinity,
                url: `https://www.zohoapis.in/books/v3/invoices/${invoice.invoice_id}/email?organization_id=${process.env.ORGANIZATION_ID}`,
                headers: {
                    'Authorization': `Zoho-oauthtoken ${credentials.accessToken}`,
                },
            };
            const response_email = await axios.request(config_email);
            const { body, subject } = response_email.data.data;

            let config_email_send = {
                method: 'post',
                maxBodyLength: Infinity,
                url: `https://www.zohoapis.in/books/v3/invoices/${invoice.invoice_id}/email?organization_id=${process.env.ORGANIZATION_ID}`,
                headers: {
                    'Authorization': `Zoho-oauthtoken ${credentials.accessToken}`,
                },
                data: {
                    "send_from_org_email_id": false,
                    "to_mail_ids": [
                        to_email_id
                    ],
                    "cc_mail_ids": cc_email_ids.split(','),
                    "subject": subject,
                    "body": body
                }
            };
            const response_email_send = await axios.request(config_email_send);
            console.log(response_email_send.data.message);
        }
        res.status(200).json({
            message: 'Invoice created successfully and sent to customer',
            invoice: createdInvoices
        });

    } catch (error) {
        console.error('Error creating invoice:', error.response ? error.response.data : error);
        res.status(500).json({
            error: error.response ? error.response.data : error,
            message: 'Failed to create invoice'
        });
    }
}

async function createInvoiceWithCustomers(req, res) {
    logroute(req)
    try {
        // Create the invoice object
        let credentials = await ZohoApiCredentials.findOne();
        const items = JSON.parse(req.body.items);
        let createdInvoices = [];
        for (const item in items) {
            const {
                customer_name,
                customer_email,
                customer_phone,
                bil_add,
                bil_city,
                bil_state,
                bil_zip,
                bil_country,
                ship_add,
                ship_city,
                ship_state,
                ship_zip,
                ship_country,
                gst_treatment,
                gst_no,
                suscriber_id,
                invoice_no,
                place_of_supply,
                item_name,
                item_desc,
                rate,
                quantity,
                to_email_id,
                cc_email_ids,
                day,
                month,
                year,
                branch,
                is_security_slip,
            } = items[item];
            if (!items[item].customer_name) {
                break;
            }
            let customer_data = JSON.stringify({
                contact_name: customer_name,
                email: customer_email,
                phone: customer_phone,
                billing_address: {
                    address: bil_add,
                    city: bil_city,
                    state: bil_state,
                    zip: bil_zip,
                    country: bil_country,
                },
                shipping_address: {
                    address: ship_add,
                    city: ship_city,
                    state: ship_state,
                    zip: ship_zip,
                    country: ship_country,
                },
                gst_treatment: gst_treatment,
                gst_no: gst_no,
                suscriber_id: suscriber_id
            });

            let day_ = day < 10 ? `0${day}` : `${day}`;
            let month_ = month < 10 ? `0${month}` :  `${month}`;
            console.log(month_);

            let config_customer = {
                method: 'post',
                maxBodyLength: Infinity,
                url: `https://www.zohoapis.in/books/v3/contacts?organization_id=${process.env.ORGANIZATION_ID}`,
                headers: {
                    'content-type': 'application/json',
                    'Authorization': `Zoho-oauthtoken ${credentials.accessToken}`,
                },
                data: customer_data
            };

            const response_customer = await axios.request(config_customer);
            const customer = response_customer.data.contact;

            let data = JSON.stringify({
                customer_id: customer.contact_id,
                invoice_number: invoice_no,
                date: `${year}-${month_}-${day_}`,
                line_items: [
                    {
                        name: item_name,
                        description: item_desc,
                        rate: rate,
                        quantity: quantity,
                    },
                ],
                payment_options: {
                    payment_gateways: [
                        {
                            configured: true,
                        },
                    ],
                },
                allow_partial_payments: false,
                place_of_supply: branch === 'KOL' ? '19' : branch === 'UP' ? '09' : branch === 'HY' ? '36' : branch === 'DL' ? '07' : branch === 'BLR' ? '29' : null,
                template_id: branch === 'KOL' ? '1300331000000278195' : branch === 'UP' ? '1300331000000278189' : branch === 'HY' ? '1300331000000278185' : branch === 'DL' ? '1300331000000278179' : branch === 'BLR' ? '1300331000000278173' : null,
                custom_fields: [
                    {
                        index: 1,
                        show_on_pdf: true,
                        label: 'Month',
                        value: month_ === '01' ? 'January' : month_ === '02' ? 'February' : month_ === '03' ? 'March' : month_ === '04' ? 'April' : month_ === '05' ? 'May' : month_ === '06' ? 'June' : month_ === '07' ? 'July' : month_ === '08' ? 'August' : month_ === '09' ? 'September' : month_ === '10' ? 'October' : month_ === '11' ? 'November' : month_ === '12' ? 'December' : null,
                    },
                    {
                        index: 2,
                        show_on_pdf: true,
                        label: 'Year',
                        value: year,
                    },
                ]
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
            const invoice = response.data.invoice;
            createdInvoices.push(invoice);

            if (!to_email_id && !cc_email_ids) {
                continue;
            }

            let config_sent = {
                method: 'post',
                maxBodyLength: Infinity,
                url: `https://www.zohoapis.in/books/v3/invoices/${invoice.invoice_id}/status/sent?organization_id=${process.env.ORGANIZATION_ID}`,
                headers: {
                    'Authorization': `Zoho-oauthtoken ${credentials.accessToken}`,
                }
            };
            const response_sent = await axios.request(config_sent);
            console.log(response_sent.data.message);

            let config_email = {
                method: 'get',
                maxBodyLength: Infinity,
                url: `https://www.zohoapis.in/books/v3/invoices/${invoice.invoice_id}/email?organization_id=${process.env.ORGANIZATION_ID}`,
                headers: {
                    'Authorization': `Zoho-oauthtoken ${credentials.accessToken}`,
                },
            };
            const response_email = await axios.request(config_email);
            const { body, subject } = response_email.data.data;

            let config_email_send = {
                method: 'post',
                maxBodyLength: Infinity,
                url: `https://www.zohoapis.in/books/v3/invoices/${invoice.invoice_id}/email?organization_id=${process.env.ORGANIZATION_ID}`,
                headers: {
                    'Authorization': `Zoho-oauthtoken ${credentials.accessToken}`,
                },
                data: {
                    "send_from_org_email_id": false,
                    "to_mail_ids": [
                        to_email_id
                    ],
                    "cc_mail_ids": cc_email_ids.split(','),
                    "subject": subject + ' to '+ customer_name,
                    "body": body
                }
            };
            const response_email_send = await axios.request(config_email_send);
            console.log(response_email_send.data.message);
        }
        res.status(200).json({
            message: 'Invoice created successfully and sent to customer',
            invoice: createdInvoices
        });

    } catch (error) {
        console.error('Error creating invoice:', error);
        res.status(500).json({
            error: error.response.data ? error.response.data : error,
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
                quantity,
                customer_id,
                contact_ids
            } = item;



            let data = JSON.stringify({
                customer_id: customer_id,
                line_items: {
                    name: item_name,
                    description: item_desc,
                    rate: rate,
                    quantity: quantity,
                },
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
            const invoice = response.data.invoice;

            let config_sent = {
                method: 'post',
                maxBodyLength: Infinity,
                url: `https://www.zohoapis.in/books/v3/invoices/${invoice.invoice_id}/status/sent?organization_id=${process.env.ORGANIZATION_ID}`,
                headers: {
                    'Authorization': `Zoho-oauthtoken ${credentials.accessToken}`,
                }
            };

            const response_sent = await axios.request(config_sent);
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
        let credentials = await ZohoApiCredentials.findOne();
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
    createSingleInvoice,
    createSingleInvoiceNew,
    createInvoice,
    createCustomer,
    createInvoiceWithCustomers,
    createDamageInvoice,
    createBulkInvoices
}