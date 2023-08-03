import { Stack, StackProps, RemovalPolicy, CfnOutput} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
// import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { CloudFrontDistribution } from './cloudfront-distribution';

export class WebClientStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const bucket = new s3.Bucket(this, 'Bucket', {
            bucketName: process.env.S3_BUCKET_NAME,
            publicReadAccess: false,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            autoDeleteObjects: true,
            removalPolicy: RemovalPolicy.DESTROY,
        });

        const distribution = new CloudFrontDistribution(this, 'WebClientDistribution', bucket);

        // 👇 create an Output
        new CfnOutput(this, 'bucketName', {
            value: bucket.bucketName,
            description: 'The name of the S3 bucket',
            exportName: 'web-client-bucket-name',
        });

        new CfnOutput(this, 'distributionDomainName', {
            value: distribution.distributionDomainName,
            description: 'The domain name of the CloudFront distribution',
            exportName: 'web-client-distribution-domain-name',
        });
    }
}
