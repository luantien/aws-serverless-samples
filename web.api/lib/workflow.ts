import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as stepFunc from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as dynamoDb from 'aws-cdk-lib/aws-dynamodb';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { LambdaHandler } from './lambda-handler';
import { JsonPath } from 'aws-cdk-lib/aws-stepfunctions';

export interface StepFunctionProps {
    db: dynamoDb.Table;
}

export class Workflow extends Construct {
    public readonly stateMachine: stepFunc.StateMachine;

    constructor(scope: Construct, id: string, props: StepFunctionProps) {
        super(scope, id);

        const lambdaHandlers = {
            detectSentiment: new LambdaHandler(this, 'DetectSentimentHandler', {
                name: 'DetectSentimentFunction',
                runtime: lambda.Runtime.PYTHON_3_8,
                codeAsset: lambda.Code.fromAsset(
                    'lambda/detect_review_sentiment'
                ),
                handler: 'detect_review_sentiment.handler',
                policies: [
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: ['comprehend:DetectSentiment'],
                        resources: ['*'],
                    }),
                ],
            }),
            generateRefId: new LambdaHandler(this, 'GenerateRefIdHandler', {
                name: 'GenerateRefIdFunction',
                runtime: lambda.Runtime.PYTHON_3_8,
                codeAsset: lambda.Code.fromAsset('lambda/generate_ref_id'),
                handler: 'generate_ref_id.handler',
            }),
            notifyNegativeReview: new LambdaHandler(
                this,
                'NotifyNegativeReviewHandler',
                {
                    name: 'NotifyNegativeReviewFunction',
                    runtime: lambda.Runtime.PYTHON_3_8,
                    codeAsset: lambda.Code.fromAsset(
                        'lambda/notify_negative_review'
                    ),
                    handler: 'notify_negative_review.handler',
                    environment: {
                        EMAIL_FROM: process.env.EMAIL_FROM ?? '',
                        EMAIL_TO: process.env.EMAIL_TO ?? '',
                    },
                    policies: [
                        new iam.PolicyStatement({
                            effect: iam.Effect.ALLOW,
                            actions: ['ses:SendEmail'],
                            resources: ['*'],
                        }),
                    ],
                }
            ),
        };
        const definition = stepFunc.Chain.start(
            new tasks.LambdaInvoke(this, 'DetectSentiment', {
                lambdaFunction: lambdaHandlers.detectSentiment.function,
                resultPath: '$.sentimentResult',
            })
        )
            .next(
                new tasks.LambdaInvoke(this, 'GenerateRefId', {
                    lambdaFunction: lambdaHandlers.generateRefId.function,
                    resultPath: '$.refId',
                })
            )
            .next(
                new tasks.DynamoPutItem(this, 'PutReviewToDynamo', {
                    table: props.db,
                    item: {
                        PK: tasks.DynamoAttributeValue.fromString(
                            stepFunc.JsonPath.stringAt('$.bookId')
                        ),
                        SK: tasks.DynamoAttributeValue.fromString(
                            stepFunc.JsonPath.stringAt('$.refId.Payload')
                        ),
                        Reviewer: tasks.DynamoAttributeValue.fromString(
                            stepFunc.JsonPath.stringAt('$.reviewer')
                        ),
                        Message: tasks.DynamoAttributeValue.fromString(
                            stepFunc.JsonPath.stringAt('$.message')
                        ),
                        Sentiment: tasks.DynamoAttributeValue.fromString(
                            stepFunc.JsonPath.stringAt(
                                '$.sentimentResult.Payload.Sentiment'
                            )
                        ),
                    },
                    resultPath: JsonPath.DISCARD,
                })
            )
            .next(
                new stepFunc.Choice(this, 'CheckReviewSentiment')
                    .when(
                        stepFunc.Condition.stringEquals(
                            stepFunc.JsonPath.stringAt(
                                '$.sentimentResult.Payload.Sentiment'
                            ),
                            'NEGATIVE'
                        ),
                        new tasks.LambdaInvoke(this, 'NotifiyNegativeReview', {
                            lambdaFunction:
                                lambdaHandlers.notifyNegativeReview.function,
                            resultPath: JsonPath.DISCARD,
                        })
                    )
                    .otherwise(new stepFunc.Succeed(this, 'PositiveReview'))
            );

        this.stateMachine = new stepFunc.StateMachine(this, 'StateMachine', {
            stateMachineName: 'ReviewSentimentAnalysis',
            definition: definition,
            stateMachineType: stepFunc.StateMachineType.EXPRESS,
            timeout: Duration.seconds(300),
            tracingEnabled: true,
            logs: {
                destination: new logs.LogGroup(this, 'ReviewAnalysisLogGroup', {
                    retention: logs.RetentionDays.ONE_WEEK,
                }),
            },
        });

        props.db.grantWriteData(this.stateMachine);
    }
}
