const path = require("path");
const { Component } = require("@serverless/core");
const random = require("ext/string/random");
const ensureString = require("type/string/ensure");
const ensureIterable = require("type/iterable/ensure");
const ensurePlainObject = require("type/plain-object/ensure");

class AuthingOidc extends Component {
  getDefaultProtocol(protocols) {
    if (protocols.map(i => i.toLowerCase()).includes("https")) {
      return "https";
    }
    return "http";
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
