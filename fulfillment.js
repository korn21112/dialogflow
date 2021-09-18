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
    let userId = request.body.originalDetectIntentRequest.payload.data.source.userId;

    function getNameHandler(agent) {
        let name = request.body.queryResult.parameters.name || agent.context.get('awaiting_name').parameters.name;

        db.collection("names").add({ name: name });
        //db.collection("product").add({ name: "test get name" });
        agent.add(JSON.stringify(request.body.queryResult.parameters));
        agent.add(`Thank you, ${name} (from Linline Editor)`);
    }

    function addCartHandler(agent) {
        console.log('add cart handler');
        let sku = request.body.queryResult.parameters.sku;
        let isCart = 'false';
        let products = [];
        let product = {};
        agent.add(JSON.stringify(request.body.queryResult.parameters));
        agent.add(`Thank you, ${sku} (from inline Editor)`);
        // db.collection("carts").add({ totalPrice: 1000, totalQuantity: 2 ,userId :userId});
        // agent.add(`add cart (from Linline Editor)`);
        // agent.add(userId);
        // admin.firestore().collection('carts').where('userId', '==', userId).get().then(doc => {
        //     console.log('firestore cart get');
        //     if (doc.empty) {
        //         agent.add('this userId dont have in carts');
        //     } else {
        //         doc.forEach(doc => {
        //             console.log('print docs of carts');
        //             agent.add('docs of carts');
        //             agent.add(JSON.stringify(doc));
        //             isCart = 'true';
        //         });
        //     }
        // });
        //////////////////////////////
        return admin.firestore().collection('products').where('sku', '==', sku).get().then(doc => {
            console.log('products get from sku');
            agent.add('products get from sku');
            // agent.add(doc.data().userId);
            // agent.add(userId);
            if (doc.empty) {
                agent.add('sku error');
                agent.add(isCart);
            } else {
                doc.forEach(doc => {
                    agent.add('sku checked');
                    //agent.add(JSON.stringify(doc.ref._path.segments[1]));
                    agent.add(JSON.stringify(doc.data()));
                    product = {
                        sku: doc.data().sku,
                        quantity: 1,
                        title: doc.data().title,
                        price: doc.data().price,
                        picture: doc.data().picture
                    };

                    // products.push(product);
                });
                admin.firestore().collection('carts').where('userId', '==', userId).get().then(doc => {
                    console.log('firestore cart get');
                    if (doc.empty) {
                        products.push(product);
                        console.log('this userId dont have in carts');
                        agent.add('this userId dont have in carts');
                        db.collection("carts").add({ totalPrice: product.price, totalQuantity: 1, userId: userId, products: products });
                        console.log('adding cart');
                    } else {
                        console.log('this userId is in carts already');
                        // products=doc.data().products;
                        //products.push(product);
                        //products.push(product);
                        doc.forEach(doc => {
                            products = doc.data().products;
                            if (products.find(item => item.sku == sku)) {
                                products[products.findIndex(item => item.sku == sku)].quantity++;
                            }
                            else {
                                products.push(product);
                            }
                            //
                            console.log('print docs of carts:' + doc.data().userId);
                            console.log('doc number of carts:' + doc.ref._path.segments[1]);
                            admin.firestore()
                                .collection('carts')
                                .doc(doc.ref._path.segments[1])
                                .update({
                                    userId: doc.data().userId,
                                    totalPrice: doc.data().totalPrice + product.price,
                                    totalQuantity: doc.data().totalQuantity + 1,
                                    products: products//doc.data().products
                                })
                                .then(() => {
                                    console.log('cart updated');
                                });
                            // agent.add('docs of carts');
                            // agent.add(JSON.stringify(doc));
                            // isCart = 'true';
                        });
                    }
                });
                // agent.add(isCart);
                // if (isCart == 'false') {//if dont have cart of this userId
                //     db.collection("carts").add({ totalPrice: 1000, totalQuantity: 2 ,userId :userId, products:products});
                //     agent.add('isCarts is false -> add cart to firestore');
                // } else {
                //     agent.add('isCarts is true');
                // }
            }

        });
    }

    function getShirtHandler(agent) {
        let type = request.body.queryResult.parameters.type;
        agent.add(`Thank you, ${type} (from inline Editor test4)`);
        const payloadJson = {
            altText: "this is a carousel template",
            type: "template",
            template: {
                columns: [
                    {
                        actions: [
                            {
                                label: "choose",
                                text: "#shirt",
                                type: "message"
                            }
                        ],
                        thumbnailImageUrl: "https://i.pinimg.com/originals/f3/83/0d/f3830d577e2701aa29347b49acfd5a28.jpg",
                        text: "...",
                        title: "Shirt"
                    },
                    {
                        actions: [
                            {
                                label: "choose",
                                text: "#pants",
                                type: "message"
                            }
                        ],
                        thumbnailImageUrl: "https://www.lundhags.com/globalassets/inriver/resources/1116001-900_computedimageurl.jpg?width=1000&height=1000&quality=80&f.sharpen=20",
                        title: "Pants",
                        text: "..."
                    },
                    {
                        title: "shoses",
                        text: "...",
                        thumbnailImageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQK9F78tBTQalv0gZc-Rve9GEBPnUMVpwQTwg&usqp=CAU",
                        actions: [
                            {
                                label: "choose",
                                type: "message",
                                text: "#shoses"
                            }
                        ]
                    }
                ],
                type: "carousel"
            }
        };

        let payload = new Payload(`LINE`, payloadJson, { sendAsMessage: true });

        db.collection("product").add({ name: "test read fullfill get shirt" });
        //return admin.firestore().collection('products').doc('BrJqtQVHd5ywewhNUIda').get().then(doc => {
        return admin.firestore().collection('products').where('type', '==', type).get().then(doc => {
            //agent.add(payload);
            let col = [];
            if (doc.empty) {
                agent.add('dont have this type');
            } else {
                // doc.forEach(doc => {
                //     col.push({
                //         actions: [
                //             {
                //                 label: "add to cart",
                //                 text: "addcart " + doc.data().sku,
                //                 type: "message"
                //             }
                //         ],
                //         thumbnailImageUrl: doc.data().picture,
                //         text: "...",
                //         title: doc.data().title
                //     });
                //     agent.add('type:' + doc.data().type + '\nname:' + doc.data().title + '\nsku:' + doc.data().sku);
                // });
                // const payloadJson = {
                //     altText: "this is a carousel template",
                //     type: "template",
                //     template: {
                //         columns: col,
                //         type: "carousel"
                //     }
                // };

                let contents = [];
                doc.forEach(doc => {
                        contents.push({
                            hero: {
                                size: "full",
                                type: "image",
                                url: doc.data().picture
                            },
                            body: {
                                type: "box",
                                layout: "vertical",
                                contents: [
                                    {
                                        type: "text",
                                        text: doc.data().title,
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
                                            text: "addcart " + doc.data().sku
                                        }
                                    }
                                ]
                            },
                            type: "bubble"
                        });
                    agent.add('type:' + doc.data().type + '\nname:' + doc.data().title + '\nsku:' + doc.data().sku);
                });
                const payloadJson = {
                    altText: "this is a flex message",
                    type: "flex",
                    contents:
                    {
                        type: "carousel",
                        contents: contents
                    }
                };
                let payload = new Payload(`LINE`, payloadJson, { sendAsMessage: true });
                agent.add(payload);
            }
        });
    }

    function myCartHandler(agent) {

        db.collection("product").add({ name: "test read fullfill get shirt" });
        return admin.firestore().collection('carts').where('userId', '==', userId).get().then(doc => {
            if (doc.empty) {
                agent.add('u dont have cart');
            } else {
                let contents = [];
                doc.forEach(doc => {
                    agent.add('total price:' + doc.data().totalPrice + '\ntotal quantity:' + doc.data().totalQuantity);
                    doc.data().products.forEach(doc => {
                        contents.push({
                            hero: {
                                size: "full",
                                type: "image",
                                url: doc.picture
                            },
                            body: {
                                type: "box",
                                layout: "vertical",
                                contents: [
                                    {
                                        type: "text",
                                        text: doc.title,
                                        wrap: true
                                    },
                                    {
                                        type: "text",
                                        text: "quantity : "+doc.quantity.toString(),
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
                                            text: "removeitem "+doc.sku
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
                        contents: contents
                    }
                };
                let payload = new Payload(`LINE`, payloadJson, { sendAsMessage: true });
                agent.add(payload);
            }
        });
    }

    function cancelCartHandler(agent) {
        return admin.firestore().collection('carts').where('userId', '==', userId).get().then(doc => {
            if (doc.empty) {
                agent.add('u dont have cart');
            } else {
                doc.forEach(doc => {
                    agent.add('total price:' + doc.data().totalPrice + '\ntotal quantity:' + doc.data().totalQuantity);
                    admin.firestore().collection('carts').doc(doc.ref._path.segments[1]).delete().then(() => {
                        agent.add('cancel cart complete');
                    });
                });
            }
        });
    }

    function removeItemHandler(agent) {
        console.log('remove item handler');
        let sku = request.body.queryResult.parameters.sku;
        let isCart = 'false';
        let products = [];
        let product = {};
        let totalQuantityReduce = 0;
        let totalPriceReduce = 0;
        agent.add(JSON.stringify(request.body.queryResult.parameters));
        agent.add(`remove item test  ${sku} (from inline Editor)`);

        return admin.firestore().collection('products').where('sku', '==', sku).get().then(doc => {
            console.log('check products from sku');
            agent.add('check products from sku');
            // agent.add(doc.data().userId);
            // agent.add(userId);
            if (doc.empty) {
                agent.add('sku error');
                agent.add(isCart);
            } else {
                doc.forEach(doc => {
                    agent.add('sku checked');
                    //agent.add(JSON.stringify(doc.ref._path.segments[1]));
                    agent.add(JSON.stringify(doc.data()));
                    product = {
                        sku: doc.data().sku,
                        quantity: 1,
                        title: doc.data().title,
                        price: doc.data().price,
                        picture: doc.data().picture
                    };

                    // products.push(product);
                });

                agent.add('sku checked');
                admin.firestore().collection('carts').where('userId', '==', userId).get().then(doc => {
                    console.log('firestore cart get');
                    if (doc.empty) {
                        products.push(product);
                        console.log('this userId dont have in carts');
                        agent.add('this userId dont have in carts');
                        // db.collection("carts").add({ totalPrice: product.price, totalQuantity: 1, userId: userId, products: products });
                        // console.log('adding cart');
                    } else {
                        console.log('this userId is in carts already');
                        // products=doc.data().products;
                        //products.push(product);
                        //products.push(product);
                        doc.forEach(doc => {
                            products = doc.data().products; //get product from cart
                            if (products.find(item => item.sku == sku)) {
                                //have sku in cart -> remove item
                                // products[products.findIndex(item => item.sku == sku)].quantity++;
                                if (products[products.findIndex(item => item.sku == sku)].quantity > 1) {
                                    products[products.findIndex(item => item.sku == sku)].quantity--;
                                    agent.add('decrease quantity');
                                    //decrease quantity
                                }
                                else {
                                    //remove sku in cart == 1
                                    products = products.filter((item) => item.sku != sku)
                                }
                                // totalQuantityReduce = 1;
                                // totalPriceReduce = product.price;
                                if (products.length >= 1) {
                                    admin.firestore()
                                        .collection('carts')
                                        .doc(doc.ref._path.segments[1])
                                        .update({
                                            userId: doc.data().userId,
                                            totalPrice: doc.data().totalPrice - product.price,
                                            totalQuantity: doc.data().totalQuantity - 1,
                                            products: products//doc.data().products
                                        })
                                        .then(() => {
                                            console.log('cart updated');
                                        });
                                } else {
                                    admin.firestore().collection('carts').doc(doc.ref._path.segments[1]).delete().then(() => {
                                        agent.add('remove item complete');
                                    });
                                }

                            }
                            else {
                                //dont have sku in cart -> do not thing
                                // products.push(product);
                                console.log('dont have this sku in cart');
                                agent.add('dont have this sku in cart');
                                // totalQuantityReduce=0;
                                // totalPriceReduce=0;
                            }
                            //

                            // admin.firestore()
                            //     .collection('carts')
                            //     .doc(doc.ref._path.segments[1])
                            //     .update({
                            //         userId: doc.data().userId,
                            //         totalPrice: doc.data().totalPrice - totalPriceReduce,
                            //         totalQuantity: doc.data().totalQuantity - totalQuantityReduce,
                            //         products: products//doc.data().products
                            //     })
                            //     .then(() => {
                            //         console.log('cart updated');
                            //     });
                        });
                    }
                });
            }
        });
    }

    let intentMap = new Map();
    intentMap.set('Get Name', getNameHandler);
    intentMap.set('Get Shirt', getShirtHandler);
    intentMap.set('Add CartTest', addCartHandler);
    intentMap.set('My Cart', myCartHandler);
    intentMap.set('Cancel Cart', cancelCartHandler);
    intentMap.set('Remove Item', removeItemHandler);
    //intentMap.set('Confirm Name Yes', getNameHandler);
    agent.handleRequest(intentMap);
});