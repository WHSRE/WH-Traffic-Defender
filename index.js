'use strict';

const debug = false;
const cookiePath = '/';
const cookieName = '';
const maxAge = '';
const cookieDomain = '';

// Origin Response handler
exports.handler = (event, context, callback) => {
    const request = event.Records[0].cf.request;
    const response = event.Records[0].cf.response;    
    const parsedCookies = parseCookies(request.headers.cookie);

    // Check for our cookie and set it if not already set
    if(!parsedCookies[cookieName]) {
        //setCookie(response, "test=1", maxAge);
        setCookie(response, cookieName+"="+Math.random(), maxAge);
        log('FINAL SET COOKIE', response.headers['set-cookie']);
    }

    callback(null, response);
};

// Add set-cookie header (including path)
const setCookie = function(response, cookie, maxAge) {
    const cookieValue = `${cookie}; Max-Age=${maxAge}; Path=${cookiePath}; Domain=${cookieDomain}`;
    const setCookieHeader = [{ key: "Set-Cookie", value: cookieValue }];
    log('Setting cookie', setCookieHeader);
    if(response.headers['set-cookie']) {
        response.headers['set-cookie'] = response.headers['set-cookie'].concat(setCookieHeader);
    } else {
        response.headers['set-cookie'] = setCookieHeader;
    }
};

// parse the cookies
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