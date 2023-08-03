import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class CloudFrontDistribution extends cloudfront.Distribution {
    constructor(scope: Construct, name: string, bucket: Bucket) {
        super(scope, name, {
            defaultBehavior: {
                origin: new S3Origin(bucket), // This will create OAI object automatically
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                compress: true,
            },
            defaultRootObject: 'index.html'
        });

        const oac = new cloudfront.CfnOriginAccessControl(scope, 'WebClientOAC', {
            originAccessControlConfig: {
                name: `${name}OAC`,
                originAccessControlOriginType: 's3',
                signingBehavior: 'always',
                signingProtocol: 'sigv4'
            }
        });

        const allowCloudFrontPrincipalReadOnlyPolicy = new PolicyStatement({
            effect: Effect.ALLOW,
            principals: [new ServicePrincipal('cloudfront.amazonaws.com')],
            actions: ['s3:GetObject'],
            resources: [bucket.arnForObjects("*")],
            conditions: {
                'StringEquals': {
                    'AWS:SourceARN': `arn:aws:cloudfront::${process.env.AWS_ACCOUNT}:distribution/${this.distributionId}`
                }
            }
        });

        bucket.addToResourcePolicy(allowCloudFrontPrincipalReadOnlyPolicy);

        const cfnDistribution = this.node.defaultChild as cloudfront.CfnDistribution;
        
        // We will remove OAI object to use OAC instead since 
        // the CDK does not support option for us to disable the OAI process yet
        cfnDistribution.addPropertyOverride(
            'DistributionConfig.Origins.0.S3OriginConfig.OriginAccessIdentity', '');
        cfnDistribution.addPropertyOverride(
            'DistributionConfig.Origins.0.OriginAccessControlId', oac.getAtt('Id'));
    }
}