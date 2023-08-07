import { Stack, StackProps, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamoDb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apiGateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Database } from './database';
import { LambdaHandler } from './lambda-handler';
import { Workflow } from './workflow';

export class WebApiStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        // DynamoDB table construction
        const db = new Database(this, 'LibraryDatabase', {
            tableName: 'BookLibrary',
            readCapacity: 5,
            writeCapacity: 5,
            billingMode: dynamoDb.BillingMode.PROVISIONED,
            autoScaling: false,
            maxCapacity: 10,
            globalSecondaryIndexes: [
                {
                    indexName: 'AuthorIndex',
                    partitionKey: {
                        name: 'Author',
                        type: dynamoDb.AttributeType.STRING,
                    },
                    sortKey: {
                        name: 'PK',
                        type: dynamoDb.AttributeType.STRING,
                    },
                    readCapacity: 5,
                    writeCapacity: 5,
                    projectionType: dynamoDb.ProjectionType.ALL,
                },
            ],
        });

        // Lambda Handlers constructions
        const lambdaLayer = new lambda.LayerVersion(
            this,
            'Common Package Layer',
            {
                compatibleRuntimes: [lambda.Runtime.PYTHON_3_8],
                code: lambda.Code.fromAsset('lambda/packages'),
                description: 'Common Package Layer',
            }
        );

        const stackLambdaHandlers = {
            getBooks: new LambdaHandler(this, 'GetBooksHandler', {
                name: 'GetBooksFunction',
                runtime: lambda.Runtime.PYTHON_3_8,
                codeAsset: lambda.Code.fromAsset('lambda/get_books'),
                handler: 'get_books.handler',
                environment: {
                    DYNAMODB_TABLE_NAME: db.table.tableName,
                    DYNAMODB_REGION: process.env.AWS_REGION ?? 'ap-southeast-1',
                    LAMBDA_ENV: process.env.LAMBDA_ENV ?? 'prod',
                    DYNAMODB_ENDPOINT: process.env.DYNAMODB_ENDPOINT ?? '',
                },
                layers: [lambdaLayer],
            }),
            getBookDetail: new LambdaHandler(this, 'GetBookDetailHandler', {
                name: 'GetBookDetailFunction',
                runtime: lambda.Runtime.PYTHON_3_8,
                codeAsset: lambda.Code.fromAsset('lambda/get_book_detail'),
                handler: 'get_book_detail.handler',
                environment: {
                    DYNAMODB_TABLE_NAME: db.table.tableName,
                    DYNAMODB_REGION: process.env.AWS_REGION ?? 'ap-southeast-1',
                    LAMBDA_ENV: process.env.LAMBDA_ENV ?? 'prod',
                    DYNAMODB_ENDPOINT: process.env.DYNAMODB_ENDPOINT ?? '',
                },
                layers: [lambdaLayer],
            }),
        };

        // Identity Provider for the API Gateway
        const userPool = new cognito.UserPool(this, 'LibraryUserPool', {
            userPoolName: 'LibraryUserPool',
            removalPolicy: RemovalPolicy.DESTROY,
        });
        const userPoolClient = userPool.addClient('web.client', {
            oAuth: {
                flows: {
                    authorizationCodeGrant: true,
                },
                scopes: [cognito.OAuthScope.OPENID],
                callbackUrls: ['http://localhost:4200/'],
                logoutUrls: ['http://localhost:4200/signin'],
            },
        });
        const userPoolDomain = userPool.addDomain('LibraryUserPoolDomain', {
            cognitoDomain: {domainPrefix: `${Date.now()}-user-pool`},
        });

        const auth = new apiGateway.CognitoUserPoolsAuthorizer(
            this,
            'LibraryUserPoolsAuthorizer',
            {
                authorizerName: 'LibraryUserPoolsAuthorizer',
                cognitoUserPools: [userPool],
            }
        );

        // API Gateway resources construction
        const gateway = new apiGateway.RestApi(this, 'LibraryRestApi', {
            restApiName: 'LibraryRestApi',
            deployOptions: {
                loggingLevel: apiGateway.MethodLoggingLevel.INFO,
                dataTraceEnabled: true,
                tracingEnabled: true,
                stageName: 'prod',
            },
        });

        const bookResource = gateway.root.addResource('books');
        bookResource.addMethod(
            'GET',
            new apiGateway.LambdaIntegration(
                stackLambdaHandlers.getBooks.function,
                {
                    contentHandling: apiGateway.ContentHandling.CONVERT_TO_TEXT,
                }
            )
        );

        bookResource.addResource('{bookId}').addMethod(
            'GET',
            new apiGateway.LambdaIntegration(
                stackLambdaHandlers.getBookDetail.function,
                {
                    contentHandling: apiGateway.ContentHandling.CONVERT_TO_TEXT,
                }
            ),
            {
                authorizer: auth,
                authorizationType: apiGateway.AuthorizationType.COGNITO,
            }
        );

        db.table.grantReadData(stackLambdaHandlers.getBooks.function);
        db.table.grantReadData(stackLambdaHandlers.getBookDetail.function);

        // Workflow constructions
        const workflow = new Workflow(this, 'ReviewAnalysisWorkflow', {
            db: db.table,
        });

        const reviewResource = gateway.root.addResource('reviews');

        reviewResource.addMethod(
            'POST',
            apiGateway.StepFunctionsIntegration.startExecution(
                workflow.stateMachine,
                {
                    passthroughBehavior: apiGateway.PassthroughBehavior.NEVER,
                    requestParameters: {
                        'integration.request.header.Content-Type':
                            "'application/json'",
                    },
                    requestTemplates: {
                        'application/json': JSON.stringify({
                            input: `$util.escapeJavaScript($input.json('$'))`,
                            stateMachineArn:
                                workflow.stateMachine.stateMachineArn,
                        }),
                    },
                    integrationResponses: [
                        {
                            statusCode: '200',
                            responseTemplates: {
                                'application/json': `
                                #set ($parsedPayload = $util.parseJson($input.json('$.output')))
                                $parsedPayload
                                `,
                            },
                        },
                    ],
                }
            ),
            {
                requestValidatorOptions: { validateRequestBody: true },
                requestModels: {
                    'application/json': new apiGateway.Model(
                        this,
                        'ReviewFormModel',
                        {
                            restApi: gateway,
                            schema: {
                                schema: apiGateway.JsonSchemaVersion.DRAFT4,
                                title: 'Review Form Model (Payload)',
                                type: apiGateway.JsonSchemaType.OBJECT,
                                required: ['bookId', 'reviewer', 'message'],
                                properties: {
                                    bookId: {
                                        type: apiGateway.JsonSchemaType.STRING,
                                        description:
                                            'The ID of the book to review',
                                        minLength: 1,
                                    },
                                    reviewer: {
                                        type: apiGateway.JsonSchemaType.STRING,
                                        description: 'The name of the reviewer',
                                        minLength: 1,
                                    },
                                    message: {
                                        type: apiGateway.JsonSchemaType.STRING,
                                        description: 'The message content',
                                        minLength: 1,
                                    },
                                },
                            },
                        }
                    ),
                },
                methodResponses: [{ statusCode: '200' }],
            }
        );

        new CfnOutput(this, 'ApiGatewayEndpoint', {
            value: gateway.url,
            description: 'Endpoint for the API Gateway',
            exportName: 'web-api-gateway-endpoint',
        });

        new CfnOutput(this, 'UserPoolId', {
            value: userPool.userPoolId,
            description: 'User Pool ID',
            exportName: 'web-user-pool-id',
        });
        
        new CfnOutput(this, 'UserPoolClientId', {
            value: userPoolClient.userPoolClientId,
            description: 'User Pool Client ID',
            exportName: 'web-user-pool-client-id',
        });

        new CfnOutput(this, 'UserPoolDomain', {
            value: `https://${userPoolDomain.domainName}.auth.${process.env.AWS_REGION}.amazoncognito.com`,
            description: 'User Pool Domain',
            exportName: 'web-user-pool-domain',
        });
    }
}
