# API Usage

This document provides an overview of the APIs available in your codebase and explains how to use them.

## Controller Functions

### `refreshAccessToken(req, res)`

This function is used to refresh the access token for the Zoho API. It makes a POST request to the Zoho API with the client credentials and refresh token. If the access token is already generated and valid, it returns a success message. Otherwise, it generates a new access token and stores it in the MongoDB database.

### `getAccessToken(req, res)`

This function retrieves the access token from the database and returns it in the response. If the access token is expired or not found, it returns an error message.

### `getInvoicesByRiderId(req, res)`

This function retrieves invoices for a specific rider based on the rider's ID and status. It makes a GET request to the Zoho API with the rider's ID and status as query parameters. It requires the rider's ID and status to be provided in the request object as `req.user.id` and `req.status`, respectively.

### `createPaymentByInvoiceId(req, res)`

This function creates a payment for a specific invoice. It makes a POST request to the Zoho API with the payment details, including the customer ID, payment mode, amount, date, invoice number, and invoice ID. It requires these details to be provided in the request body.

### `createOrder(req, res)`

This function creates a payment order using Razorpay. It makes a POST request to the Razorpay API to create the order and a separate POST request to the Zoho API to create the payment. It requires the payment details to be provided in the request body, including the amount, currency, customer ID, payment mode, date, invoice number, and invoice ID.

### `verifyPayment(req, res)`

This function verifies the payment made through Razorpay. It compares the signature generated from the order ID and payment ID with the provided signature in the request body. If the signatures match, it returns a success message; otherwise, it returns an error message.

### `createInvoice(req, res)`

This function creates a new invoice in the Zoho API. It makes a POST request to the Zoho API with the invoice details, including the customer ID and line items. It requires the customer ID and line items to be provided in the request body.

### `createBulkInvoices(req, res)`

This function creates multiple invoices in the Zoho API. It makes a POST request to the Zoho API for each item in the request body's `SampleData` array. It requires the item details, including item name, item description, rate, quantity, and customer ID, to be provided in the request body.

### `createCustomer(req, res)`

This function creates a new customer in the Zoho API. It makes a POST request to the Zoho API with the customer details, including the customer name, email, and phone number. It requires these details to be provided in the request body.

### `createDamageInvoice(req, res)`

This function creates a damage invoice in the Zoho API. It makes a GET request to retrieve the item list from the Zoho API and then makes a POST request to create the invoice. It requires the item details and customer ID to be provided in the request body.

## Routes

### `/refreshaccesstoken` (POST)

This route is used to refresh the access token. It calls the `refreshAccessToken` function.

### `/getaccesstoken` (GET)

This route is used to retrieve the access token. It calls the `getAccessToken` function.

### `/invoices/rider/:riderId` (GET)

This route is used to retrieve invoices for a specific rider. It calls the `getInvoicesByRiderId` function.

### `/invoices/payment` (POST)

This route is used to create a payment for an invoice. It calls the `createPaymentByInvoiceId` function.

### `/orders` (POST)

This route is used to create a payment order. It calls the `createOrder` function.

### `/payments/verify` (POST)

This route is used to verify a payment made through Razorpay. It calls the `verifyPayment` function.

### `/invoices` (POST)

This route is used to create a new invoice. It calls the `createInvoice` function.

### `/invoices/bulk` (POST)

This route is used to create multiple invoices. It calls the `createBulkInvoices` function.

### `/customers` (POST)

This route is used to create a new customer. It calls the `createCustomer` function.

### `/invoices/damage` (POST)

This route is used to create a damage invoice. It calls the `createDamageInvoice` function.