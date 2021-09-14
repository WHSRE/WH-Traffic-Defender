'use strict';

// Some things we might want to change
const debug = false;
const existingCustomerCookie = '';
const allowedRate = 1;
const aluidCookieName = '';
const tducCookieName = '';
const contentHeaderName = '';
const theAPI = '';
const setCookieDomain = '';
const errDomainName = '';
const errURI = '';

// Main Logic (Lets keep this all in one function for now)
exports.handler = (event, context, callback) => {
    const request = event.Records[0].cf.request;
    log('REQUEST', request);

    const parsedCookies = parseCookies(request.headers.cookie);
    log('REQ COOKIES', parsedCookies);

    // Check For Existing Customers
    const custVal = parsedCookies[existingCustomerCookie];
    log('custVal', custVal);
    if(custVal != undefined && custVal < allowedRate ) {
        log('Existing Customer - return', request);
        callback(null, request);
        return;
    }

    log('requestPath:', request.uri);

    // Pass the aluid & tduc cookies to Netacea
    var sendCookies = '';
    if(parsedCookies[aluidCookieName]) {
        sendCookies+=aluidCookieName+"="+parsedCookies[aluidCookieName]+"; ";
    }
    if(parsedCookies[tducCookieName]) {
        sendCookies+=tducCookieName+"="+parsedCookies[tducCookieName]+"; ";
    }
    log('sendCookies:', sendCookies);

    // Build the headers (Cookies & Client IP & Content) we need to send to the API   
    const apiHeaders = {};
    if(sendCookies != '') {
        apiHeaders['cookie'] = sendCookies;
    }
    if(request.clientIp) {
        apiHeaders['clientip'] = request.clientIp;
    }
    if(request.headers[contentHeaderName]) {
        apiHeaders[contentHeaderName] = request.headers[contentHeaderName][0].value;
    }
    log('Send Header To API:', apiHeaders);

    // Set up the URL options for the API Call (include the original request Path and the Remote IP Address)
    var apiOptions = {
        host: theAPI,
        path: request.uri,
        port: '80',
        method: 'GET',
        followAllRedirects: true,
        followOriginalHttpMethod: true,
        headers: apiHeaders
    };
    log('API OPTIONS', apiOptions);

    var http = require('follow-redirects').http;
    http.get(apiOptions, (res) => {
        log('API RESP statusCode:', res.statusCode);
        log('API RESP headers:', res.headers);

        let apiBody = [];

        // Read in the body
        res.on('data', (chunk) => {
            log('data chunk');
            apiBody.push(chunk);
        });

        // Do stuff when we have finished reading the response
        res.on('end', function () {
            apiBody = Buffer.concat(apiBody).toString();
            log('API BODY', apiBody);

            // Add domain to set-cookies
            if (res.headers['set-cookie']) {
                for (var i in res.headers['set-cookie']) {
                    res.headers['set-cookie'][i] += '; domain=' + setCookieDomain+';';
                }
            }

            // If we get a 503 (user in queue) or the Original Request was for an update
            // then return the body from the API Call direct
            if(res.statusCode==503 || request.headers[contentHeaderName]) {

                // Generate a response object to return direct
                // Add the body passed back from the API Call
                const directResponse = {
                    status: '200',
                    statusDescription: 'OK',
                    headers: {
                        'content-type': createHeader('Content-Type','text/html'),
                        'cache-control': createHeader('Cache-Control','no-cache')
                    },
                };

                // Add Set Cookie Headers for aluid & tduc to direct response
                if (res.headers['set-cookie']) {
                    directResponse.headers['set-cookie'] = createHeader('set-cookie',res.headers['set-cookie']);
                }

                directResponse.body = apiBody;
                log('respond direct to user', directResponse);
                callback(null, directResponse);
            } else {
                // Add Set Cookie as custom Header for aluid & tduc to request (to be used in response rule)
                if (res.headers['set-cookie']) {
                    request.headers['set-cookie'] = createHeader('set-cookie',res.headers['set-cookie']);
                }
                log('API Call was ok (and not a JS refresh) - go to origin', request);
                callback(null, request);
            }
        });

    }).on('error', (e) => {
        console.error(e);
        /* Set custom origin fields*/
        request.origin = {
            custom: {
                domainName: errDomainName,
                port: 443,
                protocol: 'https',
                path: '',
                sslProtocols: ['TLSv1', 'TLSv1.1'],
                readTimeout: 5,
                keepaliveTimeout: 5
             }
         };
        request.headers['host'] = [{ key: 'host', value: errDomainName}];
        request.headers['pp-sports-env'] = [{ key: 'pp-sports-env', value: '2VIjUO16WFK1AKZ6fnhZ'}];  
        request.uri=errURI;
        log('fail closed', request);
        callback(null, request);
    });

};

// Create a Header
function createHeader(headerName,headerValue) {
	const newHeader = [{
		key: headerName,
		value: headerValue
	}];
	log('New Set Header Created', newHeader);
    return newHeader;
}

// Parse the cookie header
function parseCookies(cookies) {
    cookies = cookies || [];
    let parsed = {};
    for (let hdr of cookies) {
        for (let cookie of hdr.value.split(';')) {
            const kv = cookie.split('=');
            if (kv[0] && kv[1]) {
                parsed[kv[0].trim()] = kv[1].trim();
            }
        }
    }
    return parsed;
}

// Log Debug Messages
function log(message, value) {
    if (debug) { 
        console.log(message, value);
    }
}