'use strict';

const functions = require('firebase-functions');
const { WebhookClient, Payload } = require('dialogflow-fulfillment');
const admin = require('firebase-admin');
const { UpdatePermission } = require('actions-on-google');
admin.initializeApp();
const db = admin.firestore();

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
    const agent = new WebhookClient({ request, response });
    let x = JSON.stringify(request.body);
    let userId = request.body.originalDetectIntentRequest.payload.data.source.userId; //get userId from payload chat

    function getNameHandler(agent) { //test function
        let name = request.body.queryResult.parameters.name || agent.context.get('awaiting_name').parameters.name;

        db.collection("names").add({ name: name });
        //db.collection("product").add({ name: "test get name" });
        agent.add(JSON.stringify(request.body.queryResult.parameters));
        agent.add(`Thank you, ${name} (from Linline Editor)`);
    }

    function addCartHandler(agent) {
        console.log('add cart handler');
        let sku = request.body.queryResult.parameters.sku; //get sku from user chat
        let productsTemp = [];
        let productTemp = {};
        let quantity = 0;
        agent.add(JSON.stringify(request.body.queryResult.parameters)); //test chat
        agent.add(`Thank you, ${sku} (from inline Editor)`);
        return admin.firestore().collection('products').where('sku', '==', sku).get().then(productDocuments => {
            //get product from collection by sku
            console.log('products get from sku');
            agent.add('products get from sku'); //test chat
            if (productDocuments.empty) { //check that have product(products have sku from chat)
                //if dont have product
                agent.add('sku error');
            } else {
                //if have product
                productDocuments.forEach(productDocument => {
                    agent.add('sku checked'); //test chat
                    //agent.add(JSON.stringify(doc.ref._path.segments[1]));
                    agent.add(JSON.stringify(productDocument.data())); //test chat
                    quantity = productDocument.data().quantity //quantity of product in products collection
                    if (quantity <= 0) { //check that product quantity > 0
                        //product out of stock
                        agent.add('quantity = 0 cant not add cart');
                    }
                    //save data of product to temp for change total price in cart
                    productTemp = { //product temp that user choose 
                        sku: productDocument.data().sku,
                        quantity: 1,
                        title: productDocument.data().title,
                        price: productDocument.data().price,
                        picture: productDocument.data().picture
                    };
                    // products.push(product); //for what ???
                });
                admin.firestore().collection('carts').where('userId', '==', userId).get().then(cartDocuments => {
                    //get user cart from collection by userId
                    console.log('firestore cart get');
                    if (quantity > 0) { //check that have product in stock
                        if (cartDocuments.empty) { //check that user have cart?
                            //user dont have cart
                            productsTemp.push(productTemp); //add product that user choose to cart(products)
                            console.log('this userId dont have in carts');
                            agent.add('this userId dont have in carts');
                            db.collection("carts").add({ totalPrice: productTemp.price, totalQuantity: 1, userId: userId, products: productsTemp });
                            //create new cart
                            console.log('adding cart');
                        } else {
                            //user has had cart already
                            console.log('this userId is in carts already');
                            cartDocuments.forEach(cartDocument => {
                                productsTemp = cartDocument.data().products;
                                if (productsTemp.find(item => item.sku == sku)) { //check that user cart have product
                                    //if cart have product already 
                                    productsTemp[productsTemp.findIndex(item => item.sku == sku)].quantity++; //increase product quantity 
                                }
                                else {
                                    //if cart dont have product yet
                                    productsTemp.push(productTemp); //add new product to user cart
                                }
                                console.log('print docs of carts:' + cartDocument.data().userId);
                                console.log('doc number of carts:' + cartDocument.ref._path.segments[1]);
                                admin.firestore()
                                    .collection('carts')
                                    .doc(cartDocument.ref._path.segments[1]) //doc.ref._path.segments[1] is document id of user cart
                                    .update({
                                        userId: cartDocument.data().userId,
                                        totalPrice: cartDocument.data().totalPrice + productTemp.price,
                                        totalQuantity: cartDocument.data().totalQuantity + 1,
                                        products: productsTemp//doc.data().products
                                    })
                                    .then(() => {
                                        console.log('cart updated');
                                    });
                                //update user cart
                            });
                        }
                    }
                });
            }
        });
    }

    function getProductByCategoryHandler(agent) { //get products from category
        let type = request.body.queryResult.parameters.type; // get category from user chat
        agent.add(`Thank you, ${type} (from inline Editor test4)`); //test chat
        db.collection("product").add({ name: "test read fullfill get shirt" });
        return admin.firestore().collection('products').where('type', '==', type).get().then(productDocuments => {
            //get products from collection by category(type)
            if (productDocuments.empty) {
                //if dont have type in db
                agent.add('dont have this type');
            } else {
                //if have type
                let productContents = [];
                productDocuments.forEach(productDocument => {
                    if (productDocument.data().quantity > 0) { //check product that quantity > 0
                        //if product have quantity > 0
                        //push data to contents to create card
                        productContents.push({
                            hero: {
                                size: "full",
                                type: "image",
                                url: productDocument.data().picture
                            },
                            body: {
                                type: "box",
                                layout: "vertical",
                                contents: [
                                    {
                                        type: "text",
                                        text: productDocument.data().title,
                                        wrap: true
                                    }
                                ]
                            },
                            footer: {
                                type: "box",
                                layout: "horizontal",
                                contents: [
                                    {
                                        type: "button",
                                        style: "primary",
                                        action: {
                                            type: "message",
                                            label: "add to cart",
                                            text: "addcart " + productDocument.data().sku
                                        }
                                    }
                                ]
                            },
                            type: "bubble"
                        });
                    }
                    agent.add('type:' + productDocument.data().type + '\nname:' + productDocument.data().title + '\nsku:' + productDocument.data().sku); //test chat
                });
                const payloadJson = {
                    altText: "this is a flex message",
                    type: "flex",
                    contents:
                    {
                        type: "carousel",
                        contents: productContents
                    }
                };
                let payload = new Payload(`LINE`, payloadJson, { sendAsMessage: true });
                agent.add(payload);
            }
        });
    }

    function myCartHandler(agent) {
        return admin.firestore().collection('carts').where('userId', '==', userId).get().then(cartDocuments => {
            //get user cart from collection by userId
            if (cartDocuments.empty) {
                //if dont have cart
                agent.add('u dont have cart');
            } else {
                //if have cart
                let productContents = []; //create array for collect products of cart
                cartDocuments.forEach(cartDocument => {
                    agent.add('total price:' + cartDocument.data().totalPrice + '\ntotal quantity:' + cartDocument.data().totalQuantity); //test chat
                    cartDocument.data().products.forEach(product => {
                        //push data to contents to create card
                        productContents.push({
                            hero: {
                                size: "full",
                                type: "image",
                                url: product.picture
                            },
                            body: {
                                type: "box",
                                layout: "vertical",
                                contents: [
                                    {
                                        type: "text",
                                        text: product.title,
                                        wrap: true
                                    },
                                    {
                                        type: "text",
                                        text: "quantity : " + product.quantity.toString(),
                                        wrap: true
                                    }
                                ]
                            },
                            footer: {
                                type: "box",
                                layout: "horizontal",
                                contents: [
                                    {
                                        type: "button",
                                        style: "primary",
                                        action: {
                                            type: "message",
                                            label: "remove item 1",
                                            text: "removeitem " + product.sku
                                        }
                                    }
                                ]
                            },
                            type: "bubble"
                        });
                    });
                });
                const payloadJson = {
                    altText: "this is a flex message",
                    type: "flex",
                    contents:
                    {
                        type: "carousel",
                        contents: productContents
                    }
                };
                let payload = new Payload(`LINE`, payloadJson, { sendAsMessage: true });
                agent.add(payload);
            }
        });
    }

    function cancelCartHandler(agent) {
        return admin.firestore().collection('carts').where('userId', '==', userId).get().then(cartDocuments => {
            //get user cart from collection by userId
            if (cartDocuments.empty) {
                //if dont have cart
                agent.add('u dont have cart');
            } else {
                //if have cart
                cartDocuments.forEach(cartDocument => {
                    agent.add('total price:' + cartDocument.data().totalPrice + '\ntotal quantity:' + cartDocument.data().totalQuantity); //test chat
                    admin.firestore().collection('carts').doc(cartDocument.ref._path.segments[1]).delete().then(() => {
                        agent.add('cancel cart complete');
                    });
                    //delete document(user cart)
                });
            }
        });
    }

    function removeItemHandler(agent) {
        console.log('remove item handler');
        let sku = request.body.queryResult.parameters.sku;
        let productsTemp = [];
        let productTemp = {};
        agent.add(JSON.stringify(request.body.queryResult.parameters));
        agent.add(`remove item test  ${sku} (from inline Editor)`);

        return admin.firestore().collection('products').where('sku', '==', sku).get().then(productDocuments => { 
            //get product from products collection by sku
            console.log('check products from sku');
            agent.add('check products from sku');
            if (productDocuments.empty) {
                //if dont have sku in products collection
                agent.add('sku error');
            } else {
                //if have sku in products collection
                productDocuments.forEach(productDocument => {
                    //save data of product to temp for change total price in cart
                    agent.add('sku checked');
                    agent.add(JSON.stringify(productDocument.data()));
                    productTemp = {
                        sku: productDocument.data().sku,
                        quantity: 1,
                        title: productDocument.data().title,
                        price: productDocument.data().price,
                        picture: productDocument.data().picture
                    };
                });
                agent.add('sku checked');
                admin.firestore().collection('carts').where('userId', '==', userId).get().then(cartDocuments => {
                    //get cart of user for change data
                    console.log('firestore cart get');
                    if (cartDocuments.empty) {
                        //if user dont have cart
                        productsTemp.push(productTemp); //for what ??
                        console.log('this userId dont have in carts');
                        agent.add('this userId dont have in carts');
                    } else {
                        //if user have cart
                        console.log('this userId is in carts already');
                        cartDocuments.forEach(cartDocument => {
                            productsTemp = cartDocument.data().products; //get products from user cart
                            if (productsTemp.find(item => item.sku == sku)) { //check products that user want to remove by sku
                                if (productsTemp[productsTemp.findIndex(item => item.sku == sku)].quantity > 1) { //check product that user want to remove >1
                                    //if product that user want to remove >1 -> decrease quantity of product
                                    productsTemp[productsTemp.findIndex(item => item.sku == sku)].quantity--; 
                                    agent.add('decrease quantity');
                                    //decrease quantity of product that user want to remove
                                }
                                else {
                                    //if product that user want to remove <=1 -> remove product from cart
                                    //remove sku in cart == 1
                                    productsTemp = productsTemp.filter((item) => item.sku != sku)
                                }
                                if (productsTemp.length >= 1) { //check that user cart have products
                                    //if user cart have products
                                    admin.firestore()
                                        .collection('carts')
                                        .doc(cartDocument.ref._path.segments[1])
                                        .update({
                                            userId: cartDocument.data().userId,
                                            totalPrice: cartDocument.data().totalPrice - productTemp.price,
                                            totalQuantity: cartDocument.data().totalQuantity - 1,
                                            products: productsTemp//doc.data().products
                                        })
                                        .then(() => {
                                            console.log('cart updated');
                                        });
                                    //update user cart(products, total price, total quantity)
                                } else {
                                    //if user cart dont have product
                                    admin.firestore().collection('carts').doc(cartDocument.ref._path.segments[1]).delete().then(() => {
                                        agent.add('remove item complete');
                                    });
                                    //remove user cart from collection
                                }
                            }
                            else {
                                //dont have sku that user want to remove in cart -> do not thing
                                console.log('dont have this sku in cart');
                                agent.add('dont have this sku in cart');
                            }
                        });
                    }
                });
            }
        });
    }

    function paymentHandler(agent) {
        let paymentContents = [];
        paymentContents.push({
                hero: {
                    size: "full",
                    type: "image",
                    url: "https://i.pinimg.com/originals/fe/7f/4b/fe7f4b418e2778863247a7dcc6aed421.png"
                },
                // body: {
                //     type: "box",
                //     layout: "vertical",
                //     contents: [
                //         {
                //             type: "text",
                //             text: product.title,
                //             wrap: true
                //         },
                //         {
                //             type: "text",
                //             text: "quantity : " + product.quantity.toString(),
                //             wrap: true
                //         }
                //     ]
                // },
                footer: {
                    type: "box",
                    layout: "horizontal",
                    contents: [
                        {
                            type: "button",
                            style: "primary",
                            action: {
                                type: "uri",
                                label: "payment",
                                uri: "https://liff.line.me/1656343498-3BwbWNpV"
                            }
                        }
                    ]
                },
                type: "bubble"
            });
        const payloadJson = {
            altText: "this is a flex message",
            type: "flex",
            contents:
            {
                type: "carousel",
                contents: paymentContents
            }
        };
        let payload = new Payload(`LINE`, payloadJson, { sendAsMessage: true });
        agent.add(payload);
    }

    let intentMap = new Map();
    intentMap.set('Get Name', getNameHandler);
    intentMap.set('Get Shirt', getProductByCategoryHandler);
    intentMap.set('Add CartTest', addCartHandler);
    intentMap.set('My Cart', myCartHandler);
    intentMap.set('Cancel Cart', cancelCartHandler);
    intentMap.set('Remove Item', removeItemHandler);
    intentMap.set('Payment', paymentHandler);
    //intentMap.set('Confirm Name Yes', getNameHandler);
    agent.handleRequest(intentMap);
});