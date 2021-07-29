'use strict';

const functions = require('firebase-functions');
const { WebhookClient, Payload } = require('dialogflow-fulfillment');
const admin = require('firebase-admin');
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
        agent.add(`Thank you, ${name} (from Linline Editor)`);
    }

    function addCartHandler(agent) {
        // db.collection("carts").add({ totalPrice: 1000, totalQuantity: 2 ,userId :userId});
        // agent.add(`add cart (from Linline Editor)`);
        // agent.add(userId);
        //////////////////////////////
        return admin.firestore().collection('carts').where('userId', '==', userId).get().then(doc => {
            // agent.add(doc.data().userId);
            // agent.add(userId);
            if (doc.empty) {
                agent.add('doc is empty');
            } else {
                doc.forEach(doc => {
                    agent.add(JSON.stringify(doc));
                });
            }

        });
    }

    function getShirtHandler(agent) {

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
        return admin.firestore().collection('products').where('type', '==', 'shirt').get().then(doc => {
            //agent.add(payload);
            let col = [];
            doc.forEach(doc => {
                col.push({
                    actions: [
                        {
                            label: "add to cart",
                            text: "add " + doc.data().sku,
                            type: "message"
                        }
                    ],
                    thumbnailImageUrl: doc.data().picture,
                    text: "...",
                    title: doc.data().title
                })
                agent.add('type:' + doc.data().type + '\nname:' + doc.data().title + '\nsku:' + doc.data().sku);
            });

            //agent.add('type:'+doc.data().type+'\nname:'+doc.data().title+'\nsku:'+doc.data().sku);
            //});
            return col;
        }).then(col => {
            const payloadJson = {
                altText: "this is a carousel template",
                type: "template",
                template: {
                    columns: col,
                    type: "carousel"
                }
            };

            let payload = new Payload(`LINE`, payloadJson, { sendAsMessage: true });
            agent.add(payload);
        });
    }

    let intentMap = new Map();
    intentMap.set('Get Name', getNameHandler);
    intentMap.set('Get Shirt', getShirtHandler);
    intentMap.set('Add CartTest', addCartHandler);
    //intentMap.set('Confirm Name Yes', getNameHandler);
    agent.handleRequest(intentMap);
});