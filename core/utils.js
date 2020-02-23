const axios = require("axios");
const yaml = require("js-yaml");
const fs = require("fs");
const qs = require("qs");
let dig = (obj, target) => {
  return target in obj
    ? obj[target]
    : Object.values(obj).reduce((acc, val) => {
        if (acc !== undefined) return acc;
        if (typeof val === "object") return dig(val, target);
      }, undefined);
}; 
//获取全局配置
const CONFIG = dig(
  yaml.load(fs.readFileSync("./serverless.yml", "utf8")),
  "oidc"
);
CONFIG.stage = CONFIG.stage || 'release'
function genRedirectUri(host, route = "code2token",https=false){
    return `${https?'https':'http'}://${host}/${CONFIG.stage}/${route}/`
}
function getGetData(event) {
  return event.queryString;
}
function generateResponse(
  data,
  statusCode = 200,
  headers = {},
  isBase64Encoded = false
) {
  if (statusCode === 302) {
    headers["Content-Type"] = headers["Content-Type"] || "text/plain";
    headers["location"] = data;
    return {
      statusCode,
      body: "",
      headers
    };
  }
  let responseData = {
    statusCode: statusCode,
    isBase64Encoded: isBase64Encoded
  };
  if (typeof data === "object") {
    responseData.body = JSON.stringify(data);
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  } else {
    responseData.body = data;
    headers["Content-Type"] = responseData.headers = headers || "text/html";
  }
  responseData.headers = headers;
  return responseData;
}

function generateLoginUri(host, route = "code2token") {
  const serverlessConstructorParams = {
    client_id: CONFIG.client_id,
    scope: CONFIG.scope,
    response_type: CONFIG.response_type,
    prompt: CONFIG.prompt,
    redirect_uri: genRedirectUri(host)
  };
  let urlPostFix = "";
  for (const key in serverlessConstructorParams) {
    urlPostFix += `${key}=${serverlessConstructorParams[key]}&`;
  }
  return `https://${CONFIG.domain}/oauth/oidc/auth?${urlPostFix}`;
}

//用code换取token信息
async function code2Token(code,host) {
  let code2tokenResponse;
  let data = {};
  try {
    data = qs.stringify({
      code: code,
      client_id: CONFIG.client_id,
      client_secret: CONFIG.client_secret,
      grant_type: CONFIG.grant_type,
      redirect_uri: genRedirectUri(host)
    });
    code2tokenResponse = await axios.post(
      "https://oauth.authing.cn/oauth/oidc/token",
      data,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );
    return code2tokenResponse.data;
  } catch (error) {
    return { error: error, params: data };
  }
}

async function refreshToken(Token) {
  let refreshTokenResponse;
  try {
    refreshTokenResponse = await axios.post(
      "https://oauth.authing.cn/oauth/oidc/token",
      qs.stringify({
        client_id: CONFIG.client_id,
        client_secret: CONFIG.client_secret,
        grant_type: "refresh_token",
        refresh_token:Token
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );
    return refreshTokenResponse.data;
  } catch (error) {
    throw Error(error);
  }
}
//return a Cookie's string
function genCookie(
  key,
  value = "",
  max_age = "",
  path = "/",
  domain = ""
) {
  if (typeof value === "object") {
    value = JSON.stringify(value);
  }
  return `${key}=${value};path=${path};${
    max_age === "" ? "" : "max_age=" + max_age + ";"
  }${domain === "" ? "" : "domain=" + domain + ";"}`;
}
exports.getGetData = getGetData;
exports.genCookie = genCookie;
exports.generateResponse = generateResponse;
exports.refreshToken = refreshToken;
exports.getPostData = event =>
  event.httpMethod == "POST" ? JSON.parse(event.body) : {};
exports.generateLoginUri = generateLoginUri;
exports.CONFIG;
exports.code2Token = code2Token;
