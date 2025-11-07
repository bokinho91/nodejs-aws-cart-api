import * as rds from 'aws-cdk-lib/aws-rds';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { aws_secretsmanager as secretsmanager } from 'aws-cdk-lib';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { join } from 'path';
import { aws_apigateway as apigateway } from 'aws-cdk-lib';

export class CartStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const dbCredentialsSecret = new secretsmanager.Secret(this, 'MyDBCreds', {
      secretName: 'MyDBCredsName',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: 'myadminuser',
        }),
        excludePunctuation: true,
        includeSpace: false,
        generateStringKey: 'password',
      },
    });

    const vpc = new ec2.Vpc(this, 'MyVPC', {
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'PublicSubnet',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    const dbInstance = new rds.DatabaseInstance(this, 'RDSInstance', {
      //PostgreSQL
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16_4,
      }),

      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE3,
        ec2.InstanceSize.MICRO,
      ),
      vpc,
      credentials: rds.Credentials.fromSecret(dbCredentialsSecret),
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      multiAz: false,
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      allowMajorVersionUpgrade: false,
      autoMinorVersionUpgrade: true,
      backupRetention: cdk.Duration.days(7),
      deleteAutomatedBackups: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false,
    });

    const lambdaFunction = new lambdaNodejs.NodejsFunction(
      this,
      'LambdaFunction',
      {
        // lambda Function Config
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: join(__dirname, '..', '..', 'src', 'lambda.ts'),
        handler: 'handler',
        environment: {
          DB_HOST: dbInstance.dbInstanceEndpointAddress,
          DB_PORT: dbInstance.dbInstanceEndpointPort,
          DB_NAME: 'postgres',
          DB_USERNAME: dbCredentialsSecret
            .secretValueFromJson('username')
            .unsafeUnwrap(),
          DB_PASSWORD: dbCredentialsSecret
            .secretValueFromJson('password')
            .unsafeUnwrap(),
          NODE_ENV: 'production',
        },
        bundling: {
          externalModules: [
            'cache-manager',
            'aws-sdk',
            '@nestjs/websockets',
            '@nestjs/microservices',
            // 'class-transformer',
            // 'class-validator',
            '@nestjs/websockets/socket-module',
            '@nestjs/microservices/microservices-module',
          ],
          minify: false,
          sourceMap: true,
          keepNames: true,
        },
        vpc,
        allowPublicSubnet: true,
        securityGroups: [dbInstance.connections.securityGroups[0]],
        timeout: cdk.Duration.seconds(60),
        memorySize: 1024,
      },
    );

    dbInstance.connections.allowDefaultPortFrom(lambdaFunction);
    dbCredentialsSecret.grantRead(lambdaFunction);

    // API Gateway
    const api = new apigateway.RestApi(this, 'NestApi', {
      restApiName: 'NestJS Cart API',
      description: 'API Gateway for NestJS Cart Application',
      deployOptions: {
        stageName: 'dev',
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
      },
    });

    // Lambda integration
    const lambdaIntegration = new apigateway.LambdaIntegration(lambdaFunction);

    // Routes
    api.root.addMethod('ANY', lambdaIntegration);
    api.root.addResource('{proxy+}').addMethod('ANY', lambdaIntegration);

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
    });

    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: dbInstance.dbInstanceEndpointAddress,
    });
  }
}
