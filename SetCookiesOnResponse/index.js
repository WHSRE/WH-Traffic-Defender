'use strict';

// Some things we might want to change
const debug = false;

// Main Logic (Lets keep this all in one function for now)
exports.handler = (event, context, callback) => {
    const evRequest = event.Records[0].cf.request;
    const evResponse = event.Records[0].cf.response;

    log('REQUEST', evRequest);
    log('RESPONSE', evResponse);

    // Use the set-cookie header passed from the request
    log('SET-COOKIE HEADER', evRequest.headers['set-cookie']);
    if(evRequest.headers['set-cookie'] != undefined) {
        var reqSetCookie = evRequest.headers['set-cookie'];
        var respSetCookie = evResponse.headers['set-cookie'];
        if(respSetCookie) {
            evResponse.headers['set-cookie'] = evResponse.headers['set-cookie'].concat(reqSetCookie);
        } else {
            evResponse.headers['set-cookie'] = reqSetCookie;
        }
        log('FINAL SET COOKIE', evResponse.headers['set-cookie']);
    }
    log('FINAL RESPONSE', evResponse);
    callback(null, evResponse);
};

// Log Debug Messages
function log(message, value) {
    if (debug) { 
        console.log(message, value);
    }
}