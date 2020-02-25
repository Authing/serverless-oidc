const path = require("path");
const { Component } = require("@serverless/core");
const random = require("ext/string/random");
const ensureString = require("type/string/ensure");
const ensureIterable = require("type/iterable/ensure");
const ensurePlainObject = require("type/plain-object/ensure");
const exec = require('child_process').execSync
const existsSync = require('fs').existsSync
class AuthingOidc extends Component {
  getDefaultProtocol(protocols) {
    if (protocols.map(i => i.toLowerCase()).includes("https")) {
      return "https";
    }
    return "http";
  }
  async resolveNodeModules(path){
    if(!await existsSync(path+'/node_modules')){
      console.log(path);
      this.context.debug('Are solving the problem of dependencepend on')
      try{
        exec('npm install',{cwd:path,encoding:'utf8'}) 
      }catch(err){
        console.log('npm install failed')
        console.log(err)
      }
      this.context.debug('npm install successes')
    }
  }
  async updateFunction(inputs, handlerName,appName="core") {
    inputs.Description = `This is a ${handlerName}`;
    inputs.name = handlerName;
    const tencentCloudFunction = await this.load(
      "@serverless/tencent-scf",
      handlerName
    );
    inputs.handler = `${appName}.${handlerName}`;
    const cloudFunctionOutputs = await tencentCloudFunction(inputs);
    return cloudFunctionOutputs;
  }

  async generateEndpoints(inputs,path,appName) {
    let pathMap = require(`${path}/${appName}.js`).pathMap;
    inputs.codeUri = `${path}/`
    let endpoints = [];
    for (let item of pathMap) {
      console.log(`start uploading function ${item.handlerName}`);
      let endpoint = { path: item.path, method: item.method||"ANY" };
      let cloudFunction = await this.updateFunction(inputs, item.handlerName,appName=appName);
      this.context.debug(`${item.handlerName} upload success`)
      endpoint["function"] = {
        isIntegratedResponse: true,
        functionName: cloudFunction.Name
      };
      endpoints.push(endpoint);
    }
    return endpoints;
  }

  async default(inputs = {}) {
    inputs.name = inputs.name || `Authing-OIDC_${random({ length: 6})}`
    inputs.codeUri = process.cwd() + "/core/";
    await this.resolveNodeModules(__dirname + "/core/")
    inputs.region = ensureString(inputs.region, { default: "ap-guangzhou" });
    inputs.include = ensureIterable(inputs.include, {
      default: [],
      ensureItem: ensureString
    });
    inputs.exclude = ensureIterable(inputs.exclude, {
      default: [],
      ensureItem: ensureString
    });
    inputs.apigatewayConf = ensurePlainObject(inputs.apigatewayConf, {
      default: {}
    });
    inputs.include = [path.resolve(process.cwd()+'/serverless.yml')]
    inputs.exclude = [
      ".git/**",
      ".gitignore",
      ".serverless",
      ".DS_Store",
      ".*",
      "update/"
    ];
    inputs.runtime = "Nodejs8.9";
    inputs.fromClientRemark = inputs.fromClientRemark || "Authing-ODIC";
    const outputs = {
      region: inputs.region,
      appName: inputs.name
    };

    let authingComponents = {
      path:`${__dirname}/core`,
      appName:'core'
    }
   
    let endpoints = await this.generateEndpoints(inputs,`${process.cwd()}/app`,'app')
    endpoints = endpoints.concat(await this.generateEndpoints(inputs,authingComponents.path,authingComponents.appName))
    if (!inputs.apigatewayConf.isDisabled) {
      const tencentApiGateway = await this.load(
        "@serverless/tencent-apigateway"
      );
      const apigwParam = {
        serviceName: inputs.serviceName,
        description: "Authing serverless ODIC",
        serviceId: inputs.serviceId,
        region: inputs.region,
        protocols:
          inputs.apigatewayConf && inputs.apigatewayConf.protocols
            ? inputs.apigatewayConf.protocols
            : ["http"],
        environment:
          inputs.apigatewayConf && inputs.apigatewayConf.environment
            ? inputs.apigatewayConf.environment
            : "release",
        endpoints: endpoints,
        customDomain: inputs.apigatewayConf.customDomain
      };

      apigwParam.fromClientRemark =
        inputs.fromClientRemark || "Authing-OIDC";
      const tencentApiGatewayOutputs = await tencentApiGateway(apigwParam);
      outputs.route = endpoints
      outputs.apiGatewayServiceId = tencentApiGatewayOutputs.serviceId;
      outputs.url = `${this.getDefaultProtocol(
        tencentApiGatewayOutputs.protocols
      )}://${tencentApiGatewayOutputs.subDomain}/${
        tencentApiGatewayOutputs.environment
      }/`;
      outputs.info = `请到 Authing OIDC 应用控制台将 ${outputs.url}code2token/ 添加至 回调 URL`
      if (tencentApiGatewayOutputs.customDomains) {
        outputs.customDomains = tencentApiGatewayOutputs.customDomains;
      }
    }

    return outputs;
  }

  async remove(inputs = {}) {
    const removeInput = {
      fromClientRemark: inputs.fromClientRemark || "Authing-OIDC"
    };
    const tencentCloudFunction = await this.load("@serverless/tencent-scf");
    const tencentApiGateway = await this.load("@serverless/tencent-apigateway");

    await tencentCloudFunction.remove(removeInput);
    await tencentApiGateway.remove(removeInput);

    return {};
  }
}

module.exports = AuthingOidc;
