# Serverless-OIDC

<img src="./static/serverless-oidc.png" style="margin: auto;display: block;"/>

Serverless Authing OIDC(OpenID Connect) Demo.

<p align="center">
  <span>简体中文</span> |
  <a href="./README_en.md">English</a>
</p>

## 什么是 OIDC 协议

> OpenID Connect 1.0 is a simple identity layer on top of the OAuth 2.0 protocol. It allows Clients to verify the identity of the End-User based on the authentication performed by an Authorization Server, as well as to obtain basic profile information about the End-User in an interoperable and REST-like manner.

**OpenID Connect 简称 OIDC，是 OAuth 2.0 的一个扩展，主要增加了语义化的用户信息字段。**

下图是一个以授权码为例子的 OIDC 授权流程：
<img src="./static/OIDCFlowGraphql.png" style="margin: auto;display: block;"/>

更多信息可以查看 [OIDC 流程](https://docs.authing.cn/authing/advanced/oidc/understand-oidc)。

## 应用介绍 🏠

您可以通过以下几步操作快速的创建一个使用 Tencent Scf 和 Api 网关 组成的 实现 OIDC 流畅的Serverless应用。

## 示例链接 🔗

[Serless Oidc Demo](http://service-jaom3m0x-1257685189.sh.apigw.tencentcs.com/)

## 前提条件 🧾

在使用之前，请确保具备以下条件：

1.  [Node.js](https://serverlesscloud.cn/doc/providers/tencent/cli-reference/quick-start#node) （8.x 或以上的版本）
2.  Serverless Framework CLI
3.  Authing OIDC AppID && Secret

### 安装 Node.js 和 NPM

- 参考 [Node.js 安装指南](https://nodejs.org/zh-cn/download/) 根据您的系统环境进行安装。
- 安装完毕后，通过 node -v 命令，查看安装好的 Node.js 版本信息：

```shell
$ node -v
vx.x.x
```

- 通过 npm -v 命令，查看安装好的 npm 版本信息：

```shell
$ npm -v
x.x.x
```

### 安装 Serverless Framework CLI

- 在命令行中运行如下命令：

```shell
$ npm install -g serverless
```

- 安装完毕后，通过运行 serverless -v 命令，查看 Serverless Framework CLI 的版本信息。

```shell
$ serverless -v
x.x.x
```

<details>
<summary style="font-size:1.25em"><strong>注册 Authing 账户</strong></summary>

1. 首先访问[Authing SSO](https://sign.authing.cn/login)进行注册，在注册成功后会自动跳转至 Guide 页面指引你创建一个用户池。
   <img src="./static/CleanShot2020-02-20at15.10.45.png" height='400px' style="margin: auto;display: block;">
2. 在这里填写想要的用户池名。

   <img src="./static/CleanShot2020-02-20at15.12.18.png" height='400px' style="margin: auto;display: block;">

3. 选择二级域名 你可以选择一个你喜欢的二级域名作为你的业务域名。

   <img src="./static/CleanShot2020-02-20at15.14.02.png" height='400px' style="margin: auto;display: block;">

4. 填写回调地址 在这里可以选择你喜欢的业务回调地址。
   <img src="./static/CleanShot2020-02-20at17.29.58.png" height='400px' style="margin: auto;display: block;">

5. 选择 OIDC 应用  
   在创建完成后自动跳转至，控制台。  
   在控制台中分别点击 `第三方登录`->`OIDC应用`后，可以看到已经生成的 OIDC 应用名，点击应用名即可看到该应用信息。

   <img src="./static/CleanShot2020-02-20at15.21.50.png" height='400px' style="margin: auto;display: block;">

6. 在应用信息中可以看到 `AppID` 和 `Secret` 信息

      <img src="./static/CleanShot2020-02-20at15.25.54.png" height='400px' style="margin: auto;display: block;">
   </details>

## 构建应用 🚗

### 1. 创建需要的文件

本地创建 `serverless.yml`文件：

```shell
touch serverless.yml
```

### 2. 安装所需依赖

```
npm install --save @authing/serverless-oidc
```

### 3. 编辑 `serverless.yml` 文件

在 serverless.yml 中进行如下配置

```yml
# serverless.yml
firstApp:
  inputs:
    region: ap-shanghai
  authing:
    oidc: 
      client_id: 你的OIDC应用id
      domain: 你的OIDC域名
      scope: openid profile
      grant_type: authorization_code
      prompt: login
      client_secret: 你的 OIDC 应用 secret
      response_type: code
```

## 部署 🛫️

使用 `serverless` 部署应用是十分简单的。
只需要通过`sls`命令即可完成部署，并可以添加`--debug`参数查看部署过程中的信息。
如您的账号未登录或注册腾讯云，您可以直接通过微信扫描命令行中的二维码进行授权登录和注册。

```shell
$ sls --debug
```

### 账号配置（可选）

当前默认支持 CLI 扫描二维码登录，如你希望配置持久的环境变量/秘钥信息，也可以本地创建 `.env` 文件
在 .env 文件中配置腾讯云的 SecretId 和 SecretKey 信息并保存

```
# .env
TENCENT_SECRET_ID=123
TENCENT_SECRET_KEY=123
```

## 配置回调地址

部署完成后 `cli` 界面会返回项目的 `url` 地址。

```sh
$ sls --debug
  express:
    region:              ap-shanghai
    functionName:        ExpressComponent_b7ilv1
    apiGatewayServiceId: service-jaom3m0x
    url:                 http://service-jaom3m0x-1257685189.sh.apigw.tencentcs.com/release/
  38s › express › done
```

由于安全性你需要在`Authing`的`OIDC`详情中配置回调 URL 来允许我们创建的 `serverless 应用`使用 `OIDC` 登录服务。  
在前面的准备阶段我们已经提过如何访问找到`OIDC`的详情页面。如果没有找到，还请返回查看。
在详情页面中 我们只需要在`回调 URL` 的部分中将我们的`app url` 填写进去即可。
<img src="./static/callbackUrl.png"  style="margin: auto;display: block;">

## Have fun!🎉
