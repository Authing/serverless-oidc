const axios = require("axios");
const {
  CONFIG,
  code2Token,
  generateLoginUri,
  getPostData,
  generateResponse,
  genCookie,
  getGetData,
} = require("./utils");

exports.pathMap = [
  {
    path: "/login/",
    handlerName: "getAuthorizationURL"
  },
  { path: "/code2token/", handlerName: "getTokenByCode" },
  { path: "/refreshtoken/", handlerName: "refreshToken" },
  { path: "/status/", handlerName: "status" },
  { path: "/checktoken/", handlerName: "checkToken" },
  { path: "/userinfo/", handlerName: "getUserInfoByAccessToken" }
];

//hello
exports.hello = async function hello(event, context) {
  return generateResponse(event);
};

//status
exports.status = async function status(event, context) {
  return generateResponse("ok");
};

//login
exports.getAuthorizationURL = async function getAuthorizationURL(
  event,
  context
) {
  let redirect_uri = generateLoginUri(event.headers.host);
  return generateResponse(redirect_uri, 302);
}; //返回构造好的跳转链接 默认是code2Token

//code2token
exports.getTokenByCode = async function getTokenByCode(event, context) {
  let host = event.headers.host
  let data= event.queryString;
  if (data === undefined){
    return generateResponse(event)
  }
  let code = data.code
  let token = await code2Token(code,host);
  if (token||token.access_token){
    return generateResponse(
      `/release/?token=${token.access_token}`,
      302,
      headers = { "Set-Cookie": genCookie(token) }
    );
  }
  return generateResponse(token);
}; //通过get post 读取 code 返回 token

//checkToken
exports.checkToken = async function checkToken(event, context, callback) {
  // oauth/oidc/validate_access_token
  let { access_token } = getPostData(event);
  if (access_token == undefined) {
    return generateResponse("invalid Token", 401);
  }
  let validateAccessTokenResult;
  try {
    validateAccessTokenResult = await axios.get(
      `https://oauth.authing.cn/oauth/oidc/validate_access_token?access_token=${access_token}`
    );
    return generateResponse(validateAccessTokenResult.data);
  } catch (error) {
    return generateResponse(error.message, 401);
  }
}; 

//userinfo
exports.getUserInfoByAccessToken = async function getUserInfoByAccessToken(
  event,
  context
) {
  let { access_token } = getPostData(event);
  if (access_token === undefined) {
    return generateResponse({ error: "invalid Token" }, 401);
  }
  try {
    userInfo = await axios.get(
      `https://oauth.authing.cn/oauth/oidc/user/userinfo?access_token=${access_token}`
    );
    return generateResponse(userInfo.data);
  } catch (error) {
    return generateResponse({ error }, 401);
  }
};

//refreshToken
exports.refreshToken = async function refreshToken(event, context) {
  let data = getPostData(event);
  if ("access_token" in data) {
    token = refreshToken(data["access_token"]);
    return {
      headers: { "Set-Cookie": genCookie("access_token", token) }
    };
  } else {
    return generateResponse({ error: "invalid Token" }, 401);
  }
};
