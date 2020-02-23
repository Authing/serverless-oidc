const path = require("path");
const { Component, utils } = require("@serverless/core");
const random = require("ext/string/random");
const ensureString = require("type/string/ensure");
const ensureIterable = require("type/iterable/ensure");
const ensurePlainObject = require("type/plain-object/ensure");

class AuthingOidc extends Component {
  getAppFiles() {
    return null
  }
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
    console.log(tencentCloudFunction.state.deployed);
    inputs.handler = `${appName}.${handlerName}`;
    console.log(inputs);
    const cloudFunctionOutputs = await tencentCloudFunction(inputs);
    return cloudFunctionOutputs;
  }
  async generateEndpoints(inputs) {
    console.log(this.pathMap);
    let endpoints = [];
    for (let item of this.pathMap) {
      console.log(`start update function ${item.handlerName}`);
      let endpoint = { path: item.path, method: item.method||"ANY" };
      let cloudFunction = await this.updateFunction(inputs, item.handlerName);
      console.log(cloudFunction);
      endpoint["function"] = {
        isIntegratedResponse: true,
        functionName: cloudFunction.Name
      };
      endpoints.push(endpoint);
    }
    return endpoints;
  }
  async default(inputs = {}) {
    this.pathMap = require('./code/core.js').pathMap;
    inputs.name = inputs.name || `Authing-OIDC_${random({ length: 6})}`

    inputs.codeUri = process.cwd() + "/code/";
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
      functionName: inputs.name
    };

    // only user set apigatewayConf.isDisabled to `true`, do not create api
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
      if (inputs.apigatewayConf && inputs.apigatewayConf.usagePlan) {
        apigwParam.endpoints[0].usagePlan = inputs.apigatewayConf.usagePlan;
      }
      if (inputs.apigatewayConf && inputs.apigatewayConf.auth) {
        apigwParam.endpoints[0].auth = inputs.apigatewayConf.auth;
      }

      apigwParam.fromClientRemark =
        inputs.fromClientRemark || "Authing-OIDC";
      console.log(apigwParam);
      const tencentApiGatewayOutputs = await tencentApiGateway(apigwParam);

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
